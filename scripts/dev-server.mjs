import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "127.0.0.1";
const leaderboardPath = path.join(root, "data", "leaderboard.json");

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

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const score = Math.round(Number(entry.score || 0));
  if (!Number.isFinite(score) || score <= 0) return null;
  const rooms = Array.isArray(entry.completedRooms) ? entry.completedRooms.filter(Boolean).slice(0, 6).map(String) : [];
  const playedAt = typeof entry.playedAt === "string" && entry.playedAt ? entry.playedAt : new Date().toISOString();
  const intValue = (key, fallback) => {
    const value = Math.round(Number(entry[key] ?? fallback));
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };
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
    playedAt,
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
      sendJson(res, { entries: await addLeaderboardEntry(await readJsonBody(req)) }, 201);
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
