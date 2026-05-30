import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "127.0.0.1";
const leaderboardPath = path.join(root, "data", "leaderboard.json");
const statsPath = path.join(root, "data", "stats.json");
const leaderboardScoreVersion = "combat-time-v1";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function log(message) {
  fs.appendFile(path.join(root, "server.out.log"), `${new Date().toISOString()} ${message}\n`).catch(() => {});
}

function cleanList(value, limit = 12) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").replace(/[<>]/g, "").trim()).filter(Boolean).slice(0, limit)
    : [];
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.scoreVersion && entry.scoreVersion !== leaderboardScoreVersion) return null;
  const score = Math.round(Number(entry.score || 0));
  if (!Number.isFinite(score) || score <= 0) return null;
  const rooms = Array.isArray(entry.completedRooms) ? entry.completedRooms.filter(Boolean).slice(0, 6).map(String) : [];
  const playedAt = typeof entry.playedAt === "string" && entry.playedAt ? entry.playedAt : new Date().toISOString();
  const intValue = (key, fallback) => {
    const value = Math.round(Number(entry[key] ?? fallback));
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };
  const routeType = ["direct", "prepared", "full"].includes(entry.routeType)
    ? entry.routeType
    : rooms.length <= 0 ? "direct" : rooms.length >= 6 ? "full" : "prepared";
  const weaponIds = cleanList(entry.weaponIds, 12);
  const weaponsFound = Math.max(1, intValue("weaponsFound", 1));
  const swordOnly = typeof entry.swordOnly === "boolean" ? entry.swordOnly : weaponsFound <= 1 && rooms.length === 0;
  if (swordOnly && !weaponIds.length) weaponIds.push("sword");
  const finalWeaponId = cleanList([entry.finalWeaponId], 1)[0] || "";
  const finalWeaponName = cleanList([entry.finalWeaponName], 1)[0] || "";
  return {
    id: String(entry.id || `${playedAt}-${score}`),
    name: String(entry.name || "考生"),
    score,
    seconds: Math.max(1, intValue("seconds", 1)),
    kills: intValue("kills", 0),
    weaponsFound,
    hp: intValue("hp", 0),
    maxHp: Math.max(1, intValue("maxHp", 1)),
    completedRooms: rooms,
    completedRoomKeys: cleanList(entry.completedRoomKeys, 6),
    completedRoomTypes: cleanList(entry.completedRoomTypes, 6),
    routeType,
    weaponIds,
    weaponNames: cleanList(entry.weaponNames, 12),
    buffs: cleanList(entry.buffs, 16),
    finalWeaponId,
    finalWeaponName,
    bossTopDamageWeaponId: cleanList([entry.bossTopDamageWeaponId], 1)[0] || finalWeaponId,
    bossTopDamageWeaponName: cleanList([entry.bossTopDamageWeaponName], 1)[0] || finalWeaponName,
    bossTopDamageWeaponDamage: Math.max(0, Math.round(Number(entry.bossTopDamageWeaponDamage || 0) * 10) / 10),
    swordOnly,
    playedAt,
    scoreVersion: leaderboardScoreVersion,
    timeMode: "combat",
  };
}

function normalizeStatsEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.scoreVersion && entry.scoreVersion !== leaderboardScoreVersion) return null;
  const result = ["loss", "fail", "failed", "death"].includes(String(entry.result || entry.outcome || "win").toLowerCase())
    ? "loss"
    : "win";
  if (result === "win") {
    const normalized = normalizeLeaderboardEntry(entry);
    if (!normalized) return null;
    return {
      ...normalized,
      result: "win",
      deathRoomKey: cleanList([entry.deathRoomKey], 1)[0] || "",
      deathRoomName: cleanList([entry.deathRoomName], 1)[0] || "",
      deathStage: cleanList([entry.deathStage], 1)[0] || "",
    };
  }

  const rooms = Array.isArray(entry.completedRooms) ? entry.completedRooms.filter(Boolean).slice(0, 6).map(String) : [];
  const playedAt = typeof entry.playedAt === "string" && entry.playedAt ? entry.playedAt : new Date().toISOString();
  const score = Math.max(0, Math.round(Number(entry.score || 0)));
  const intValue = (key, fallback) => {
    const value = Math.round(Number(entry[key] ?? fallback));
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };
  const routeType = ["direct", "prepared", "full"].includes(entry.routeType)
    ? entry.routeType
    : rooms.length <= 0 ? "direct" : rooms.length >= 6 ? "full" : "prepared";
  const weaponIds = cleanList(entry.weaponIds, 12);
  return {
    id: String(entry.id || `${playedAt}-${score}`),
    name: String(entry.name || "考生"),
    score,
    seconds: Math.max(1, intValue("seconds", 1)),
    kills: intValue("kills", 0),
    weaponsFound: Math.max(1, intValue("weaponsFound", 1)),
    hp: intValue("hp", 0),
    maxHp: Math.max(1, intValue("maxHp", 1)),
    completedRooms: rooms,
    completedRoomKeys: cleanList(entry.completedRoomKeys, 6),
    completedRoomTypes: cleanList(entry.completedRoomTypes, 6),
    routeType,
    weaponIds: weaponIds.length ? weaponIds : ["sword"],
    weaponNames: cleanList(entry.weaponNames, 12),
    buffs: cleanList(entry.buffs, 16),
    finalWeaponId: cleanList([entry.finalWeaponId], 1)[0] || "",
    finalWeaponName: cleanList([entry.finalWeaponName], 1)[0] || "",
    swordOnly: typeof entry.swordOnly === "boolean" ? entry.swordOnly : false,
    deathRoomKey: cleanList([entry.deathRoomKey], 1)[0] || "",
    deathRoomName: cleanList([entry.deathRoomName], 1)[0] || "",
    deathStage: cleanList([entry.deathStage], 1)[0] || "",
    playedAt,
    scoreVersion: leaderboardScoreVersion,
    timeMode: "combat",
    result: "loss",
  };
}

function sortLeaderboard(entries) {
  return entries
    .map(normalizeLeaderboardEntry)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds || new Date(b.playedAt) - new Date(a.playedAt))
    .slice(0, 10);
}

async function readLeaderboard() {
  try {
    const raw = await fs.readFile(leaderboardPath, "utf-8");
    const parsed = JSON.parse(raw);
    return sortLeaderboard(Array.isArray(parsed) ? parsed : parsed.entries || []);
  } catch {
    return [];
  }
}

async function writeLeaderboard(entries) {
  const topTen = sortLeaderboard(entries);
  await fs.mkdir(path.dirname(leaderboardPath), { recursive: true });
  await fs.writeFile(leaderboardPath, JSON.stringify(topTen, null, 2), "utf-8");
  return topTen;
}

async function addLeaderboardEntry(entry) {
  const normalized = normalizeLeaderboardEntry(entry);
  if (!normalized) return readLeaderboard();
  return writeLeaderboard([...(await readLeaderboard()), normalized]);
}

function defaultStats() {
  return {
    version: leaderboardScoreVersion,
    totalRuns: 0,
    bossClears: 0,
    failedRuns: 0,
    directBossClears: 0,
    preparedClears: 0,
    fullPrepClears: 0,
    fastestSeconds: 0,
    longestSeconds: 0,
    totalSeconds: 0,
    totalRunSeconds: 0,
    swordOnlyClears: 0,
    bestScore: 0,
    bestRemainingHp: 0,
    bestRemainingHpMax: 0,
    worstRemainingHp: 0,
    worstRemainingHpMax: 0,
    firepowerOverloadClears: 0,
    mostRooms: 0,
    totalKills: 0,
    maxKills: 0,
    maxWeaponsFound: 0,
    totalRoomsCompleted: 0,
    totalWeaponsFound: 0,
    lastPlayedAt: "",
    routeCounts: { direct: 0, prepared: 0, full: 0 },
    weaponUseCounts: {},
    finalWeaponCounts: {},
    bossTopDamageWeaponCounts: {},
    buffUseCounts: {},
    roomClearCounts: {},
    deathRoomCounts: {},
    deathStageCounts: {},
    entryIds: [],
  };
}

function normalizeCountMap(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, count]) => [String(key).replace(/[<>]/g, "").trim().slice(0, 32), Math.max(0, Math.round(Number(count || 0)))])
      .filter(([key, count]) => key && count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .slice(0, 80)
  );
}

function incrementCount(stats, mapKey, key) {
  if (!key) return;
  stats[mapKey] ||= {};
  stats[mapKey][key] = Math.max(0, Math.round(Number(stats[mapKey][key] || 0))) + 1;
}

function updateStatsWithEntry(stats, entry) {
  stats.totalRuns += 1;
  stats.totalRunSeconds += entry.seconds;
  if (entry.result === "loss") {
    stats.failedRuns += 1;
    incrementCount(stats, "deathRoomCounts", entry.deathRoomKey || entry.deathRoomName || "unknown");
    incrementCount(stats, "deathStageCounts", entry.deathStage || "探索中断");
    if (entry.playedAt && entry.playedAt > stats.lastPlayedAt) stats.lastPlayedAt = entry.playedAt;
    return;
  }

  stats.bossClears += 1;
  if (entry.routeType === "direct") stats.directBossClears += 1;
  else if (entry.routeType === "full") stats.fullPrepClears += 1;
  else stats.preparedClears += 1;
  incrementCount(stats, "routeCounts", entry.routeType);
  stats.fastestSeconds = stats.fastestSeconds ? Math.min(stats.fastestSeconds, entry.seconds) : entry.seconds;
  stats.longestSeconds = Math.max(stats.longestSeconds, entry.seconds);
  stats.totalSeconds += entry.seconds;
  stats.swordOnlyClears += entry.swordOnly ? 1 : 0;
  stats.bestScore = Math.max(stats.bestScore, entry.score);
  const oldHpRatio = stats.bestRemainingHp / Math.max(1, stats.bestRemainingHpMax);
  const newHpRatio = entry.hp / Math.max(1, entry.maxHp);
  if (newHpRatio > oldHpRatio || (newHpRatio === oldHpRatio && entry.hp > stats.bestRemainingHp)) {
    stats.bestRemainingHp = entry.hp;
    stats.bestRemainingHpMax = entry.maxHp;
  }
  const oldWorstHpRatio = stats.worstRemainingHpMax ? stats.worstRemainingHp / Math.max(1, stats.worstRemainingHpMax) : null;
  if (oldWorstHpRatio === null || newHpRatio < oldWorstHpRatio || (newHpRatio === oldWorstHpRatio && entry.hp < stats.worstRemainingHp)) {
    stats.worstRemainingHp = entry.hp;
    stats.worstRemainingHpMax = entry.maxHp;
  }
  if (Math.max(entry.weaponsFound, entry.weaponIds.length) >= 5) {
    stats.firepowerOverloadClears += 1;
  }
  stats.mostRooms = Math.max(stats.mostRooms, entry.completedRooms.length);
  stats.totalRoomsCompleted += entry.completedRooms.length;
  stats.totalKills += entry.kills;
  stats.maxKills = Math.max(stats.maxKills, entry.kills);
  stats.maxWeaponsFound = Math.max(stats.maxWeaponsFound, entry.weaponsFound);
  stats.totalWeaponsFound += entry.weaponsFound;
  for (const roomKey of new Set(entry.completedRoomKeys.length ? entry.completedRoomKeys : entry.completedRooms)) incrementCount(stats, "roomClearCounts", roomKey);
  for (const weaponId of new Set(entry.weaponIds)) incrementCount(stats, "weaponUseCounts", weaponId);
  const finalWeapon = entry.finalWeaponId || entry.weaponIds.at(-1) || "";
  incrementCount(stats, "finalWeaponCounts", finalWeapon);
  incrementCount(stats, "bossTopDamageWeaponCounts", entry.bossTopDamageWeaponId || finalWeapon);
  for (const buff of new Set(entry.buffs)) incrementCount(stats, "buffUseCounts", buff);
  if (entry.playedAt && entry.playedAt > stats.lastPlayedAt) stats.lastPlayedAt = entry.playedAt;
}

function normalizeStats(value) {
  if (!value || typeof value !== "object") return defaultStats();
  const stats = defaultStats();
  const intValue = (key) => {
    const valueNumber = Math.round(Number(value[key] || 0));
    return Number.isFinite(valueNumber) ? Math.max(0, valueNumber) : 0;
  };
  stats.bossClears = intValue("bossClears");
  stats.failedRuns = intValue("failedRuns");
  stats.totalRuns = Math.max(intValue("totalRuns"), stats.bossClears + stats.failedRuns);
  stats.directBossClears = intValue("directBossClears");
  stats.preparedClears = intValue("preparedClears");
  stats.fullPrepClears = intValue("fullPrepClears");
  stats.fastestSeconds = intValue("fastestSeconds");
  stats.longestSeconds = intValue("longestSeconds");
  stats.totalSeconds = intValue("totalSeconds");
  stats.totalRunSeconds = Math.max(intValue("totalRunSeconds"), stats.totalSeconds);
  stats.swordOnlyClears = intValue("swordOnlyClears");
  stats.bestScore = intValue("bestScore");
  stats.bestRemainingHp = intValue("bestRemainingHp");
  stats.bestRemainingHpMax = intValue("bestRemainingHpMax");
  stats.worstRemainingHp = intValue("worstRemainingHp");
  stats.worstRemainingHpMax = intValue("worstRemainingHpMax");
  stats.firepowerOverloadClears = intValue("firepowerOverloadClears");
  stats.mostRooms = intValue("mostRooms");
  stats.totalKills = intValue("totalKills");
  stats.maxKills = intValue("maxKills");
  stats.maxWeaponsFound = intValue("maxWeaponsFound");
  stats.totalRoomsCompleted = intValue("totalRoomsCompleted");
  stats.totalWeaponsFound = intValue("totalWeaponsFound");
  stats.lastPlayedAt = typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : "";
  stats.routeCounts = {
    direct: stats.directBossClears,
    prepared: stats.preparedClears,
    full: stats.fullPrepClears,
    ...normalizeCountMap(value.routeCounts),
  };
  stats.weaponUseCounts = normalizeCountMap(value.weaponUseCounts);
  stats.finalWeaponCounts = normalizeCountMap(value.finalWeaponCounts);
  stats.bossTopDamageWeaponCounts = normalizeCountMap(value.bossTopDamageWeaponCounts);
  if (!Object.keys(stats.bossTopDamageWeaponCounts).length) {
    stats.bossTopDamageWeaponCounts = { ...stats.finalWeaponCounts };
  }
  stats.buffUseCounts = normalizeCountMap(value.buffUseCounts);
  stats.roomClearCounts = normalizeCountMap(value.roomClearCounts);
  stats.deathRoomCounts = normalizeCountMap(value.deathRoomCounts);
  stats.deathStageCounts = normalizeCountMap(value.deathStageCounts);
  stats.entryIds = Array.isArray(value.entryIds) ? value.entryIds.map(String).slice(-1000) : [];
  return stats;
}

function publicStats(stats) {
  const visible = normalizeStats(stats);
  delete visible.entryIds;
  return visible;
}

function statsFromEntries(entries) {
  const stats = defaultStats();
  const seen = new Set();
  for (const entry of entries.map(normalizeLeaderboardEntry).filter(Boolean)) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    updateStatsWithEntry(stats, entry);
  }
  stats.entryIds = Array.from(seen).slice(-1000);
  return stats;
}

async function readStats() {
  try {
    return normalizeStats(JSON.parse(await fs.readFile(statsPath, "utf-8")));
  } catch (error) {
    if (error?.code === "ENOENT") return statsFromEntries(await readLeaderboard());
    return defaultStats();
  }
}

async function writeStats(stats) {
  const normalized = normalizeStats(stats);
  await fs.mkdir(path.dirname(statsPath), { recursive: true });
  await fs.writeFile(statsPath, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}

async function addStatsEntry(entry) {
  const normalized = normalizeStatsEntry(entry);
  if (!normalized) return readStats();
  const stats = await readStats();
  if (stats.entryIds.includes(normalized.id)) return writeStats(stats);
  updateStatsWithEntry(stats, normalized);
  stats.entryIds = [...stats.entryIds, normalized.id].slice(-1000);
  return writeStats(stats);
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    return {};
  }
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let filePath;

    if (url.pathname === "/api/leaderboard" && req.method === "GET") {
      sendJson(res, { entries: await readLeaderboard() });
      return;
    } else if (url.pathname === "/api/leaderboard" && req.method === "POST") {
      const payload = await readJsonBody(req);
      const entries = await addLeaderboardEntry(payload);
      await addStatsEntry(payload);
      sendJson(res, { entries }, 201);
      return;
    } else if (url.pathname === "/api/stats" && req.method === "GET") {
      sendJson(res, { stats: publicStats(await readStats()) });
      return;
    } else if (url.pathname === "/api/stats" && req.method === "POST") {
      sendJson(res, { stats: publicStats(await addStatsEntry(await readJsonBody(req))) }, 201);
      return;
    } else if (url.pathname === "/" || url.pathname === "/index.html") {
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
    await fs.writeFile(path.join(root, "server.err.log"), String(error?.stack || error));
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
  }
});

server.listen(port, host, () => {
  log(`Preview server ready: http://${host}:${port}`);
});
