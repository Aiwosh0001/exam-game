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
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
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
  const backDisabled = await evaluate(cdp, "document.getElementById('backToMapBtn').disabled");
  if (!backDisabled) {
    throw new Error("Back-to-map button should wait for the weapon choice");
  }
  const method = accept ? "acceptPendingWeaponForVerify" : "skipPendingWeaponForVerify";
  const after = await evaluate(cdp, `window.__examGame.${method}()`);
  if (after.pendingWeaponChoice) {
    throw new Error("Pending weapon choice did not resolve");
  }
  return after;
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
    await evaluate(cdp, "localStorage.removeItem('examGameLeaderboardV1')");

    const title = await evaluate(cdp, "document.title");
    const hasGame = await evaluate(cdp, "Boolean(window.__examGame)");
    const menuHidden = await evaluate(cdp, "document.getElementById('mainMenu').hidden");
    if (title !== "今天你挂科了吗？" || !hasGame || menuHidden) {
      throw new Error("Initial menu did not load correctly");
    }
    const menuShot = await screenshot(cdp, "menu.png");

    await evaluate(cdp, "document.getElementById('weaponStatsBtn').click()");
    await wait(150);
    const weaponRowCount = await evaluate(cdp, "document.querySelectorAll('.weapon-table tbody tr').length");
    const weaponModalWide = await evaluate(cdp, "document.getElementById('modalPanel').classList.contains('modal-panel-wide')");
    if (weaponRowCount < 10 || !weaponModalWide) {
      throw new Error("Weapon stats table did not render correctly");
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
    if (Math.max(...fullBalanceScores) > 34 || Math.min(...fullBalanceScores) < 15) {
      throw new Error(`Weapon balance scores drifted too far: ${JSON.stringify(weaponBalance)}`);
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
    const mapState = await evaluate(cdp, "window.__examGame.state()");
    if (mapState.mode !== "map") {
      throw new Error(`Expected map mode, got ${mapState.mode}`);
    }
    if (!String(mapState.weapon).includes("圣剑") || mapState.weaponDamage !== 15) {
      throw new Error(`Sword damage should be restored to 15: ${JSON.stringify({ weapon: mapState.weapon, damage: mapState.weaponDamage })}`);
    }
    const hasRoomMap = await evaluate(cdp, "Boolean(document.querySelector('.straight-map'))");
    if (!hasRoomMap) {
      throw new Error("Straight corridor map did not render");
    }
    const mapShot = await screenshot(cdp, "corridor.png");

    await evaluate(cdp, "window.__examGame.startBossRoom()");
    await wait(250);
    const directBossSwordState = await evaluate(cdp, "window.__examGame.state()");
    if (
      directBossSwordState.mode !== "combat" ||
      !directBossSwordState.bossDirect ||
      !directBossSwordState.directBossSwordAwakened ||
      directBossSwordState.weaponDamage !== 20 ||
      directBossSwordState.weaponSlashReach !== 42 ||
      directBossSwordState.weaponSlashRadius !== 56 ||
      !String(directBossSwordState.weapon).includes("觉醒")
    ) {
      throw new Error(`Direct boss sword awakening failed: ${JSON.stringify(directBossSwordState)}`);
    }
    await evaluate(cdp, "window.__examGame.resetGame()");
    await wait(200);
    const resetMapState = await evaluate(cdp, "window.__examGame.state()");
    if (resetMapState.mode !== "map" || resetMapState.weaponDamage !== 15 || resetMapState.directBossSwordAwakened) {
      throw new Error(`Direct boss sword awakening leaked after reset: ${JSON.stringify(resetMapState)}`);
    }

    const draftShieldInitial = await evaluate(cdp, "window.__examGame.grantBuffForVerify('草稿纸护盾')");
    if (draftShieldInitial.blockCharges !== 1 || draftShieldInitial.blockTimer <= 0) {
      throw new Error("Draft shield buff did not grant an initial block charge");
    }
    const draftShieldRepeat = await evaluate(cdp, "window.__examGame.grantBuffForVerify('草稿纸护盾')");
    if (draftShieldRepeat.blockCharges !== 1) {
      throw new Error("Draft shield should never store more than one block charge");
    }
    const draftShieldBlock = await evaluate(cdp, "window.__examGame.damagePlayerForVerify(999)");
    if (draftShieldBlock.after.hp !== draftShieldBlock.before.hp || draftShieldBlock.after.blockCharges !== 0) {
      throw new Error("Draft shield did not block one full incoming hit");
    }
    const draftShieldCharging = await evaluate(cdp, "window.__examGame.tickPassiveForVerify(9.9)");
    if (draftShieldCharging.blockCharges !== 0) {
      throw new Error("Draft shield recharged too early");
    }
    const draftShieldRecharged = await evaluate(cdp, "window.__examGame.tickPassiveForVerify(0.2)");
    if (draftShieldRecharged.blockCharges !== 1) {
      throw new Error("Draft shield did not recharge after ten seconds");
    }
    const coffeeState = await evaluate(cdp, "window.__examGame.grantBuffForVerify('熬夜咖啡')");
    if (coffeeState.movementSpeedMultiplier !== 2) {
      throw new Error("Overnight coffee should raise movement speed by 100%");
    }
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
          usedNonSwordWeapon: true
        }),
        slowFullPrep: window.__examGame.scoreForVerify({
          seconds: 520,
          hp: 100,
          maxHp: 100,
          kills: 18,
          weaponsFound: 6,
          completedKeys: allRooms,
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
    if (initialDropModel.randomRewardFamilies.length !== 8 || initialDropModel.randomFamilyEntryCounts.functionGun !== 2) {
      throw new Error(`Random monster rewards should be grouped by weapon family: ${JSON.stringify(initialDropModel)}`);
    }

    await evaluate(cdp, "window.__examGame.openChestRoom('__verifySkipChest')");
    await wait(200);
    const skipChestPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (
      !skipChestPromptState.completed.__verifySkipChest ||
      !skipChestPromptState.pendingWeaponChoice ||
      !skipChestPromptState.pendingWeaponId ||
      !skipChestPromptState.pendingAltBuff ||
      skipChestPromptState.weapons.length !== 1 ||
      !skipChestPromptState.swordOnlyRun
    ) {
      throw new Error("Chest did not offer a weapon/buff choice correctly");
    }
    const skipChestState = await resolvePendingWeapon(cdp, false);
    if (skipChestState.weapons.length !== 1 || !skipChestState.swordOnlyRun || skipChestState.buffs.length <= skipChestPromptState.buffs.length || skipChestState.recentRewardFamilies.length) {
      throw new Error("Choosing the chest buff added a weapon, lost sword-only eligibility, or remembered a weapon family");
    }

    await evaluate(cdp, "window.__examGame.openChestRoom('__verifyChest')");
    await wait(200);
    const chestPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!chestPromptState.completed.__verifyChest || !chestPromptState.pendingWeaponChoice || !chestPromptState.pendingAltBuff || chestPromptState.weapons.length !== 1 || !chestPromptState.swordOnlyRun) {
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
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const calculusPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!calculusPromptState.completed.monster || !calculusPromptState.pendingWeaponChoice) {
      throw new Error("Calculus room did not complete correctly");
    }
    const calculusClearState = await resolvePendingWeapon(cdp, true);
    if (calculusClearState.challengeCount !== 2 || calculusClearState.defeatedInRoom !== 2 || calculusClearState.weaponLevel < 2) {
      throw new Error("Duplicate weapon reward did not strengthen the existing weapon");
    }
    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

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
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const geometryPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!geometryPromptState.completed.geometry || !geometryPromptState.pendingWeaponChoice) {
      throw new Error("Geometry room did not complete correctly");
    }
    const geometryClearState = await resolvePendingWeapon(cdp, true);
    if (geometryClearState.challengeCount !== 3 || geometryClearState.defeatedInRoom !== 3 || geometryClearState.buffs.length < calculusClearState.buffs.length + 2) {
      throw new Error("Three-person challenge did not grant the expected rewards");
    }
    if (!String(geometryClearState.weapon).includes("极坐标霰弹枪") || geometryClearState.weaponLevel !== 1) {
      throw new Error("Three-person challenge should grant one normal weapon without an extra weapon upgrade");
    }
    await evaluate(cdp, "document.getElementById('backToMapBtn').click()");
    await wait(100);

    await evaluate(cdp, "window.__examGame.startMonsterRoom('linear')");
    await wait(200);
    const linearEntryState = await evaluate(cdp, "window.__examGame.state()");
    if (linearEntryState.mode !== "challenge" || !linearEntryState.pendingChallenge) {
      throw new Error("Linear room did not open challenge selection");
    }
    const linearFightState = await chooseChallenge(cdp, 1);
    if (linearFightState.activeRoomKey !== "linear") {
      throw new Error("Linear challenge did not start correctly");
    }
    await evaluate(cdp, "window.__examGame.completeActiveRoom()");
    await wait(150);
    const linearPromptState = await evaluate(cdp, "window.__examGame.state()");
    if (!linearPromptState.completed.linear || !linearPromptState.pendingWeaponChoice) {
      throw new Error("Linear room did not complete correctly");
    }
    await resolvePendingWeapon(cdp, true);
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
      throw new Error("Boss intro title phase did not start correctly");
    }
    const bossIntroShot = await screenshot(cdp, "boss-intro.png");
    await wait(11200);
    const bossState = await evaluate(cdp, "window.__examGame.state()");
    if (bossState.mode !== "combat" || bossState.activeRoom !== "boss") {
      throw new Error("Boss room did not start correctly");
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
      throw new Error("Boss horizontal movement did not start");
    }
    if (!bossState.obstacleRects.some((rect) => rect.shape !== "rect")) {
      throw new Error(`Boss obstacles should include random non-rect shapes: ${JSON.stringify(bossState.obstacleRects)}`);
    }
    if (bossState.obstacleRects.some((rect) => rect.area > 1900)) {
      throw new Error(`Boss obstacles should stay compact: ${JSON.stringify(bossState.obstacleRects)}`);
    }
    for (const attackType of ["curve", "laser", "matrix"]) {
      if (!bossState.bossAttackTypes.includes(attackType)) {
        throw new Error(`Boss attack type ${attackType} was not configured`);
      }
    }
    if (!bossState.bossShotPatternCounts.curve || !bossState.bossShotPatternCounts.matrix) {
      throw new Error(`Boss differentiated bullet patterns did not spawn: ${JSON.stringify(bossState.bossShotPatternCounts)}`);
    }
    if (bossState.bossLaserCount < 1) {
      throw new Error("Boss laser attack did not spawn");
    }
    if (bossState.bossRotationSteps < 1) {
      throw new Error("Boss did not perform a staged 120 degree rotation");
    }
    if (bossState.bossComboCount < 1) {
      throw new Error("Boss trio combo did not trigger");
    }
    if (bossState.bossActiveCoreCount !== 2 || bossState.bossInvulnerableCoreIds.length !== 1) {
      throw new Error("Boss front/back core state was not established");
    }
    const backCoreId = bossState.bossInvulnerableCoreIds[0];
    const backHitState = await evaluate(cdp, `window.__examGame.damageBossCoreForVerify('${backCoreId}', 80)`);
    if (!backHitState || backHitState.front || backHitState.after !== backHitState.before) {
      throw new Error("Boss back core was not invulnerable");
    }
    const obstacleBefore = bossState.obstacleRects || [];
    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.forceBossMechanic('obstacle')");
    await wait(6200);
    const obstacleRespawnState = await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.state()");
    if (obstacleRespawnState.bossObstacleBoomCount <= bossState.bossObstacleBoomCount) {
      throw new Error("Boss obstacle detonation did not trigger");
    }
    const obstacleMoved = obstacleRespawnState.obstacleRects.some((rect, index) => {
      const before = obstacleBefore[index];
      return before && (
        Math.abs(rect.x - before.x) > 8 ||
        Math.abs(rect.y - before.y) > 8 ||
        Math.abs(rect.w - before.w) > 4 ||
        Math.abs(rect.h - before.h) > 4
      );
    });
    if (!obstacleMoved) {
      throw new Error(`Boss obstacle respawn should choose a new random position: ${JSON.stringify({ before: obstacleBefore, after: obstacleRespawnState.obstacleRects })}`);
    }
    const bossShot = await screenshot(cdp, "boss.png");

    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.forceBossMechanic('weak')");
    await wait(750);
    const bossWeakState = await evaluate(cdp, "window.__examGame.state()");
    if (!bossWeakState.bossWeakCore || bossWeakState.bossWeakTimer <= 0) {
      throw new Error("Boss weak-point window did not activate");
    }

    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.forceBossMechanic('ultimate')");
    await wait(450);
    const bossUltimateChargeState = await evaluate(cdp, "window.__examGame.state()");
    if (bossUltimateChargeState.bossUltimateState !== "charging" || bossUltimateChargeState.bossUltimateCount < 1) {
      throw new Error("Boss interruptible ultimate did not begin charging");
    }
    await wait(3900);
    const bossUltimateState = await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.state()");
    if (bossUltimateState.bossUltimateFiredCount + bossUltimateState.bossUltimateInterruptedCount < 1) {
      throw new Error("Boss interruptible ultimate did not resolve");
    }

    await evaluate(cdp, "window.__examGame.setBossCoreHp('cauchy', 0)");
    await wait(700);
    const bossInheritanceState = await evaluate(cdp, "window.__examGame.state()");
    if (!bossInheritanceState.bossInheritedCoreIds.includes("cauchy")) {
      throw new Error("Boss defeated-core inheritance did not register");
    }
    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.setBossCoreHp('descartes', 0)");
    await wait(1800);
    const bossFinalCoreState = await evaluate(cdp, "window.__examGame.state()");
    if (bossFinalCoreState.bossDefeatedCount < 2 || bossFinalCoreState.bossInheritedCount < 1) {
      throw new Error("Boss final-core form or inherited attacks did not activate");
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
          screenshots: [menuShot, mapShot, bossIntroShot, bossShot],
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
