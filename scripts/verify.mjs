import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = 5173;
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9333;
const screenshotsDir = path.join(root, "verification");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      let filePath;
      if (url.pathname === "/" || url.pathname === "/index.html") {
        filePath = path.join(root, "templates", "index.html");
      } else if (url.pathname.startsWith("/static/")) {
        filePath = path.join(root, url.pathname.slice(1));
      } else if (url.pathname === "/api/game-config") {
        const payload = JSON.stringify({ ok: true, version: "0.1.0-basic" });
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(payload);
        return;
      } else {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(root)) {
        throw new Error("Invalid path");
      }

      const data = await fs.readFile(resolved);
      res.writeHead(200, { "content-type": mime[path.extname(resolved)] || "application/octet-stream" });
      res.end(data);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error?.message || error));
    }
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(600) });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Chrome may still be starting.
    }
    await wait(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method) {
        this.events.push(message);
      }
    });
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const stack = details.stackTrace?.callFrames
      ?.map((frame) => `${frame.functionName || "<anonymous>"} (${frame.url || "inline"}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`)
      .join("\n");
    const description = details.exception?.description || details.exception?.value || details.text || "Runtime evaluation failed";
    throw new Error([description, stack].filter(Boolean).join("\n"));
  }
  return result.result?.value;
}

async function screenshot(cdp, name) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const target = path.join(screenshotsDir, name);
  await fs.writeFile(target, Buffer.from(result.data, "base64"));
  return target;
}

async function chooseChallenge(cdp, count) {
  const visible = await evaluate(cdp, "!document.getElementById('challengeScreen').hidden");
  if (!visible) {
    throw new Error("Challenge count screen did not open");
  }
  await evaluate(cdp, `document.querySelector('[data-challenge-count="${count}"]').click()`);
  await wait(200);
  const state = await evaluate(cdp, "window.__examGame.state()");
  if (state.mode !== "combat" || state.challengeCount !== count || state.enemyCount !== count) {
    throw new Error(`Challenge ${count} did not start correctly`);
  }
  return state;
}

async function resolvePendingWeapon(cdp, accept = true) {
  const before = await evaluate(cdp, "window.__examGame.state()");
  if (!before.pendingWeaponChoice) {
    throw new Error("Expected a pending weapon choice");
  }
  const leaveButtonState = await evaluate(cdp, `({
    disabled: document.getElementById('backToMapBtn').disabled,
    text: document.getElementById('backToMapBtn').textContent
  })`);
  if (leaveButtonState.disabled || !leaveButtonState.text.includes("确认离开")) {
    throw new Error(`Confirm-leave button should be available while rewards are pending: ${JSON.stringify(leaveButtonState)}`);
  }
  const method = accept ? "acceptPendingWeaponForVerify" : "skipPendingWeaponForVerify";
  const after = await evaluate(cdp, `window.__examGame.${method}()`);
  if (after.pendingWeaponChoice) {
    throw new Error("Pending weapon choice did not resolve");
  }
  return after;
}

async function confirmPendingRewardSelection(cdp, { weapon = false, buffIndex = null, buffIndexes = null } = {}) {
  const before = await evaluate(cdp, "window.__examGame.state()");
  if (!before.pendingWeaponChoice) {
    throw new Error(`Expected a pending reward selection: ${JSON.stringify(before)}`);
  }
  const expectedBuffIndexes = Array.isArray(buffIndexes)
    ? buffIndexes
    : Number.isInteger(buffIndex)
      ? [buffIndex]
      : [];
  if (weapon) {
    await evaluate(cdp, "document.getElementById('acceptWeaponBtn').click()");
    await wait(40);
  }
  for (const index of expectedBuffIndexes) {
    const buttonId = index === 0 ? "skipWeaponBtn" : "secondBuffRewardBtn";
    await evaluate(cdp, `document.getElementById('${buttonId}').click()`);
    await wait(40);
  }
  const selected = await evaluate(cdp, `({
    ...window.__examGame.state(),
    confirmHidden: document.getElementById('confirmRewardBtn').hidden,
    confirmDisabled: document.getElementById('confirmRewardBtn').disabled,
    weaponSelectedClass: document.getElementById('acceptWeaponBtn').classList.contains('selected'),
    firstBuffSelectedClass: document.getElementById('skipWeaponBtn').classList.contains('selected'),
    secondBuffSelectedClass: document.getElementById('secondBuffRewardBtn').classList.contains('selected')
  })`);
  const actualBuffIndexes = selected.pendingSelectedBuffIndexes || (Number.isInteger(selected.pendingSelectedBuffIndex) ? [selected.pendingSelectedBuffIndex] : []);
  const sameBuffIndexes = JSON.stringify(actualBuffIndexes) === JSON.stringify(expectedBuffIndexes);
  if (
    selected.confirmHidden ||
    selected.confirmDisabled ||
    selected.pendingSelectedWeapon !== weapon ||
    !sameBuffIndexes ||
    selected.weaponSelectedClass !== weapon ||
    selected.firstBuffSelectedClass !== expectedBuffIndexes.includes(0) ||
    selected.secondBuffSelectedClass !== expectedBuffIndexes.includes(1)
  ) {
    throw new Error(`Pending reward selection did not match before confirm: ${JSON.stringify(selected)}`);
  }
  await evaluate(cdp, "document.getElementById('confirmRewardBtn').click()");
  await wait(80);
  const after = await evaluate(cdp, "window.__examGame.state()");
  if (after.pendingWeaponChoice) {
    throw new Error("Pending reward selection did not resolve after confirmation");
  }
  return { before, selected, after };
}

async function chooseSinglePendingBuff(cdp, index) {
  const before = await evaluate(cdp, "window.__examGame.state()");
  if (!before.pendingWeaponChoice || before.pendingBuffIds.length < index + 1) {
    throw new Error(`Expected a pending reward with selectable buffs: ${JSON.stringify(before)}`);
  }
  const buttonId = index === 0 ? "skipWeaponBtn" : "secondBuffRewardBtn";
  const buttonState = await evaluate(cdp, `({
    hidden: document.getElementById('${buttonId}').hidden,
    text: document.getElementById('${buttonId}').textContent
  })`);
  if (buttonState.hidden || !buttonState.text.includes(before.pendingBuffIds[index])) {
    throw new Error(`Single-buff reward button was not visible for index ${index}: ${JSON.stringify({ buttonState, before })}`);
  }
  await evaluate(cdp, `document.getElementById('${buttonId}').click()`);
  await wait(40);
  const selected = await evaluate(cdp, `({
    ...window.__examGame.state(),
    confirmHidden: document.getElementById('confirmRewardBtn').hidden,
    confirmDisabled: document.getElementById('confirmRewardBtn').disabled
  })`);
  const selectedBuffIndexes = selected.pendingSelectedBuffIndexes || (Number.isInteger(selected.pendingSelectedBuffIndex) ? [selected.pendingSelectedBuffIndex] : []);
  if (selected.pendingSelectedWeapon || JSON.stringify(selectedBuffIndexes) !== JSON.stringify([index]) || selected.confirmHidden || selected.confirmDisabled) {
    throw new Error(`Single-buff reward was not selected correctly before confirm: ${JSON.stringify(selected)}`);
  }
  await evaluate(cdp, "document.getElementById('confirmRewardBtn').click()");
  await wait(80);
  const after = await evaluate(cdp, "window.__examGame.state()");
  if (after.pendingWeaponChoice) {
    throw new Error("Pending single-buff reward choice did not resolve after confirmation");
  }
  return { before, after };
}

async function main() {
  await fs.mkdir(screenshotsDir, { recursive: true });

  const server = createServer();
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(`Preview server ready on ${port}`);

  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-sandbox",
    "--disable-gpu-compositing",
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--use-gl=swiftshader",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(root, ".chrome-verify-profile")}`,
    "about:blank",
  ]);
  chrome.on("exit", (code, signal) => {
    if (code !== null || signal !== null) {
      console.log(`Chrome exited: code=${code} signal=${signal}`);
    }
  });
  chrome.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) console.log(`Chrome: ${text.slice(0, 500)}`);
  });

  try {
    console.log("Waiting for Chrome debug endpoint");
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const tabs = await waitForJson(`http://127.0.0.1:${debugPort}/json`);
    const tab = tabs.find((item) => item.type === "page");
    if (!tab?.webSocketDebuggerUrl) {
      throw new Error("No page target available in Chrome");
    }

    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.ready();
    console.log("Connected to Chrome");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    await wait(600);
    await evaluate(cdp, "localStorage.removeItem('examGameLeaderboardV1'); localStorage.removeItem('examGameLeaderboardCombatTimeV1')");

    const title = await evaluate(cdp, "document.title");
    const hasGame = await evaluate(cdp, "Boolean(window.__examGame)");
    const menuHidden = await evaluate(cdp, "document.getElementById('mainMenu').hidden");
    if (title !== "今天你挂科了吗？" || !hasGame || menuHidden) {
      throw new Error("Initial menu did not load correctly");
    }
    const menuShot = await screenshot(cdp, "menu.png");

    const menuWeaponInfoState = await evaluate(cdp, `({
      hasHomepageButton: Boolean(document.getElementById('weaponStatsBtn')),
      helpHidden: document.getElementById('ingameHelpBtn').hidden
    })`);
    if (menuWeaponInfoState.hasHomepageButton || !menuWeaponInfoState.helpHidden) {
      throw new Error(`Weapon info should move from homepage to hidden in-game help button: ${JSON.stringify(menuWeaponInfoState)}`);
    }

    await evaluate(cdp, "document.getElementById('enemyCodexBtn').click()");
    await wait(100);
    const enemyCodexState = await evaluate(cdp, `({
      hidden: document.getElementById('modal').hidden,
      title: document.getElementById('modalTitle').textContent,
      wide: document.getElementById('modalPanel').classList.contains('modal-panel-wide'),
      sections: document.querySelectorAll('.codex-section').length,
      cards: document.querySelectorAll('.codex-card').length,
      body: document.querySelector('.enemy-codex')?.textContent || ''
    })`);
    if (
      enemyCodexState.hidden ||
      enemyCodexState.title !== "名人堂" ||
      !enemyCodexState.wide ||
      enemyCodexState.sections < 2 ||
      enemyCodexState.cards < 14 ||
      !enemyCodexState.body.includes("Boss 投影") ||
      !enemyCodexState.body.includes("高斯核心")
    ) {
      throw new Error(`Enemy codex did not render correctly: ${JSON.stringify(enemyCodexState)}`);
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, "document.getElementById('funFactsBtn').click()");
    await wait(150);
    const funFactsState = await evaluate(cdp, `({
      hidden: document.getElementById('modal').hidden,
      noTitle: document.getElementById('modalPanel').classList.contains('modal-panel-no-title'),
      summary: document.querySelector('.fun-fact-summary')?.textContent || '',
      pageTitle: document.querySelector('.fun-fact-page-head strong')?.textContent || '',
      cards: document.querySelectorAll('.fun-fact-card').length,
      pager: document.querySelector('.fun-facts-pager')?.textContent || '',
      nextCount: document.querySelectorAll('[data-fun-facts-page="1"]').length
    })`);
    if (
      funFactsState.hidden ||
      !funFactsState.noTitle ||
      !funFactsState.summary.includes("探索") ||
      funFactsState.pageTitle !== "探索档案" ||
      funFactsState.cards < 8 ||
      !funFactsState.pager.includes("1 / 4") ||
      funFactsState.nextCount !== 1
    ) {
      throw new Error(`Fun facts first page did not render correctly: ${JSON.stringify(funFactsState)}`);
    }
    await evaluate(cdp, "document.querySelector('[data-fun-facts-page=\"1\"]').click()");
    await wait(100);
    const funFactsPageTwoState = await evaluate(cdp, `({
      pageTitle: document.querySelector('.fun-fact-page-head strong')?.textContent || '',
      body: document.querySelector('.modal-body')?.textContent || '',
      pager: document.querySelector('.fun-facts-pager')?.textContent || ''
    })`);
    if (
      funFactsPageTwoState.pageTitle !== "翻车记录" ||
      !funFactsPageTwoState.body.includes("最危险房间") ||
      !funFactsPageTwoState.body.includes("最容易翻车阶段") ||
      !funFactsPageTwoState.pager.includes("2 / 4")
    ) {
      throw new Error(`Fun facts second page did not render correctly: ${JSON.stringify(funFactsPageTwoState)}`);
    }
    await evaluate(cdp, "document.querySelector('[data-fun-facts-page=\"2\"]').click()");
    await wait(100);
    const funFactsPageThreeState = await evaluate(cdp, `({
      pageTitle: document.querySelector('.fun-fact-page-head strong')?.textContent || '',
      body: document.querySelector('.modal-body')?.textContent || '',
      pager: document.querySelector('.fun-facts-pager')?.textContent || ''
    })`);
    if (
      funFactsPageThreeState.pageTitle !== "战术偏好" ||
      !funFactsPageThreeState.body.includes("终战输出最多武器") ||
      !funFactsPageThreeState.body.includes("裸考勇士比例") ||
      !funFactsPageThreeState.body.includes("最狼狈通关") ||
      !funFactsPageThreeState.body.includes("圣剑信仰指数") ||
      !funFactsPageThreeState.body.includes("火力过剩指数") ||
      !funFactsPageThreeState.pager.includes("3 / 4")
    ) {
      throw new Error(`Fun facts tactic page did not render correctly: ${JSON.stringify(funFactsPageThreeState)}`);
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, "document.getElementById('leaderboardBtn').click()");
    await wait(100);
    const emptyLeaderboardState = await evaluate(cdp, `({
      title: document.getElementById('modalTitle').textContent,
      hidden: document.getElementById('modal').hidden,
      empty: Boolean(document.querySelector('.modal-body .buff-empty'))
    })`);
    if (emptyLeaderboardState.hidden || emptyLeaderboardState.title !== "通关排行榜" || !emptyLeaderboardState.empty) {
      throw new Error("Empty leaderboard modal did not render correctly");
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, "document.getElementById('startBtn').click()");
    await wait(200);
    const versionSelectState = await evaluate(cdp, `({
      mode: window.__examGame.state().mode,
      hidden: document.getElementById('versionSelectScreen').hidden,
      alpha: document.getElementById('versionAlphaBtn')?.textContent || '',
      beta: document.getElementById('versionBetaBtn')?.textContent || ''
    })`);
    if (
      versionSelectState.mode !== "version" ||
      versionSelectState.hidden ||
      !versionSelectState.alpha.includes("α") ||
      !versionSelectState.beta.includes("β")
    ) {
      throw new Error(`Version selection screen did not render after Start: ${JSON.stringify(versionSelectState)}`);
    }
    await evaluate(cdp, "document.getElementById('versionBetaBtn').click()");
    await wait(200);
    const betaMapState = await evaluate(cdp, "window.__examGame.state()");
    if (betaMapState.mode !== "map" || betaMapState.versionChannel !== "beta") {
      throw new Error(`Beta version entry did not start correctly: ${JSON.stringify(betaMapState)}`);
    }
    await evaluate(cdp, "window.__examGame.openChallengeSelect('monster'); window.__examGame.beginMonsterChallenge(3)");
    await wait(100);
    const betaKnowledgeCombatState = await evaluate(cdp, "window.__examGame.state()");
    if (
      betaKnowledgeCombatState.mode !== "combat" ||
      betaKnowledgeCombatState.activeRoomKey !== "monster" ||
      betaKnowledgeCombatState.challengeCount !== 3 ||
      betaKnowledgeCombatState.credits !== 0
    ) {
      throw new Error(`Beta knowledge room did not start correctly before credit award: ${JSON.stringify(betaKnowledgeCombatState)}`);
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(120);
    const betaCreditState = await evaluate(cdp, "window.__examGame.state()");
    if (betaCreditState.credits !== 3 || !betaCreditState.completed.monster || !betaCreditState.pendingWeaponChoice) {
      throw new Error(`Beta knowledge rooms should award one credit per challenged enemy, capped at three: ${JSON.stringify(betaCreditState)}`);
    }
    await evaluate(cdp, "window.__examGame.declinePendingRewardForVerify(); document.getElementById('backToMapBtn').click()");
    await wait(100);
    await evaluate(cdp, "window.__examGame.startRandomRoom('chest')");
    await wait(120);
    const betaRandomPaidState = await evaluate(cdp, "window.__examGame.state()");
    if (betaRandomPaidState.credits !== 1 || !betaRandomPaidState.randomRooms.chest) {
      throw new Error(`Beta right-side random room should cost two credits on first reveal: ${JSON.stringify(betaRandomPaidState)}`);
    }
    await evaluate(cdp, "window.__examGame.startVersion('beta'); window.__examGame.setCreditsForVerify(1); window.__examGame.startRandomRoom('chest')");
    await wait(100);
    const betaRandomBlockedState = await evaluate(cdp, "window.__examGame.state()");
    if (betaRandomBlockedState.credits !== 1 || betaRandomBlockedState.randomRooms.chest || betaRandomBlockedState.mode !== "map") {
      throw new Error(`Beta random room should stay closed when credits are insufficient: ${JSON.stringify(betaRandomBlockedState)}`);
    }
    await evaluate(cdp, "window.__examGame.startVersion('beta'); window.__examGame.setCreditsForVerify(3); window.__examGame.setPlayerHp(40); window.__examGame.startBossRoom()");
    await wait(120);
    const betaShopOpenState = await evaluate(cdp, `({
      ...window.__examGame.state(),
      modalHidden: document.getElementById('modal').hidden,
      modalKind: document.getElementById('modal').dataset.kind,
      title: document.getElementById('modalTitle').textContent,
      shopCards: document.querySelectorAll('.beta-shop-card').length,
      shopBuyButtons: document.querySelectorAll('[data-beta-shop-buy]').length
    })`);
    if (
      betaShopOpenState.mode !== "map" ||
      betaShopOpenState.activeRoom ||
      !betaShopOpenState.betaBossShopEntered ||
      Math.abs(betaShopOpenState.hp - 70) > 0.001 ||
      betaShopOpenState.betaBossShopStock.length !== 4 ||
      betaShopOpenState.betaBossShopRefreshCost !== 1 ||
      betaShopOpenState.modalHidden ||
      betaShopOpenState.modalKind !== "betaShop" ||
      betaShopOpenState.title !== "β 学分商店" ||
      betaShopOpenState.shopCards !== 4 ||
      betaShopOpenState.shopBuyButtons !== 4
    ) {
      throw new Error(`Beta boss entry should open the credit shop after one room-enter heal: ${JSON.stringify(betaShopOpenState)}`);
    }
    const betaShopShot = await screenshot(cdp, "beta-shop.png");
    const betaShopBuyState = await evaluate(cdp, "window.__examGame.buyBetaShopItemForVerify(0)");
    if (
      Math.abs(betaShopBuyState.hp - 40) > 0.001 ||
      !betaShopBuyState.betaBossShopStock[0]?.purchased ||
      betaShopBuyState.betaBossShopStock.slice(1).some((item) => item.purchased)
    ) {
      throw new Error(`Beta shop purchases should cost 30 HP and mark only the bought item: ${JSON.stringify(betaShopBuyState)}`);
    }
    const betaShopRefreshOne = await evaluate(cdp, "window.__examGame.refreshBetaShopForVerify()");
    if (
      betaShopRefreshOne.credits !== 2 ||
      betaShopRefreshOne.betaBossShopRefreshCost !== 2 ||
      betaShopRefreshOne.betaBossShopStock.some((item) => item.purchased)
    ) {
      throw new Error(`First beta shop refresh should cost one credit and reset stock: ${JSON.stringify(betaShopRefreshOne)}`);
    }
    const betaShopRefreshTwo = await evaluate(cdp, "window.__examGame.refreshBetaShopForVerify()");
    if (betaShopRefreshTwo.credits !== 0 || betaShopRefreshTwo.betaBossShopRefreshCost !== 3) {
      throw new Error(`Second beta shop refresh should cost two credits and raise the next price: ${JSON.stringify(betaShopRefreshTwo)}`);
    }
    const betaShopRefreshBlocked = await evaluate(cdp, "window.__examGame.refreshBetaShopForVerify()");
    if (betaShopRefreshBlocked.credits !== 0 || betaShopRefreshBlocked.betaBossShopRefreshCost !== 3 || !betaShopRefreshBlocked.betaBossShopMessage.includes("学分不足")) {
      throw new Error(`Beta shop refresh should be blocked when credits are insufficient: ${JSON.stringify(betaShopRefreshBlocked)}`);
    }
    const betaBossFromShopState = await evaluate(cdp, "window.__examGame.startBossFromShopForVerify()");
    if (
      betaBossFromShopState.mode !== "combat" ||
      betaBossFromShopState.activeRoom !== "boss" ||
      Math.abs(betaBossFromShopState.hp - 40) > 0.001 ||
      !betaBossFromShopState.bossIntroActive
    ) {
      throw new Error(`Starting beta boss from shop should not trigger a second room-enter heal: ${JSON.stringify(betaBossFromShopState)}`);
    }
    await evaluate(cdp, "window.__examGame.openVersionSelect(); document.getElementById('versionAlphaBtn').click()");
    await wait(200);
    const mapState = await evaluate(cdp, "window.__examGame.state()");
    if (mapState.mode !== "map" || mapState.versionChannel !== "alpha") {
      throw new Error(`Expected map mode, got ${mapState.mode}`);
    }
    if (!String(mapState.weapon).includes("圣剑") || mapState.weaponDamage !== 10) {
      throw new Error(`Sword damage should be restored to 10: ${JSON.stringify({ weapon: mapState.weapon, damage: mapState.weaponDamage })}`);
    }
    const hasRoomMap = await evaluate(cdp, "Boolean(document.querySelector('.straight-map'))");
    if (!hasRoomMap) {
      throw new Error("Straight corridor map did not render");
    }
    const mapShot = await screenshot(cdp, "corridor.png");

    const ingameHelpState = await evaluate(cdp, `({
      hidden: document.getElementById('ingameHelpBtn').hidden,
      text: document.getElementById('ingameHelpBtn').textContent
    })`);
    if (ingameHelpState.hidden || ingameHelpState.text.trim() !== "?") {
      throw new Error(`In-game weapon info help button should be visible on the map: ${JSON.stringify(ingameHelpState)}`);
    }
    await evaluate(cdp, "document.getElementById('ingameHelpBtn').click()");
    await wait(150);
    const weaponInfoState = await evaluate(cdp, `({
      title: document.getElementById('modalTitle').textContent,
      pageTitle: document.querySelector('.weapon-info-page-head strong')?.textContent || '',
      rows: document.querySelectorAll('.weapon-table tbody tr').length,
      wide: document.getElementById('modalPanel').classList.contains('modal-panel-wide'),
      pager: document.querySelector('.weapon-info-pager')?.textContent || '',
      nextCount: document.querySelectorAll('[data-weapon-info-page="1"]').length
    })`);
    if (
      weaponInfoState.title !== "武器与增益" ||
      weaponInfoState.pageTitle !== "武器数据" ||
      weaponInfoState.rows < 10 ||
      !weaponInfoState.wide ||
      !weaponInfoState.pager.includes("1 / 2") ||
      weaponInfoState.nextCount !== 1
    ) {
      throw new Error(`Weapon info first page did not render correctly: ${JSON.stringify(weaponInfoState)}`);
    }
    const weaponBalance = await evaluate(cdp, "window.__examGame.weaponBalanceForVerify()");
    const fullWeaponIds = [
      "sword",
      "functionGun",
      "integralSniper",
      "taylorCannon",
      "coordinateBlade",
      "polarShotgun",
      "geometryShield",
      "matrixRpg",
      "luStaff",
      "determinantLaser",
    ];
    const fullBalanceScores = fullWeaponIds.map((id) => weaponBalance[id]?.balanceScore || 0);
    if (Math.max(...fullBalanceScores) > 65 || Math.min(...fullBalanceScores) < 19) {
      throw new Error(`Weapon balance scores drifted too far: ${JSON.stringify(weaponBalance)}`);
    }
    await evaluate(cdp, "document.querySelector('[data-weapon-info-page=\"1\"]').click()");
    await wait(100);
    const weaponBuffPageState = await evaluate(cdp, `({
      pageTitle: document.querySelector('.weapon-info-page-head strong')?.textContent || '',
      buffCards: document.querySelectorAll('.buff-catalog .buff-card').length,
      body: document.querySelector('.modal-body')?.textContent || '',
      pager: document.querySelector('.weapon-info-pager')?.textContent || ''
    })`);
    if (
      weaponBuffPageState.pageTitle !== "增益简介" ||
      weaponBuffPageState.buffCards < 8 ||
      !weaponBuffPageState.body.includes("鸡煲") ||
      !weaponBuffPageState.body.includes("草稿纸") ||
      !weaponBuffPageState.body.includes("换弹时间减少一半") ||
      !weaponBuffPageState.pager.includes("2 / 2")
    ) {
      throw new Error(`Weapon info buff page did not render correctly: ${JSON.stringify(weaponBuffPageState)}`);
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, "window.__examGame.setPlayerHp(40)");
    await evaluate(cdp, "window.__examGame.startBossRoom()");
    await wait(250);
    const directBossSwordState = await evaluate(cdp, "window.__examGame.state()");
    if (
      directBossSwordState.mode !== "combat" ||
      !directBossSwordState.bossDirect ||
      !directBossSwordState.directBossSwordAwakened ||
      directBossSwordState.weaponDamage !== 15 ||
      directBossSwordState.weaponSlashReach !== 42 ||
      directBossSwordState.weaponSlashRadius !== 56 ||
      !String(directBossSwordState.weapon).includes("觉醒")
    ) {
      throw new Error(`Direct boss sword awakening failed: ${JSON.stringify(directBossSwordState)}`);
    }
    if (directBossSwordState.arenaKind !== "boss" || directBossSwordState.arenaAreaScale !== 4 || directBossSwordState.arenaWidth < 1800 || directBossSwordState.arenaHeight < 1000) {
      throw new Error(`Direct boss room should use a 4x large arena: ${JSON.stringify(directBossSwordState)}`);
    }
    if (
      directBossSwordState.bossCoreMaxHp.some((hp) => hp !== 240) ||
      directBossSwordState.bossCoreShield.some((shield) => shield !== 58)
    ) {
      throw new Error(`Direct boss HP/shield should be tuned down to 240/58: ${JSON.stringify(directBossSwordState)}`);
    }
    if (Math.abs(directBossSwordState.hp - 70) > 0.001) {
      throw new Error(`Entering a room should restore 50% of missing HP: ${JSON.stringify({ hp: directBossSwordState.hp })}`);
    }
    await evaluate(cdp, "window.__examGame.resetGame()");
    await wait(200);
    const resetMapState = await evaluate(cdp, "window.__examGame.state()");
    if (resetMapState.mode !== "map" || resetMapState.weaponDamage !== 10 || resetMapState.directBossSwordAwakened || resetMapState.arenaKind !== "normal" || resetMapState.arenaAreaScale !== 1) {
      throw new Error(`Direct boss sword awakening leaked after reset: ${JSON.stringify(resetMapState)}`);
    }

    const cramState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('临时抱佛脚')");
    if (cramState.maxHp !== 125 || cramState.hp !== 125) {
      throw new Error(`Temporary cramming should raise max HP by 25% and fill the bonus HP: ${JSON.stringify(cramState)}`);
    }
    const coffeeState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('熬夜咖啡')");
    if (Math.abs(coffeeState.movementSpeedMultiplier - 1.5) > 0.001) {
      throw new Error("Overnight coffee should raise movement speed by 50%");
    }
    const coffeeStackState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('熬夜咖啡')");
    if (Math.abs(coffeeStackState.movementSpeedMultiplier - 2.25) > 0.001) {
      throw new Error(`Duplicate coffee should stack multiplicatively: ${JSON.stringify(coffeeStackState)}`);
    }
    const beforeFormulaState = await evaluate(cdp, "window.__examGame.state()");
    const formulaState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('公式大全')");
    if (
      Math.abs(formulaState.weaponDamage - beforeFormulaState.weaponDamage) > 0.001 ||
      Math.abs(formulaState.attackCooldownMultiplier - (1 / 1.2)) > 0.001 ||
      formulaState.weaponCooldown >= beforeFormulaState.weaponCooldown
    ) {
      throw new Error(`Formula compendium should increase attack speed by 20% without changing damage: ${JSON.stringify({ beforeFormulaState, formulaState })}`);
    }
    const formulaStackState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('公式大全')");
    if (Math.abs(formulaStackState.attackCooldownMultiplier - (1 / (1.2 ** 2))) > 0.001) {
      throw new Error(`Duplicate formula compendium should stack multiplicatively: ${JSON.stringify(formulaStackState)}`);
    }
    const noteState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('学霸笔记')");
    if (Math.abs(noteState.damageBuffMultiplier - 1.2) > 0.001 || Math.abs(noteState.effectiveWeaponDamage - noteState.weaponDamage * 1.2) > 0.001) {
      throw new Error(`Academic notes should raise outgoing damage by 20%: ${JSON.stringify(noteState)}`);
    }
    const noteStackState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('学霸笔记')");
    if (Math.abs(noteStackState.damageBuffMultiplier - (1.2 ** 2)) > 0.001 || Math.abs(noteStackState.effectiveWeaponDamage - noteStackState.weaponDamage * (1.2 ** 2)) > 0.001) {
      throw new Error(`Duplicate academic notes should stack multiplicatively: ${JSON.stringify(noteStackState)}`);
    }
    await evaluate(cdp, "window.__examGame.grantBuffForVerify('草稿纸'); window.__examGame.grantBuffForVerify('草稿纸'); window.__examGame.addWeaponForVerify('matrixRpg')");
    const draftPaperReload = await evaluate(cdp, "window.__examGame.drainCurrentWeapon()");
    if (
      draftPaperReload.currentWeaponId !== "matrixRpg" ||
      !draftPaperReload.currentWeaponReloading ||
      Math.abs(draftPaperReload.currentWeaponReloadTimer - draftPaperReload.effectiveReloadTime) > 0.001 ||
      Math.abs(draftPaperReload.effectiveReloadTime - 0.6) > 0.001
    ) {
      throw new Error(`Duplicate draft paper should stack reload reduction multiplicatively: ${JSON.stringify(draftPaperReload)}`);
    }
    const chickenPreState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('鸡煲'); window.__examGame.grantBuffForVerify('鸡煲'); window.__examGame.setBattleSecondsForVerify(19)");
    if (chickenPreState.chickenBuffReady || Math.abs(chickenPreState.damageBuffMultiplier - (1.2 ** 2)) > 0.001) {
      throw new Error(`Chicken hotpot should not activate before 20 combat seconds: ${JSON.stringify(chickenPreState)}`);
    }
    const chickenReadyState = await evaluate(cdp, "window.__examGame.setBattleSecondsForVerify(20)");
    if (!chickenReadyState.chickenBuffReady || Math.abs(chickenReadyState.damageBuffMultiplier - ((1.2 ** 2) * (2 ** 2))) > 0.001) {
      throw new Error(`Duplicate chicken hotpot should stack multiplicatively after 20 combat seconds: ${JSON.stringify(chickenReadyState)}`);
    }
    await evaluate(cdp, "window.__examGame.setPlayerHp(100)");
    const mistakeBookState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('错题本'); window.__examGame.grantBuffForVerify('错题本')");
    if (Math.abs(mistakeBookState.incomingDamageMultiplier - (0.75 ** 2)) > 0.001) {
      throw new Error(`Duplicate mistake book should stack incoming damage reduction multiplicatively: ${JSON.stringify(mistakeBookState)}`);
    }
    const mistakeBookDamage = await evaluate(cdp, "window.__examGame.damagePlayerForVerify(40)");
    if (
      Math.abs(mistakeBookDamage.after.hp - (mistakeBookDamage.before.hp - 40 * (0.75 ** 2))) > 0.001 ||
      mistakeBookDamage.after.mistakeBoostTimer <= 0 ||
      Math.abs(mistakeBookDamage.after.damageBuffMultiplier - ((1.2 ** 2) * (2 ** 2) * (1.25 ** 2))) > 0.001
    ) {
      throw new Error(`Duplicate mistake book should reduce damage and stack counterattack boost: ${JSON.stringify(mistakeBookDamage)}`);
    }
    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', shiftKey: true }))");
    await wait(100);
    const developerOpenState = await evaluate(cdp, `({
      ...window.__examGame.state(),
      modalHidden: document.getElementById('modal').hidden,
      modalKind: document.getElementById('modal').dataset.kind,
      title: document.getElementById('modalTitle').textContent,
      weaponControls: document.querySelectorAll('[data-dev-action="weapon-add"]').length,
      buffControls: document.querySelectorAll('[data-dev-action="buff-add"]').length
    })`);
    if (
      !developerOpenState.developerMode ||
      !developerOpenState.developerModeUsed ||
      developerOpenState.modalHidden ||
      developerOpenState.modalKind !== "developer" ||
      developerOpenState.title !== "开发者模式" ||
      developerOpenState.weaponControls < 10 ||
      developerOpenState.buffControls < 8
    ) {
      throw new Error(`Developer mode did not open correctly: ${JSON.stringify(developerOpenState)}`);
    }
    const developerDamage = await evaluate(cdp, "window.__examGame.damagePlayerForVerify(999)");
    if (developerDamage.after.hp !== developerDamage.before.hp || developerDamage.after.blockCharges !== developerDamage.before.blockCharges) {
      throw new Error(`Developer mode should ignore incoming damage without consuming shields: ${JSON.stringify(developerDamage)}`);
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', shiftKey: true }))");
    await wait(100);
    const developerReopenState = await evaluate(cdp, `({
      developerMode: window.__examGame.state().developerMode,
      modalHidden: document.getElementById('modal').hidden,
      modalKind: document.getElementById('modal').dataset.kind,
      title: document.getElementById('modalTitle').textContent
    })`);
    if (
      !developerReopenState.developerMode ||
      developerReopenState.modalHidden ||
      developerReopenState.modalKind !== "developer" ||
      developerReopenState.title !== "开发者模式"
    ) {
      throw new Error(`Pressing Shift+I again should reopen developer panel without disabling developer mode: ${JSON.stringify(developerReopenState)}`);
    }
    await evaluate(cdp, "document.querySelector('[data-dev-action=\"weapon-add\"][data-weapon-id=\"functionGun\"]').click()");
    await wait(50);
    const developerWeaponAdded = await evaluate(cdp, "window.__examGame.state()");
    if (!developerWeaponAdded.weaponIds.includes("functionGun")) {
      throw new Error(`Developer mode failed to add a weapon: ${JSON.stringify(developerWeaponAdded)}`);
    }
    await evaluate(cdp, "document.querySelector('[data-dev-action=\"weapon-remove\"][data-weapon-id=\"functionGun\"]').click()");
    await wait(50);
    const developerWeaponRemoved = await evaluate(cdp, "window.__examGame.state()");
    if (developerWeaponRemoved.weaponIds.includes("functionGun")) {
      throw new Error(`Developer mode failed to remove a weapon: ${JSON.stringify(developerWeaponRemoved)}`);
    }
    const developerBuffCountBefore = await evaluate(cdp, "window.__examGame.state().buffs.length");
    await evaluate(cdp, "document.querySelector('.developer-section:nth-of-type(2) [data-dev-action=\"buff-add\"]').click()");
    await wait(50);
    const developerBuffAdded = await evaluate(cdp, "window.__examGame.state().buffs.length");
    await evaluate(cdp, "document.querySelector('.developer-section:nth-of-type(2) [data-dev-action=\"buff-remove\"]:not(:disabled)').click()");
    await wait(50);
    const developerBuffRemoved = await evaluate(cdp, "window.__examGame.state().buffs.length");
    if (developerBuffAdded !== developerBuffCountBefore + 1 || developerBuffRemoved !== developerBuffCountBefore) {
      throw new Error(`Developer mode failed to add/remove buffs: ${JSON.stringify({ developerBuffCountBefore, developerBuffAdded, developerBuffRemoved })}`);
    }
    const developerCustomUi = await evaluate(cdp, `({
      controls: document.querySelectorAll('[data-custom-enemy-count]').length,
      startButtons: document.querySelectorAll('[data-dev-action="custom-room-start"]').length,
      body: document.querySelector('.developer-custom-room')?.textContent || ''
    })`);
    if (
      developerCustomUi.controls < 9 ||
      developerCustomUi.startButtons !== 1 ||
      !developerCustomUi.body.includes("自定义房间") ||
      !developerCustomUi.body.includes("拉格朗日投影") ||
      !developerCustomUi.body.includes("若尔当投影")
    ) {
      throw new Error(`Developer custom room controls did not render correctly: ${JSON.stringify(developerCustomUi)}`);
    }
    await evaluate(cdp, `(() => {
      const inputs = Array.from(document.querySelectorAll('[data-custom-enemy-count]'));
      inputs.forEach((input) => { input.value = 0; });
      inputs[0].value = 2;
      inputs[1].value = 1;
      document.querySelector('[data-dev-action="custom-room-start"]').click();
    })()`);
    await wait(120);
    const developerCustomRoomState = await evaluate(cdp, "window.__examGame.state()");
    if (
      developerCustomRoomState.mode !== "combat" ||
      developerCustomRoomState.activeRoom !== "monster" ||
      developerCustomRoomState.activeRoomKey !== "__developerCustom" ||
      developerCustomRoomState.enemyCount !== 3 ||
      !developerCustomRoomState.developerMode ||
      !developerCustomRoomState.developerModeUsed
    ) {
      throw new Error(`Developer custom room did not start with selected enemies: ${JSON.stringify(developerCustomRoomState)}`);
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(120);
    const developerCustomClearState = await evaluate(cdp, `({
      ...window.__examGame.state(),
      clearTitle: document.getElementById('clearTitle').textContent,
      clearText: document.getElementById('clearText').textContent
    })`);
    if (
      developerCustomClearState.mode !== "clear" ||
      developerCustomClearState.pendingWeaponChoice ||
      developerCustomClearState.clearTitle !== "自定义房间测试完成" ||
      !developerCustomClearState.clearText.includes("不会记录排行榜")
    ) {
      throw new Error(`Developer custom room should end without normal rewards: ${JSON.stringify(developerCustomClearState)}`);
    }
    await evaluate(cdp, "window.__examGame.resetGame()");
    await wait(100);

    const scoreBalance = await evaluate(cdp, `(() => {
      const allRooms = ['monster', 'chest', 'geometry', 'linear', 'randomB', 'randomC'];
      return {
        directSword: window.__examGame.scoreForVerify({
          seconds: 180,
          hp: 100,
          maxHp: 100,
          kills: 0,
          weaponsFound: 1,
          completedKeys: [],
          usedNonSwordWeapon: false
        }),
        fastFullPrep: window.__examGame.scoreForVerify({
          seconds: 260,
          hp: 100,
          maxHp: 100,
          kills: 18,
          weaponsFound: 6,
          completedKeys: allRooms,
          randomRoomTypes: { chest: 'chest', randomB: 'monster', randomC: 'chest' },
          usedNonSwordWeapon: true
        }),
        slowFullPrep: window.__examGame.scoreForVerify({
          seconds: 520,
          hp: 100,
          maxHp: 100,
          kills: 18,
          weaponsFound: 6,
          completedKeys: allRooms,
          randomRoomTypes: { chest: 'chest', randomB: 'monster', randomC: 'chest' },
          usedNonSwordWeapon: true
        }),
        treasurePrep: window.__examGame.scoreForVerify({
          seconds: 150,
          hp: 100,
          maxHp: 100,
          kills: 0,
          weaponsFound: 4,
          completedKeys: ['chest', 'randomB', 'randomC'],
          randomRoomTypes: { chest: 'chest', randomB: 'chest', randomC: 'chest' },
          usedNonSwordWeapon: true
        }),
        sprint28: window.__examGame.scoreForVerify({
          seconds: 28,
          hp: 100,
          maxHp: 100,
          kills: 0,
          weaponsFound: 1,
          completedKeys: [],
          usedNonSwordWeapon: true
        }),
        sprint29: window.__examGame.scoreForVerify({
          seconds: 29,
          hp: 100,
          maxHp: 100,
          kills: 0,
          weaponsFound: 1,
          completedKeys: [],
          usedNonSwordWeapon: true
        }),
        sprint30: window.__examGame.scoreForVerify({
          seconds: 30,
          hp: 100,
          maxHp: 100,
          kills: 0,
          weaponsFound: 1,
          completedKeys: [],
          usedNonSwordWeapon: true
        })
      };
    })()`);
    if (scoreBalance.directSword.swordBonus < 900 || !scoreBalance.directSword.swordOnly) {
      throw new Error(`Sword-only scoring bonus is too low: ${JSON.stringify(scoreBalance.directSword)}`);
    }
    if (scoreBalance.directSword.score <= scoreBalance.slowFullPrep.score) {
      throw new Error(`Sword-only clear should outrank an overly slow full-prep clear: ${JSON.stringify(scoreBalance)}`);
    }
    if (scoreBalance.fastFullPrep.score <= scoreBalance.slowFullPrep.score || scoreBalance.slowFullPrep.overtimePenalty <= 0) {
      throw new Error(`Time pressure is not strong enough in the scoring model: ${JSON.stringify(scoreBalance)}`);
    }
    if (scoreBalance.treasurePrep.score >= scoreBalance.fastFullPrep.score || scoreBalance.treasurePrep.roomScore >= scoreBalance.fastFullPrep.roomScore) {
      throw new Error(`Treasure rooms should not outscore combat prep after combat-only timing: ${JSON.stringify(scoreBalance)}`);
    }
    const sprintGain28 = scoreBalance.sprint28.speedScore - scoreBalance.sprint29.speedScore;
    const sprintGain29 = scoreBalance.sprint29.speedScore - scoreBalance.sprint30.speedScore;
    if (sprintGain28 <= sprintGain29 || sprintGain29 <= 0) {
      throw new Error(`Early sprint scoring should reward 28s->29s more than 29s->30s: ${JSON.stringify({ sprintGain28, sprintGain29, scoreBalance })}`);
    }

    await evaluate(cdp, "window.__examGame.showSwordEndingForVerify({ seconds: 72, completedKeys: [], kills: 0, hp: 100 })");
    await wait(100);
    const swordEndingState = await evaluate(cdp, `({
      mode: window.__examGame.state().mode,
      hasSwordClass: document.getElementById('resultScreen').classList.contains('sword-ending'),
      statsClass: document.getElementById('resultStats').className,
      eyebrow: document.getElementById('resultEyebrow').textContent,
      eyebrowFontSize: parseFloat(getComputedStyle(document.getElementById('resultEyebrow')).fontSize),
      titleHidden: document.getElementById('resultTitle').hidden,
      body: document.getElementById('resultStats').textContent
    })`);
    if (
      swordEndingState.mode !== "result" ||
      !swordEndingState.hasSwordClass ||
      !swordEndingState.statsClass.includes("sword-result-wrap") ||
      !swordEndingState.eyebrow.includes("圣剑") ||
      swordEndingState.eyebrowFontSize < 30 ||
      !swordEndingState.titleHidden ||
      !swordEndingState.body.includes("圣剑榜资格确认")
    ) {
      throw new Error(`Sword-only ending did not render correctly: ${JSON.stringify(swordEndingState)}`);
    }
    await evaluate(cdp, "window.__examGame.resetGame(); window.__examGame.addWeaponForVerify('functionGun'); window.__examGame.finishGameForVerify(true, { saveLeaderboard: false })");
    await wait(100);
    const ordinaryEndingState = await evaluate(cdp, `({
      hasSwordClass: document.getElementById('resultScreen').classList.contains('sword-ending'),
      statsClass: document.getElementById('resultStats').className,
      titleHidden: document.getElementById('resultTitle').hidden,
      body: document.getElementById('resultStats').textContent
    })`);
    if (ordinaryEndingState.hasSwordClass || ordinaryEndingState.statsClass.includes("sword-result-wrap") || ordinaryEndingState.titleHidden || ordinaryEndingState.body.includes("圣剑榜资格确认")) {
      throw new Error(`Ordinary ending should not use sword-only presentation: ${JSON.stringify(ordinaryEndingState)}`);
    }
    await evaluate(cdp, "window.__examGame.resetGame()");
    await wait(100);

    const initialDropModel = await evaluate(cdp, "window.__examGame.dropModelForVerify()");
    if (
      initialDropModel.chestCandidates.length !== 9 ||
      initialDropModel.chestUnownedCandidates.length !== 9 ||
      initialDropModel.chestCandidates.some((id) => id.startsWith("weak"))
    ) {
      throw new Error(`Chest weapon pool should expose only normal weapon families initially: ${JSON.stringify(initialDropModel)}`);
    }
    if (initialDropModel.chestBuffCandidates.length < 7) {
      throw new Error(`Chest buff pool is incomplete: ${JSON.stringify(initialDropModel)}`);
    }
    if (
      JSON.stringify(initialDropModel.randomRewardFamilies.sort()) !== JSON.stringify(["functionGun", "matrixRpg", "polarShotgun"].sort()) ||
      initialDropModel.randomFamilyEntryCounts.functionGun !== 1 ||
      initialDropModel.randomFamilyEntryCounts.polarShotgun !== 1 ||
      initialDropModel.randomFamilyEntryCounts.matrixRpg !== 1
    ) {
      throw new Error(`Random monster rooms should mirror the three knowledge classrooms: ${JSON.stringify(initialDropModel)}`);
    }
    if (
      Math.abs(initialDropModel.randomRoomChances.monster - 1 / 3) > 0.001 ||
      Math.abs(initialDropModel.randomRoomChances.chest - 2 / 3) > 0.001
    ) {
      throw new Error(`Random room probabilities should be monster 1/3 and chest 2/3: ${JSON.stringify(initialDropModel.randomRoomChances)}`);
    }

    await evaluate(cdp, "window.__examGame.openChestRoom('__verifySkipChest')");
    await wait(200);
    const skipChestPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (
      !skipChestPromptState.completed.__verifySkipChest ||
      !skipChestPromptState.pendingWeaponChoice ||
      !skipChestPromptState.pendingWeaponId ||
      !skipChestPromptState.pendingAltBuff ||
      skipChestPromptState.pendingAllowWeaponBuff ||
      skipChestPromptState.weapons.length !== 1 ||
      !skipChestPromptState.swordOnlyRun
    ) {
      throw new Error("Chest did not offer a weapon/buff choice correctly");
    }
    const skipChestState = await resolvePendingWeapon(cdp, false);
    if (skipChestState.weapons.length !== 1 || !skipChestState.swordOnlyRun || skipChestState.buffs.length <= skipChestPromptState.buffs.length || skipChestState.recentRewardFamilies.length) {
      throw new Error("Choosing the chest buff added a weapon, lost sword-only eligibility, or remembered a weapon family");
    }

    await evaluate(cdp, "window.__examGame.openChestRoom('__verifyDeclineChest')");
    await wait(200);
    const declineChestPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!declineChestPromptState.pendingWeaponChoice || !declineChestPromptState.pendingWeaponId || !declineChestPromptState.pendingBuffIds.length || declineChestPromptState.pendingAllowWeaponBuff) {
      throw new Error("Chest did not expose weapon, buff, and decline reward options");
    }
    const declineChestState = await evaluate(cdp, "window.__examGame.declinePendingRewardForVerify()");
    if (
      declineChestState.pendingWeaponChoice ||
      declineChestState.weapons.length !== declineChestPromptState.weapons.length ||
      declineChestState.buffs.length !== declineChestPromptState.buffs.length ||
      declineChestState.recentRewardFamilies.length !== declineChestPromptState.recentRewardFamilies.length ||
      !declineChestState.swordOnlyRun
    ) {
      throw new Error("Declining the chest reward should leave weapons, buffs, reward memory, and sword-only eligibility unchanged");
    }

    await evaluate(cdp, "window.__examGame.openChestRoom('__verifyChest')");
    await wait(200);
    const chestPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!chestPromptState.completed.__verifyChest || !chestPromptState.pendingWeaponChoice || !chestPromptState.pendingAltBuff || chestPromptState.pendingAllowWeaponBuff || chestPromptState.weapons.length !== 1 || !chestPromptState.swordOnlyRun) {
      throw new Error("Debug chest reward choice did not open correctly");
    }
    const chestRewardId = chestPromptState.pendingWeaponId;
    if (chestRewardId.startsWith("weak")) {
      throw new Error(`Chest should not offer weakened weapons anymore: ${chestRewardId}`);
    }
    const chestState = await resolvePendingWeapon(cdp, true);
    if (!chestState.weaponIds.includes(chestRewardId) || chestState.weapons.length < 2 || chestState.swordOnlyRun) {
      throw new Error("Accepted chest weapon did not join the backpack or clear sword-only eligibility");
    }
    const acceptedDropModel = await evaluate(cdp, "window.__examGame.dropModelForVerify()");
    if (acceptedDropModel.chestUnownedCandidates.includes(chestRewardId) || !acceptedDropModel.recentRewardFamilies.length) {
      throw new Error(`Accepted chest family was not removed from the unowned pool or reward memory: ${JSON.stringify(acceptedDropModel)}`);
    }

    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }))");
    await wait(100);
    const swordState = await evaluate(cdp, "window.__examGame.state()");
    if (swordState.currentWeaponId !== "sword") {
      throw new Error("Digit1 did not switch to sword");
    }

    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }))");
    await wait(100);
    const secondWeaponState = await evaluate(cdp, "window.__examGame.state()");
    if (secondWeaponState.currentWeaponId !== chestRewardId || secondWeaponState.currentWeaponId === "sword") {
      throw new Error(`Digit2 did not switch to the accepted chest weapon: ${JSON.stringify(secondWeaponState)}`);
    }

    const ammoWeaponState = await evaluate(cdp, "window.__examGame.addWeaponForVerify('functionGun')");
    if (ammoWeaponState.currentWeaponId !== "functionGun" || !ammoWeaponState.weaponIds.includes("functionGun")) {
      throw new Error(`Debug ammo weapon was not equipped: ${JSON.stringify(ammoWeaponState)}`);
    }

    await evaluate(cdp, "window.__examGame.drainCurrentWeapon()");
    await wait(100);
    const reloadState = await evaluate(cdp, "window.__examGame.state()");
    if (!reloadState.currentWeaponReloading || reloadState.currentWeaponAmmo !== 0) {
      throw new Error(`Empty weapon did not enter reload state: ${JSON.stringify(reloadState)}`);
    }

    const cycleBaseState = await evaluate(cdp, "window.__examGame.state()");
    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))");
    await wait(100);
    const cycledState = await evaluate(cdp, "window.__examGame.state()");
    const expectedCycleId = cycleBaseState.weaponIds[(cycleBaseState.weaponIndex + 1) % cycleBaseState.weaponIds.length];
    if (cycledState.currentWeaponId !== expectedCycleId) {
      throw new Error(`Q did not cycle weapons: ${JSON.stringify({ cycleBaseState, cycledState })}`);
    }

    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))");
    await wait(100);
    const cycledBackState = await evaluate(cdp, "window.__examGame.state()");
    const expectedSecondCycleId = cycleBaseState.weaponIds[(cycleBaseState.weaponIndex + 2) % cycleBaseState.weaponIds.length];
    if (cycledBackState.currentWeaponId !== expectedSecondCycleId) {
      throw new Error(`Q did not continue cycling weapons: ${JSON.stringify({ cycleBaseState, cycledBackState })}`);
    }

    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

    await evaluate(cdp, "document.getElementById('monsterRoomBtn').click()");
    await wait(100);
    const noClickEntryState = await evaluate(cdp, "window.__examGame.state()");
    if (noClickEntryState.mode !== "map") {
      throw new Error("Room click should not enter classrooms; E-key entry is required");
    }

    await evaluate(cdp, "window.__examGame.startMonsterRoom('monster')");
    await wait(200);
    const calculusEntryState = await evaluate(cdp, "window.__examGame.state()");
    if (calculusEntryState.mode !== "challenge" || !calculusEntryState.pendingChallenge) {
      throw new Error("Calculus room did not open challenge selection");
    }
    const calculusFightState = await chooseChallenge(cdp, 2);
    if (calculusFightState.activeRoomKey !== "monster") {
      throw new Error("Calculus challenge did not start correctly");
    }
    if (calculusFightState.enemyMechanics.some((enemy) => enemy.kind !== "calculus")) {
      throw new Error(`Calculus room should only spawn calculus enemies: ${JSON.stringify(calculusFightState.enemyMechanics)}`);
    }
    const calculusEnemyNames = calculusFightState.enemyMechanics.map((enemy) => enemy.name);
    if (new Set(calculusEnemyNames).size !== calculusEnemyNames.length) {
      throw new Error(`Calculus room should not duplicate enemy names: ${JSON.stringify(calculusFightState.enemyMechanics)}`);
    }
    const lagrangeParent = calculusFightState.enemyMechanics.find((enemy) => enemy.mechanics.includes("splitOnDeath"));
    if (!lagrangeParent) {
      throw new Error(`Calculus room should include a Lagrange split enemy: ${JSON.stringify(calculusFightState.enemyMechanics)}`);
    }
    const lagrangeSplitPreview = await evaluate(cdp, "window.__examGame.previewSplitEnemyForVerify(0)");
    const expectedLagrangeChildFireEvery = Number(lagrangeParent.fireEvery.toFixed(3));
    const expectedLagrangeChildHp = Math.max(18, Math.round(lagrangeParent.maxHp * 0.4));
    if (
      !lagrangeSplitPreview.didSplit ||
      lagrangeSplitPreview.children.length !== 2 ||
      lagrangeSplitPreview.children.some((child) =>
        !child.splitChild ||
        !child.randomDrift ||
        child.mechanics.includes("splitOnDeath") ||
        Math.abs(child.fireEvery - expectedLagrangeChildFireEvery) > 0.01 ||
        child.maxHp !== expectedLagrangeChildHp ||
        child.driftIntervalMultiplier !== 0.78 ||
        child.dashIntervalMultiplier !== 1
      )
    ) {
      throw new Error(`Lagrange split children should have 2/5 HP, two fast shots, and random movement: ${JSON.stringify({ lagrangeParent, lagrangeSplitPreview })}`);
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const calculusPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!calculusPromptState.completed.monster || !calculusPromptState.pendingWeaponChoice || !calculusPromptState.pendingAllowWeaponBuff) {
      throw new Error("Calculus room did not complete correctly");
    }
    const calculusClearState = await resolvePendingWeapon(cdp, true);
    if (calculusClearState.challengeCount !== 2 || calculusClearState.defeatedInRoom !== 2 || calculusClearState.weaponLevel < 2) {
      throw new Error("Duplicate weapon reward did not strengthen the existing weapon");
    }
    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

    const geometryBeforeState = await evaluate(cdp, "window.__examGame.state()");
    await evaluate(cdp, "window.__examGame.startMonsterRoom('geometry')");
    await wait(200);
    const geometryEntryState = await evaluate(cdp, "window.__examGame.state()");
    if (geometryEntryState.mode !== "challenge" || !geometryEntryState.pendingChallenge) {
      throw new Error("Geometry room did not open challenge selection");
    }
    const geometryFightState = await chooseChallenge(cdp, 3);
    if (geometryFightState.activeRoomKey !== "geometry") {
      throw new Error("Geometry challenge did not start correctly");
    }
    if (geometryFightState.enemyMechanics.some((enemy) => enemy.kind !== "geometry")) {
      throw new Error(`Geometry room should only spawn geometry enemies: ${JSON.stringify(geometryFightState.enemyMechanics)}`);
    }
    const geometryEnemyNames = geometryFightState.enemyMechanics.map((enemy) => enemy.name);
    if (new Set(geometryEnemyNames).size !== geometryEnemyNames.length) {
      throw new Error(`Geometry room should not duplicate enemy names: ${JSON.stringify(geometryFightState.enemyMechanics)}`);
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const geometryPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!geometryPromptState.completed.geometry || !geometryPromptState.pendingWeaponChoice || !geometryPromptState.pendingAllowWeaponBuff) {
      throw new Error("Geometry room did not complete correctly");
    }
    const geometryRewardText = await evaluate(cdp, "document.getElementById('clearText').textContent");
    if (!geometryRewardText.includes("增益A") || !geometryRewardText.includes("增益B") || geometryRewardText.includes("一个增益")) {
      throw new Error(`Three-person reward text should describe both buff choices: ${geometryRewardText}`);
    }
    const geometrySelection = await confirmPendingRewardSelection(cdp, { weapon: true, buffIndexes: [0, 1] });
    const geometryClearState = geometrySelection.after;
    if (
      geometryClearState.challengeCount !== 3 ||
      geometryClearState.defeatedInRoom !== 3 ||
      geometryClearState.buffs.length !== geometrySelection.before.buffs.length + 2 ||
      !geometryClearState.buffs.includes(geometrySelection.before.pendingBuffIds[0]) ||
      !geometryClearState.buffs.includes(geometrySelection.before.pendingBuffIds[1])
    ) {
      throw new Error("Three-person challenge did not grant the selected weapon plus both selected buffs");
    }
    const hadGeometryWeapon = geometryBeforeState.weaponIds.includes("polarShotgun");
    const expectedGeometryWeaponCount = geometryBeforeState.weapons.length + (hadGeometryWeapon ? 0 : 1);
    const expectedGeometryWeaponLevel = hadGeometryWeapon ? 2 : 1;
    if (
      geometryClearState.currentWeaponId !== "polarShotgun" ||
      geometryClearState.weapons.length !== expectedGeometryWeaponCount ||
      geometryClearState.weaponLevel !== expectedGeometryWeaponLevel
    ) {
      throw new Error(`Three-person challenge should grant one normal weapon or one duplicate upgrade: ${JSON.stringify({ geometryBeforeState, geometryClearState })}`);
    }
    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

    await evaluate(cdp, "window.__examGame.startMonsterRoom('linear')");
    await wait(200);
    const linearEntryState = await evaluate(cdp, "window.__examGame.state()");
    if (linearEntryState.mode !== "challenge" || !linearEntryState.pendingChallenge) {
      throw new Error("Linear room did not open challenge selection");
    }
    const linearFightState = await chooseChallenge(cdp, 3);
    if (linearFightState.activeRoomKey !== "linear") {
      throw new Error("Linear challenge did not start correctly");
    }
    if (linearFightState.enemyMechanics.some((enemy) => enemy.kind !== "linear")) {
      throw new Error(`Linear room should only spawn linear enemies: ${JSON.stringify(linearFightState.enemyMechanics)}`);
    }
    const linearEnemyNames = linearFightState.enemyMechanics.map((enemy) => enemy.name);
    if (new Set(linearEnemyNames).size !== linearEnemyNames.length) {
      throw new Error(`Linear room should not duplicate enemy names: ${JSON.stringify(linearFightState.enemyMechanics)}`);
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const linearPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!linearPromptState.completed.linear || !linearPromptState.pendingWeaponChoice || !linearPromptState.pendingAllowWeaponBuff || linearPromptState.pendingBuffIds.length !== 2) {
      throw new Error("Linear room did not complete correctly");
    }
    const singleBuffChoice = await chooseSinglePendingBuff(cdp, 1);
    if (
      singleBuffChoice.after.weapons.length !== singleBuffChoice.before.weapons.length ||
      singleBuffChoice.after.buffs.length !== singleBuffChoice.before.buffs.length + 1 ||
      !singleBuffChoice.after.buffs.includes(singleBuffChoice.before.pendingBuffIds[1])
    ) {
      throw new Error(`Choosing one of two buffs should grant exactly that buff and no weapon: ${JSON.stringify(singleBuffChoice)}`);
    }
    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

    for (const [roomKey, completedKey] of [['chest', 'chest'], ['randomB', 'randomB'], ['randomC', 'randomC']]) {
      await evaluate(cdp, `window.__examGame.startRandomRoom('${roomKey}')`);
      await wait(200);
      let randomState = await evaluate(cdp, "window.__examGame.state()");
      if (randomState.mode === "challenge") {
        randomState = await chooseChallenge(cdp, 1);
      }
      if (randomState.mode === "combat") {
        await evaluate(cdp, "window.__examGame.completeActiveRoom()");
        await wait(150);
        randomState = await evaluate(cdp, "window.__examGame.state()");
      }
      if (randomState.pendingWeaponChoice) {
        randomState = await resolvePendingWeapon(cdp, true);
      }
      if (!randomState.completed[completedKey]) {
        throw new Error(`${completedKey} did not complete correctly`);
      }
      await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
      await wait(100);
    }

    await evaluate(cdp, "window.__examGame.startBossRoom()");
    await wait(1150);
    const bossIntroState = await evaluate(cdp, "window.__examGame.state()");
    if (!bossIntroState.bossIntroActive || bossIntroState.bossIntroElapsed < 1) {
      const introErrors = cdp.events
        .filter((event) => event.method === "Runtime.exceptionThrown")
        .map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.exceptionDetails?.text || "Runtime exception");
      throw new Error(`Boss intro title phase did not start correctly: ${JSON.stringify(bossIntroState)} Errors=${introErrors.join(" | ")}`);
    }
    const bossIntroShot = await screenshot(cdp, "boss-intro.png");
    await wait(11200);
    const bossState = await evaluate(cdp, "window.__examGame.state()");
    if (bossState.mode !== "combat" || bossState.activeRoom !== "boss") {
      throw new Error("Boss room did not start correctly");
    }
    if (bossState.arenaKind !== "boss" || bossState.arenaAreaScale !== 4 || bossState.cameraX <= 0 || bossState.cameraY <= 0) {
      throw new Error(`Boss room should use a 4x arena with player-follow camera: ${JSON.stringify(bossState)}`);
    }
    if (
      bossState.bossCoreMaxHp.some((hp) => hp !== 240) ||
      bossState.bossCoreShield.some((shield) => shield < 48 || shield % 48 !== 0)
    ) {
      throw new Error(`Boss HP/shield should use 240 HP and 48-point shield layers: ${JSON.stringify(bossState)}`);
    }
    const swordBossMultipliers = await evaluate(cdp, `Object.fromEntries(
      ['cauchy', 'descartes', 'gauss'].map((id) => [id, window.__examGame.bossKindMultiplierForVerify('sword', id)])
    )`);
    if (Object.values(swordBossMultipliers).some((value) => value !== 1.25)) {
      throw new Error(`Sword should have advantage against every boss core: ${JSON.stringify(swordBossMultipliers)}`);
    }
    const combatCanvasRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('gameCanvas').getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left)
      };
    })()`);
    if (combatCanvasRect.width < 1270 || combatCanvasRect.height < 710 || combatCanvasRect.top > 2 || combatCanvasRect.left > 2) {
      throw new Error(`Combat canvas was not maximized: ${JSON.stringify(combatCanvasRect)}`);
    }
    if (bossState.bossMoveT <= 0 || Math.abs(bossState.bossMoveOffset) < 4) {
      throw new Error("Boss triangular movement did not start");
    }
    if (bossState.bossDomainCycleSeconds !== 20) {
      throw new Error(`Boss domain cycle should be 20 seconds: ${JSON.stringify(bossState)}`);
    }
    if (!["cauchy", "descartes", "gauss"].includes(bossState.bossDomainCoreId)) {
      throw new Error(`Initial boss domain should be chosen from one of the three cores: ${JSON.stringify(bossState)}`);
    }
    if (bossState.bossTopCoreId !== bossState.bossDomainCoreId) {
      throw new Error(`Initial random domain core should be placed at the top: ${JSON.stringify(bossState)}`);
    }
    if (bossState.bossRotationSteps !== 0 || bossState.bossRotateTimer > 20 || bossState.bossRotateTimer < 12) {
      throw new Error(`Boss should not rotate before the 20 second domain cycle: ${JSON.stringify(bossState)}`);
    }
    if (bossState.bossActiveCoreCount !== 2 || !bossState.bossInvulnerableCoreIds.includes(bossState.bossDomainCoreId)) {
      throw new Error(`Only the non-domain cores should attack while the domain core is HP-invulnerable: ${JSON.stringify(bossState)}`);
    }
    if (bossState.obstacleRects.length < 7 || !bossState.obstacleRects.some((rect) => rect.shape !== "rect")) {
      throw new Error(`Boss room should start with seven thin random wall obstacles: ${JSON.stringify(bossState.obstacleRects)}`);
    }
    if (bossState.obstacleRects.some((rect) => rect.thickness > 12)) {
      throw new Error(`Boss domain obstacles should stay thin: ${JSON.stringify(bossState.obstacleRects)}`);
    }
    for (const attackType of ["cauchySquares", "descartesCross", "gaussZones"]) {
      if (!bossState.bossAttackTypes.includes(attackType)) {
        throw new Error(`Boss attack type ${attackType} was not configured`);
      }
    }
    await evaluate(cdp, "window.__examGame.setDeveloperModeForVerify(true)");

    await evaluate(cdp, "window.__examGame.forceBossMechanic('cauchy')");
    await wait(150);
    const cauchyState = await evaluate(cdp, "window.__examGame.state()");
    if (cauchyState.bossDomainCoreId !== "cauchy" || cauchyState.bossCauchyCoreWallCount !== 3 || cauchyState.bossCauchyCandidateCount < 5) {
      throw new Error(`Cauchy domain should have five normal walls and three highlighted core walls: ${JSON.stringify(cauchyState)}`);
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('cauchyHighlight')");
    await wait(80);
    const cauchyHighlightState = await evaluate(cdp, "window.__examGame.state()");
    if (cauchyHighlightState.bossCauchyDomainWallCount < cauchyState.bossCauchyDomainWallCount + 1) {
      throw new Error(`Cauchy domain should periodically highlight one of the five normal walls: ${JSON.stringify(cauchyHighlightState)}`);
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('cauchyAttack')");
    await wait(80);
    const cauchyAttackState = await evaluate(cdp, "window.__examGame.state()");
    if (cauchyAttackState.bossCauchyBombCount < 1) {
      throw new Error(`Cauchy attack should create visible bomb ranges: ${JSON.stringify(cauchyAttackState)}`);
    }

    await evaluate(cdp, "window.__examGame.forceBossMechanic('gauss')");
    const gaussDomainState = await evaluate(cdp, "window.__examGame.state()");
    if (
      gaussDomainState.bossDomainCoreId !== "gauss" ||
      gaussDomainState.bossGaussBoostedCoreIds.length !== 2 ||
      gaussDomainState.bossGaussZoneBonus !== 0 ||
      gaussDomainState.bossGaussNextZoneCount !== 3 ||
      gaussDomainState.bossInvisibleCoreIds.length !== 3
    ) {
      throw new Error(`Gauss domain should shield and damage-boost the other two cores and reset zone count: ${JSON.stringify(gaussDomainState)}`);
    }
    if (
      gaussDomainState.bossGaussZoneBaseCount !== 4 ||
      gaussDomainState.bossGaussZoneMaxCount !== 7 ||
      gaussDomainState.bossGaussZoneDebuffDuration !== 5 ||
      gaussDomainState.bossCauchyExplosionBulletCount !== 10
    ) {
      throw new Error(`Boss document constants should match the latest design: ${JSON.stringify(gaussDomainState)}`);
    }
    const gaussRevealHit = await evaluate(cdp, "window.__examGame.damageBossCoreForVerify('gauss', 10, 'sword').state");
    if (
      !gaussRevealHit.bossRevealedCoreIds.includes("gauss") ||
      gaussRevealHit.bossInvisibleCoreIds.includes("gauss") ||
      gaussRevealHit.bossCoreRevealTimers[2] <= 1.8
    ) {
      throw new Error(`Hitting an invisible boss core should reveal it for two seconds: ${JSON.stringify(gaussRevealHit)}`);
    }
    await wait(2200);
    const gaussRehiddenState = await evaluate(cdp, "window.__examGame.state()");
    if (
      gaussRehiddenState.bossRevealedCoreIds.includes("gauss") ||
      !gaussRehiddenState.bossInvisibleCoreIds.includes("gauss")
    ) {
      throw new Error(`Revealed boss core should return to invisibility after two seconds: ${JSON.stringify(gaussRehiddenState)}`);
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('gauss')");
    await wait(80);
    await evaluate(cdp, "window.__examGame.forceBossMechanic('gaussZones')");
    await wait(400);
    const gaussAttackState = await evaluate(cdp, "window.__examGame.state()");
    if (!gaussAttackState.bossShotPatternCounts.curve || gaussAttackState.bossGaussZoneCount !== 3) {
      throw new Error(`Gauss random-point curve zones should start from three zones: ${JSON.stringify(gaussAttackState)}`);
    }

    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(120, 120)");
    await wait(80);
    await evaluate(cdp, "window.__examGame.forceBossMechanic('descartes')");
    await wait(100);
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(1780, 120)");
    await wait(250);
    const descartesDomainState = await evaluate(cdp, "window.__examGame.state()");
    if (
      descartesDomainState.bossDomainCoreId !== "descartes" ||
      descartesDomainState.bossDescartesQuadrant !== "q2" ||
      descartesDomainState.bossDescartesQuadrantChanges !== 1 ||
      descartesDomainState.bossDescartesQuadrantProjectionCount !== 1 ||
      descartesDomainState.bossProjectionCount !== 1
    ) {
      throw new Error(`Descartes domain should track quadrant changes and summon one projection in the old quadrant: ${JSON.stringify(descartesDomainState)}`);
    }
    if (descartesDomainState.enemyMechanics.filter((enemy) => enemy.pattern === "projection").some((enemy) => enemy.hp !== 20)) {
      throw new Error(`Boss projections should spawn with 20 HP: ${JSON.stringify(descartesDomainState.enemyMechanics)}`);
    }
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(120, 940)");
    await wait(180);
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(1780, 940)");
    await wait(180);
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(120, 120)");
    await wait(180);
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(1780, 120)");
    await wait(180);
    const descartesMultiSwitchState = await evaluate(cdp, "window.__examGame.state()");
    if (descartesMultiSwitchState.bossDescartesQuadrantProjectionCount !== 4 || descartesMultiSwitchState.bossProjectionCount !== 4) {
      throw new Error(`Descartes quadrant switches should summon one projection each, capped at four: ${JSON.stringify(descartesMultiSwitchState)}`);
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('cauchy')");
    const descartesExitState = await evaluate(cdp, "window.__examGame.state()");
    if (descartesExitState.bossProjectionCount !== descartesMultiSwitchState.bossProjectionCount) {
      throw new Error(`Descartes domain should summon 0 exit projections after four or more quadrant changes: ${JSON.stringify(descartesExitState)}`);
    }
    await evaluate(cdp, "window.__examGame.setPlayerPositionForVerify(120, 120); window.__examGame.forceBossMechanic('descartes')");
    await wait(100);
    const descartesNoSwitchState = await evaluate(cdp, "window.__examGame.state()");
    await evaluate(cdp, "window.__examGame.forceBossMechanic('gauss')");
    const descartesExitCapState = await evaluate(cdp, "window.__examGame.state()");
    if (descartesExitCapState.bossProjectionCount - descartesNoSwitchState.bossProjectionCount > 4) {
      throw new Error(`Descartes domain exit should summon no more than four projections: ${JSON.stringify({ descartesNoSwitchState, descartesExitCapState })}`);
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('descartesAttack')");
    await wait(100);
    const descartesAttackState = await evaluate(cdp, "window.__examGame.state()");
    if (descartesAttackState.bossLaserCount < 1) {
      throw new Error("Descartes cross laser attack did not spawn");
    }
    await evaluate(cdp, "window.__examGame.forceBossMechanic('cauchy')");
    const cauchyWrongHit = await evaluate(cdp, "window.__examGame.damageBossCoreForVerify('cauchy', 80, 'polarShotgun')");
    if (cauchyWrongHit.afterShield !== cauchyWrongHit.beforeShield || cauchyWrongHit.after !== cauchyWrongHit.before) {
      throw new Error(`Non-matching weapons should not damage boss shields: ${JSON.stringify(cauchyWrongHit)}`);
    }
    const cauchySwordHit = await evaluate(cdp, "window.__examGame.damageBossCoreForVerify('cauchy', 30, 'sword')");
    if (!cauchySwordHit.domain || cauchySwordHit.afterShield >= cauchySwordHit.beforeShield || cauchySwordHit.after !== cauchySwordHit.before) {
      throw new Error(`The domain core shield should be damageable while HP stays invulnerable: ${JSON.stringify(cauchySwordHit)}`);
    }
    const trackingCoreId = cauchySwordHit.state.bossFrontCoreIds.includes("descartes") ? "descartes" : cauchySwordHit.state.bossFrontCoreIds[0];
    const trackingWeapon = trackingCoreId === "gauss" ? "matrixRpg" : trackingCoreId === "descartes" ? "coordinateBlade" : "functionGun";
    await evaluate(cdp, `window.__examGame.damageBossCoreForVerify('${trackingCoreId}', 30, '${trackingWeapon}')`);
    const bossDamageTrackState = await evaluate(cdp, `window.__examGame.damageBossCoreForVerify('${trackingCoreId}', 80, 'sword').state`);
    if (
      bossDamageTrackState.bossTopDamageWeapon.id !== "sword" ||
      !bossDamageTrackState.bossWeaponDamage.sword
    ) {
      throw new Error(`Boss weapon damage tracking failed: ${JSON.stringify(bossDamageTrackState.bossWeaponDamage)}`);
    }

    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.forceBossMechanic('rotate')");
    await wait(950);
    const rotatedBossState = await evaluate(cdp, "window.__examGame.state()");
    if (rotatedBossState.bossRotationSteps < 1 || !rotatedBossState.bossDomainCoreId || rotatedBossState.bossRotateTimer > 20 || rotatedBossState.bossRotateTimer < 18.8) {
      throw new Error(`Boss should rotate into a new 20 second domain: ${JSON.stringify(rotatedBossState)}`);
    }
    if (rotatedBossState.bossObstacleBoomCount <= cauchyHighlightState.bossObstacleBoomCount) {
      throw new Error("Cauchy domain walls should explode when the domain ends");
    }

    const bossShot = await screenshot(cdp, "boss.png");

    await evaluate(cdp, "window.__examGame.setBossCoreHp('gauss', 60); window.__examGame.forceBossMechanic('gauss')");
    await wait(100);
    await evaluate(cdp, "window.__examGame.setBossCoreHp('cauchy', 0)");
    await wait(150);
    const gaussHealState = await evaluate(cdp, "window.__examGame.state()");
    if (gaussHealState.bossGaussDomainKillHealCount < 1 || gaussHealState.bossCoreHp[2] !== gaussHealState.bossCoreMaxHp[2]) {
      throw new Error(`Gauss should fully heal if another core dies during Gauss domain: ${JSON.stringify(gaussHealState)}`);
    }

    await evaluate(cdp, "window.__examGame.setBossCoreHp('cauchy', 0)");
    await wait(700);
    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.setBossCoreHp('descartes', 0)");
    await wait(1800);
    const bossDefeatState = await evaluate(cdp, "window.__examGame.state()");
    if (bossDefeatState.bossDefeatedCount < 2) {
      throw new Error(`Boss defeated-count tracking failed under the document boss rules: ${JSON.stringify(bossDefeatState)}`);
    }
    for (const oldField of ["bossInheritedCount", "bossComboCount", "bossUltimateState", "bossWeakTimer"]) {
      if (oldField in bossDefeatState) {
        throw new Error(`Old boss mechanic state should not be exported anymore: ${oldField}`);
      }
    }
    if (
      !bossDefeatState.bossFrontCoreIds.includes("gauss") ||
      bossDefeatState.bossInvulnerableCoreIds.includes("gauss") ||
      bossDefeatState.bossActiveCoreCount !== 1 ||
      bossDefeatState.bossFullPowerCoreId !== "gauss"
    ) {
      throw new Error(`The last remaining Gauss core should stay front-facing and damageable: ${JSON.stringify(bossDefeatState)}`);
    }
    const soloGaussHit = await evaluate(cdp, "window.__examGame.damageBossCoreForVerify('gauss', 80, 'sword')");
    if (soloGaussHit.after >= soloGaussHit.before) {
      throw new Error(`The last remaining Gauss core did not take HP damage: ${JSON.stringify(soloGaussHit)}`);
    }

    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }))");
    await wait(100);
    const inventoryState = await evaluate(cdp, `({
      title: document.getElementById('modalTitle').textContent,
      hidden: document.getElementById('modal').hidden,
      weaponRows: document.querySelectorAll('.inventory-section .weapon-table tbody tr').length,
      cards: document.querySelectorAll('.inventory-section .buff-card').length,
      hasEmptyBuffState: Boolean(document.querySelector('.inventory-section .buff-empty'))
    })`);
    if (inventoryState.hidden || inventoryState.title !== "背包" || inventoryState.weaponRows < 1 || (inventoryState.cards < 1 && !inventoryState.hasEmptyBuffState)) {
      throw new Error("Inventory modal did not render weapons and buffs");
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, `Array.from({ length: 11 }, (_, index) => {
      window.__examGame.addLeaderboardEntry({
        id: 'verify-' + index,
        name: 'vname' + index,
        score: 900 + index * 10,
        seconds: 200 - index,
        kills: index,
        weaponsFound: 2 + index,
        hp: 80,
        maxHp: 100,
        completedRooms: ['微积分', '随机 A'],
        swordOnly: index === 10,
        playedAt: new Date(Date.now() + index * 1000).toISOString()
      });
    })`);
    await evaluate(cdp, "document.getElementById('leaderboardBtn').click()");
    await wait(100);
    const leaderboardState = await evaluate(cdp, `({
      title: document.getElementById('modalTitle').textContent,
      scoreRows: document.querySelectorAll('.leaderboard-board[data-board="score"] tbody tr').length,
      timeRows: document.querySelectorAll('.leaderboard-board[data-board="time"] tbody tr').length,
      swordRows: document.querySelectorAll('.leaderboard-board[data-board="sword"] tbody tr').length,
      topName: document.querySelector('.leaderboard-board[data-board="score"] tbody tr:first-child [data-column="name"]')?.textContent,
      topScore: document.querySelector('.leaderboard-board[data-board="score"] tbody tr:first-child [data-column="score"]')?.textContent,
      topTime: document.querySelector('.leaderboard-board[data-board="time"] tbody tr:first-child [data-column="time"]')?.textContent,
      topSwordName: document.querySelector('.leaderboard-board[data-board="sword"] tbody tr:first-child [data-column="name"]')?.textContent,
      stored: window.__examGame.state().leaderboard.length
    })`);
    if (
      leaderboardState.title !== "通关排行榜" ||
      leaderboardState.scoreRows !== 10 ||
      leaderboardState.timeRows !== 10 ||
      leaderboardState.swordRows !== 1 ||
      leaderboardState.stored !== 10 ||
      leaderboardState.topName !== "vname10" ||
      leaderboardState.topScore !== "1000" ||
      leaderboardState.topTime !== "3分10秒" ||
      leaderboardState.topSwordName !== "vname10"
    ) {
      throw new Error(`Triple leaderboard did not keep the expected top records: ${JSON.stringify(leaderboardState)}`);
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, `window.__examGame.prepareLeaderboardNameForVerify({
      id: 'verify-live-name',
      name: '考生',
      score: 1200,
      seconds: 88,
      kills: 5,
      weaponsFound: 4,
      hp: 70,
      maxHp: 100,
      completedRooms: ['微积分'],
      playedAt: new Date().toISOString()
    })`);
    await wait(100);
    const nameFormState = await evaluate(cdp, `({
      pending: window.__examGame.state().pendingLeaderboardEntry,
      hidden: document.getElementById('leaderboardNameForm').hidden,
      status: document.getElementById('leaderboardNameStatus').textContent
    })`);
    if (!nameFormState.pending || nameFormState.hidden || !nameFormState.status.includes("第 1 名")) {
      throw new Error("Leaderboard name form did not appear for a qualifying score");
    }
    await evaluate(cdp, "window.__examGame.submitLeaderboardNameForVerify('Top Student<>')");
    await wait(100);
    await evaluate(cdp, "document.getElementById('leaderboardBtn').click()");
    await wait(100);
    const namedLeaderboardState = await evaluate(cdp, `({
      topName: document.querySelector('.leaderboard-board[data-board="score"] tbody tr:first-child [data-column="name"]')?.textContent,
      topScore: document.querySelector('.leaderboard-board[data-board="score"] tbody tr:first-child [data-column="score"]')?.textContent,
      fastestName: document.querySelector('.leaderboard-board[data-board="time"] tbody tr:first-child [data-column="name"]')?.textContent,
      stored: window.__examGame.state().leaderboard.length
    })`);
    if (namedLeaderboardState.topName !== "Top Student" || namedLeaderboardState.topScore !== "1200" || namedLeaderboardState.fastestName !== "Top Student" || namedLeaderboardState.stored !== 10) {
      throw new Error("Leaderboard name submission did not update the top score");
    }
    await evaluate(cdp, "document.getElementById('modalCloseBtn').click()");
    await wait(100);

    await evaluate(cdp, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))");
    await wait(100);
    const pauseVisible = await evaluate(cdp, "!document.getElementById('pauseScreen').hidden");
    if (!pauseVisible) {
      throw new Error("Pause screen did not open with Escape");
    }
    await evaluate(cdp, "document.getElementById('resumeBtn').click()");
    await wait(100);
    const resumedState = await evaluate(cdp, "window.__examGame.state()");
    if (resumedState.mode !== "combat" || resumedState.activeRoom !== "boss") {
      throw new Error("Resume flow did not return to combat");
    }

    const errors = cdp.events
      .filter((event) => event.method === "Runtime.exceptionThrown")
      .map((event) => event.params?.exceptionDetails?.text || "Runtime exception");

    if (errors.length) {
      throw new Error(`Runtime errors: ${errors.join("; ")}`);
    }

    cdp.close();
    console.log(
      JSON.stringify(
        {
          ok: true,
          url: `http://127.0.0.1:${port}/`,
          screenshots: [menuShot, betaShopShot, mapShot, bossIntroShot, bossShot],
          state: bossState,
        },
        null,
        2,
      ),
    );
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
