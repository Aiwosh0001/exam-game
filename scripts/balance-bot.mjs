import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.BALANCE_PORT || 5181);
const debugPort = Number(process.env.BALANCE_DEBUG_PORT || 9433);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const reportDir = path.join(root, "verification");
const reportPath = path.join(reportDir, "balance-bot-report.json");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
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
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, version: "balance-bot" }));
        return;
      } else {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(root)) throw new Error("Invalid path");
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
      if (response.ok) return await response.json();
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
      if (message.method) this.events.push(message);
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
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime evaluation failed";
    throw new Error(description);
  }
  return result.result?.value;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.round((sorted.length - 1) * ratio), 0, sorted.length - 1);
  return sorted[index];
}

function sampleNormal(random, meanValue, spread) {
  const u1 = Math.max(1e-9, random());
  const u2 = Math.max(1e-9, random());
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return meanValue + z * spread;
}

const difficulties = {
  alpha: {
    channel: "alpha",
    id: "alpha",
    label: "α 当前",
    pressure: 0.9,
    multiplier: 1,
  },
  standard: {
    channel: "beta",
    id: "standard",
    label: "β 标准",
    pressure: 1,
    multiplier: 1,
  },
  pressure: {
    channel: "beta",
    id: "pressure",
    label: "β 高压",
    pressure: 1.18,
    multiplier: 1.12,
  },
  crisis: {
    channel: "beta",
    id: "crisis",
    label: "β 危机",
    pressure: 1.42,
    multiplier: 1.28,
  },
  final: {
    channel: "beta",
    id: "final",
    label: "β 终局",
    pressure: 1.72,
    multiplier: 1.5,
  },
};

const botProfiles = {
  novice: {
    label: "新手",
    skill: 0.42,
    speed: 0.72,
    consistency: 0.55,
    greed: 0.35,
  },
  regular: {
    label: "普通",
    skill: 0.62,
    speed: 0.88,
    consistency: 0.72,
    greed: 0.58,
  },
  skilled: {
    label: "熟练",
    skill: 0.8,
    speed: 1.05,
    consistency: 0.84,
    greed: 0.75,
  },
  speedrunner: {
    label: "速通",
    skill: 0.88,
    speed: 1.35,
    consistency: 0.76,
    greed: 0.3,
  },
};

const routes = {
  directSword: {
    label: "圣剑直通",
    completedKeys: [],
    randomRoomTypes: {},
    challengeCounts: {},
    combatRooms: 0,
    treasureRooms: 0,
    kills: 0,
    weaponsFound: 1,
    weaponLevels: [1],
    buffs: [],
    passives: {},
    usedNonSwordWeapon: false,
    baseSeconds: 150,
    risk: 1.25,
    buildPower: 0.12,
  },
  threeKnowledge: {
    label: "三知识点稳扎",
    completedKeys: ["monster", "geometry", "linear"],
    randomRoomTypes: {},
    challengeCounts: { monster: 2, geometry: 2, linear: 2 },
    combatRooms: 3,
    treasureRooms: 0,
    kills: 6,
    weaponsFound: 4,
    weaponLevels: [1, 1, 1, 1],
    buffs: ["buff-a", "buff-b", "buff-c"],
    passives: { damage: 1, guard: 1, reload: 1 },
    usedNonSwordWeapon: true,
    baseSeconds: 230,
    risk: 0.82,
    buildPower: 0.72,
  },
  fullMixed: {
    label: "全探索混合",
    completedKeys: ["monster", "geometry", "linear", "chest", "randomB", "randomC"],
    randomRoomTypes: { chest: "chest", randomB: "monster", randomC: "chest" },
    challengeCounts: { monster: 2, geometry: 3, linear: 3, randomB: 2 },
    combatRooms: 4,
    treasureRooms: 2,
    kills: 10,
    weaponsFound: 7,
    weaponLevels: [1, 2, 2, 1, 1, 1, 1],
    buffs: ["buff-a", "buff-b", "buff-c", "buff-d", "buff-e"],
    passives: { damage: 2, guard: 2, reload: 1, dash: 1 },
    usedNonSwordWeapon: true,
    baseSeconds: 330,
    risk: 0.68,
    buildPower: 1.1,
  },
  fullCombat: {
    label: "高挑战全战斗",
    completedKeys: ["monster", "geometry", "linear", "chest", "randomB", "randomC"],
    randomRoomTypes: { chest: "monster", randomB: "monster", randomC: "monster" },
    challengeCounts: { monster: 3, geometry: 3, linear: 3, chest: 3, randomB: 3, randomC: 3 },
    combatRooms: 6,
    treasureRooms: 0,
    kills: 18,
    weaponsFound: 8,
    weaponLevels: [1, 2, 2, 2, 1, 1, 1, 1],
    buffs: ["buff-a", "buff-b", "buff-c", "buff-d", "buff-e", "buff-f"],
    passives: { damage: 2, guard: 2, reload: 2, dash: 2 },
    usedNonSwordWeapon: true,
    baseSeconds: 390,
    risk: 0.78,
    buildPower: 1.38,
  },
  eliteGreed: {
    label: "贪高收益",
    completedKeys: ["monster", "geometry", "linear", "chest", "randomB", "randomC"],
    randomRoomTypes: { chest: "monster", randomB: "monster", randomC: "chest" },
    challengeCounts: { monster: 3, geometry: 3, linear: 3, chest: 3, randomB: 3 },
    combatRooms: 5,
    treasureRooms: 1,
    kills: 15,
    weaponsFound: 8,
    weaponLevels: [1, 2, 2, 2, 2, 1, 1, 1],
    buffs: ["buff-a", "buff-b", "buff-c", "buff-d", "buff-e", "buff-f", "buff-g"],
    passives: { damage: 3, guard: 2, reload: 2, dash: 1 },
    usedNonSwordWeapon: true,
    baseSeconds: 430,
    risk: 0.92,
    buildPower: 1.48,
  },
};

function simulateAttempt(random, difficulty, profile, route) {
  const prepRelief = route.buildPower * 0.28 + profile.greed * 0.08;
  const challengePressure = route.risk + route.combatRooms * 0.045 + Math.max(0, route.combatRooms - 3) * 0.035;
  const effectiveDanger = difficulty.pressure * challengePressure * (1.06 - prepRelief);
  const skillDefense = profile.skill * 1.15 + profile.consistency * 0.45;
  const margin = skillDefense - effectiveDanger;
  const clearChance = clamp(0.52 + margin * 0.44, 0.04, 0.98);
  const win = random() < clearChance;

  const routeSeconds = route.baseSeconds * (1.24 - profile.speed * 0.28) * (1 + (difficulty.pressure - 1) * 0.1);
  const variance = route.baseSeconds * (0.17 + (1 - profile.consistency) * 0.12);
  const seconds = Math.max(24, Math.round(sampleNormal(random, routeSeconds, variance)));
  const maxHp = route.passives.vitality ? 100 + route.passives.vitality * 10 : 100;
  const hpLossRatio = clamp(effectiveDanger * 0.48 - profile.skill * 0.22 + random() * 0.34, 0.03, 0.96);
  const hp = win ? Math.max(1, Math.round(maxHp * (1 - hpLossRatio))) : 0;

  return {
    win,
    seconds,
    hp,
    maxHp,
    clearChance,
    kills: route.kills,
    weaponsFound: route.weaponsFound,
  };
}

function scoreOptions(difficulty, route, attempt) {
  return {
    versionChannel: difficulty.channel,
    betaDifficultyId: difficulty.id,
    seconds: attempt.seconds,
    hp: Math.max(1, attempt.hp),
    maxHp: attempt.maxHp,
    kills: attempt.kills,
    weaponsFound: route.weaponsFound,
    weaponLevels: route.weaponLevels,
    completedKeys: route.completedKeys,
    randomRoomTypes: route.randomRoomTypes,
    challengeCounts: route.challengeCounts,
    buffs: route.buffs,
    passives: route.passives,
    usedNonSwordWeapon: route.usedNonSwordWeapon,
  };
}

function summarize(samples) {
  const wins = samples.filter((sample) => sample.win);
  const scores = wins.map((sample) => sample.score);
  const seconds = wins.map((sample) => sample.seconds);
  const hpRatios = wins.map((sample) => sample.hp / Math.max(1, sample.maxHp));
  return {
    attempts: samples.length,
    clears: wins.length,
    clearRate: Number((wins.length / Math.max(1, samples.length)).toFixed(3)),
    avgScore: Math.round(mean(scores)),
    medianScore: Math.round(percentile(scores, 0.5)),
    p90Score: Math.round(percentile(scores, 0.9)),
    avgRawScore: Math.round(mean(wins.map((sample) => sample.rawScore))),
    avgSeconds: Math.round(mean(seconds)),
    p50Seconds: Math.round(percentile(seconds, 0.5)),
    avgHpRatio: Number(mean(hpRatios).toFixed(3)),
  };
}

function analyze(byDifficulty, byRoute, byProfile, allSamples) {
  const warnings = [];
  const finalSkilled = byDifficulty["β 终局"]?.profiles?.["熟练"];
  if (finalSkilled && (finalSkilled.clearRate < 0.18 || finalSkilled.clearRate > 0.72)) {
    warnings.push(`β 终局熟练玩家通关率 ${Math.round(finalSkilled.clearRate * 100)}%，建议目标约 25%-60%。`);
  }
  const standardRegular = byDifficulty["β 标准"]?.profiles?.["普通"];
  if (standardRegular && (standardRegular.clearRate < 0.55 || standardRegular.clearRate > 0.92)) {
    warnings.push(`β 标准普通玩家通关率 ${Math.round(standardRegular.clearRate * 100)}%，标准难度可能过难或过易。`);
  }

  const routeScores = Object.fromEntries(Object.entries(byRoute).map(([route, value]) => [route, value.avgScore]));
  if ((routeScores["高挑战全战斗"] || 0) <= (routeScores["全探索混合"] || 0)) {
    warnings.push("高挑战全战斗的平均积分没有高于全探索混合，三人房/战斗房收益可能不够明显。");
  }
  if ((routeScores["圣剑直通"] || 0) < (routeScores["三知识点稳扎"] || 0) * 0.85) {
    warnings.push("圣剑直通积分低于稳扎路线太多，圣剑榜吸引力可能不足。");
  }
  if ((routeScores["贪高收益"] || 0) > (routeScores["高挑战全战斗"] || 0) * 1.18) {
    warnings.push("贪高收益路线平均积分过高，可能压过操作更完整的高挑战路线。");
  }

  const difficultyOrder = ["α 当前", "β 标准", "β 高压", "β 危机", "β 终局"];
  for (let i = 1; i < difficultyOrder.length; i += 1) {
    const prev = byDifficulty[difficultyOrder[i - 1]];
    const curr = byDifficulty[difficultyOrder[i]];
    if (prev && curr && curr.clearRate > prev.clearRate + 0.04) {
      warnings.push(`${curr.label || difficultyOrder[i]} 的总通关率高于上一难度，难度阶梯可能不够单调。`);
    }
  }

  const scoreByDifficulty = difficultyOrder.map((label) => byDifficulty[label]).filter(Boolean);
  for (let i = 1; i < scoreByDifficulty.length; i += 1) {
    if (scoreByDifficulty[i].avgScore < scoreByDifficulty[i - 1].avgScore * 0.92) {
      warnings.push(`${scoreByDifficulty[i].label} 平均积分明显低于上一难度，难度倍率可能不足以补偿失败风险。`);
    }
  }

  const topSamples = [...allSamples].filter((sample) => sample.win).sort((a, b) => b.score - a.score).slice(0, 12);
  const topRouteCounts = topSamples.reduce((counts, sample) => {
    counts[sample.route] = (counts[sample.route] || 0) + 1;
    return counts;
  }, {});
  if (Object.keys(topRouteCounts).length <= 1) {
    warnings.push("最高分样本几乎被单一路线垄断，积分榜路线多样性不足。");
  }

  return {
    warnings,
    topRouteCounts,
    verdict: warnings.length ? "需要微调" : "整体合理",
  };
}

async function collectBossProbe(cdp) {
  const probeDifficulties = ["alpha", "standard", "pressure", "crisis", "final"];
  const probes = [];
  for (const key of probeDifficulties) {
    const difficulty = difficulties[key];
    if (!difficulty) continue;
    if (difficulty.channel === "beta") {
      await evaluate(cdp, `window.__examGame.startBetaDifficulty(${JSON.stringify(difficulty.id)})`);
    } else {
      await evaluate(cdp, "window.__examGame.startVersion('alpha')");
    }
    await evaluate(cdp, "window.__examGame.markAllMechanicTutorialsSeenForVerify()");
    await evaluate(cdp, "window.__examGame.startBossRoom({ bypassShop: true })");
    await evaluate(cdp, "window.__examGame.tickBossRoomForVerify(14)");
    const live = await evaluate(cdp, "window.__examGame.state()");
    await evaluate(cdp, "window.__examGame.forceGaussShockwaveMissForVerify()");
    await evaluate(cdp, "window.__examGame.tickBossRoomForVerify(0.8)");
    const breakState = await evaluate(cdp, "window.__examGame.state()");
    await evaluate(cdp, "window.__examGame.setPlayerHp(999); window.__examGame.setBossCoreHp('cauchy', 0); window.__examGame.setBossCoreHp('descartes', 0)");
    await evaluate(cdp, "window.__examGame.tickBossRoomForVerify(2.2)");
    const finalState = await evaluate(cdp, "window.__examGame.state()");
    probes.push({
      difficulty: difficulty.label,
      comboChains: live.bossComboChainCount || 0,
      attacks: live.bossAttackCount || 0,
      attackDelays: live.bossAttackDelayCount || 0,
      pressure: live.bossPressure || 0,
      breakWindowsAfterDodge: breakState.bossBreakWindowCount || 0,
      breakPauseAfterDodge: breakState.bossAttackPauseTimer || 0,
      finalCore: finalState.bossFullPowerCoreId || "",
      finalEntries: finalState.bossFinalCoreEntryCount || 0,
      defeatOrder: finalState.bossDefeatOrder || [],
      finalComboChains: finalState.bossComboChainCount || 0,
    });
  }
  return probes;
}

async function main() {
  await fs.mkdir(reportDir, { recursive: true });
  const seed = Number(process.env.BALANCE_SEED || 20260611);
  const runsPerCombination = Number(process.env.BALANCE_RUNS || 36);
  const random = mulberry32(seed);
  const server = createServer();
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-sandbox",
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(root, ".chrome-balance-profile")}`,
    "about:blank",
  ]);
  chrome.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text && !text.includes("DevTools listening")) console.log(`Chrome: ${text.slice(0, 260)}`);
  });

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const tabs = await waitForJson(`http://127.0.0.1:${debugPort}/json`);
    const tab = tabs.find((item) => item.type === "page");
    if (!tab?.webSocketDebuggerUrl) throw new Error("No page target available in Chrome");

    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    await wait(700);
    await evaluate(cdp, "window.__examGame.resetGame()");
    const bossProbe = await collectBossProbe(cdp);

    const samples = [];
    for (const difficulty of Object.values(difficulties)) {
      for (const profile of Object.values(botProfiles)) {
        for (const route of Object.values(routes)) {
          for (let run = 0; run < runsPerCombination; run += 1) {
            const attempt = simulateAttempt(random, difficulty, profile, route);
            const score = attempt.win
              ? await evaluate(cdp, `window.__examGame.scoreForVerify(${JSON.stringify(scoreOptions(difficulty, route, attempt))})`)
              : null;
            samples.push({
              difficulty: difficulty.label,
              profile: profile.label,
              route: route.label,
              win: attempt.win,
              seconds: attempt.seconds,
              hp: attempt.hp,
              maxHp: attempt.maxHp,
              clearChance: Number(attempt.clearChance.toFixed(3)),
              score: score?.score || 0,
              rawScore: score?.rawScore || 0,
              speedScore: score?.speedScore || 0,
              roomScore: score?.roomScore || 0,
              buildScore: score?.buildScore || 0,
              difficultyMultiplier: score?.difficultyMultiplier || difficulty.multiplier,
            });
          }
        }
      }
    }

    const groupBy = (key) => Object.groupBy(samples, (sample) => sample[key]);
    const byDifficulty = Object.fromEntries(Object.entries(groupBy("difficulty")).map(([label, group]) => {
      const profiles = Object.fromEntries(Object.entries(Object.groupBy(group, (sample) => sample.profile)).map(([profile, profileGroup]) => [profile, summarize(profileGroup)]));
      return [label, { label, ...summarize(group), profiles }];
    }));
    const byRoute = Object.fromEntries(Object.entries(groupBy("route")).map(([label, group]) => [label, { label, ...summarize(group) }]));
    const byProfile = Object.fromEntries(Object.entries(groupBy("profile")).map(([label, group]) => [label, { label, ...summarize(group) }]));
    const analysis = analyze(byDifficulty, byRoute, byProfile, samples);

    const report = {
      ok: true,
      seed,
      runsPerCombination,
      totalAttempts: samples.length,
      generatedAt: new Date().toISOString(),
      analysis,
      bossProbe,
      byDifficulty,
      byRoute,
      byProfile,
      topClears: [...samples].filter((sample) => sample.win).sort((a, b) => b.score - a.score).slice(0, 20),
    };
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(JSON.stringify(report, null, 2));
    cdp.close();
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
