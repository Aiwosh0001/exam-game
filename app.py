from __future__ import annotations

import json
import mimetypes
import os
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent
LEADERBOARD_PATH = BASE_DIR / "data" / "leaderboard.json"
LEADERBOARD_LIMIT = 10
DEFAULT_LEADERBOARD_NAME = "考生"

GAME_CONFIG = {
    "title": "今天你挂科了吗？",
    "version": "0.1.0-basic",
    "baseStats": {
        "hp": 100,
        "speed": 3.5,
        "swordDamage": 15,
        "swordCooldown": 0.5,
        "enemyHp": 60,
        "enemyBulletDamage": 10,
        "bossCoreHp": 300,
        "eliteWeaponMultiplier": 1.25,
    },
}


def sanitize_leaderboard_name(value: object) -> str:
    text = " ".join(str(value or DEFAULT_LEADERBOARD_NAME).split())
    text = "".join(ch for ch in text if ch.isprintable() and ch not in "<>")
    return (text or DEFAULT_LEADERBOARD_NAME)[:12]


def normalize_leaderboard_entry(entry: object) -> dict | None:
    if not isinstance(entry, dict):
        return None
    try:
        score = round(float(entry.get("score", 0)))
    except (TypeError, ValueError):
        return None
    if score <= 0:
        return None

    def as_int(key: str, default: int) -> int:
        try:
            return max(0, round(float(entry.get(key, default))))
        except (TypeError, ValueError):
            return default

    completed_rooms = entry.get("completedRooms")
    if not isinstance(completed_rooms, list):
        completed_rooms = []

    played_at = entry.get("playedAt")
    if not isinstance(played_at, str) or not played_at:
        played_at = ""

    raw_sword_only = entry.get("swordOnly")
    sword_only = raw_sword_only if isinstance(raw_sword_only, bool) else max(1, as_int("weaponsFound", 1)) <= 1 and not completed_rooms

    return {
        "id": str(entry.get("id") or f"{played_at}-{score}"),
        "name": sanitize_leaderboard_name(entry.get("name")),
        "score": score,
        "seconds": max(1, as_int("seconds", 1)),
        "kills": as_int("kills", 0),
        "weaponsFound": max(1, as_int("weaponsFound", 1)),
        "hp": as_int("hp", 0),
        "maxHp": max(1, as_int("maxHp", 1)),
        "completedRooms": [str(room) for room in completed_rooms if room][:6],
        "swordOnly": sword_only,
        "playedAt": played_at,
    }


def dedupe_leaderboard(entries: list[object]) -> list[dict]:
    by_id: dict[str, dict] = {}
    for entry in (normalize_leaderboard_entry(item) for item in entries):
        if not entry:
            continue
        existing = by_id.get(entry["id"])
        if existing and entry["name"] == DEFAULT_LEADERBOARD_NAME and existing["name"] != DEFAULT_LEADERBOARD_NAME:
            entry["name"] = existing["name"]
        by_id[entry["id"]] = entry
    return list(by_id.values())


def sorted_leaderboard(entries: list[object], kind: str = "score") -> list[dict]:
    normalized = dedupe_leaderboard(entries)
    if kind == "sword":
        normalized = [entry for entry in normalized if entry["swordOnly"]]
    if kind == "time":
        normalized.sort(key=lambda item: (item["seconds"], -item["score"], item["playedAt"]))
    else:
        normalized.sort(key=lambda item: (-item["score"], item["seconds"], item["playedAt"]))
    return normalized[:LEADERBOARD_LIMIT]


def retained_leaderboard(entries: list[object]) -> list[dict]:
    normalized = dedupe_leaderboard(entries)
    retained: dict[str, dict] = {}
    for kind in ("score", "time", "sword"):
        for entry in sorted_leaderboard(normalized, kind):
            retained[entry["id"]] = entry
    return sorted(retained.values(), key=lambda item: (-item["score"], item["seconds"], item["playedAt"]))


def read_leaderboard() -> list[dict]:
    try:
        data = json.loads(LEADERBOARD_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return retained_leaderboard(data if isinstance(data, list) else data.get("entries", []))


def write_leaderboard(entries: list[object]) -> list[dict]:
    top_ten = retained_leaderboard(entries)
    LEADERBOARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEADERBOARD_PATH.write_text(json.dumps(top_ten, ensure_ascii=False, indent=2), encoding="utf-8")
    return top_ten


def add_leaderboard_entry(entry: object) -> list[dict]:
    normalized = normalize_leaderboard_entry(entry)
    if not normalized:
        return read_leaderboard()
    current = read_leaderboard()
    if normalized["name"] == DEFAULT_LEADERBOARD_NAME:
        for item in current:
            if item.get("id") == normalized["id"] and item.get("name") != DEFAULT_LEADERBOARD_NAME:
                normalized["name"] = item["name"]
                break
    existing = [item for item in current if item.get("id") != normalized["id"]]
    return write_leaderboard([*existing, normalized])


def create_app():
    from flask import Flask, jsonify, render_template, request

    app = Flask(__name__)
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

    @app.after_request
    def add_no_cache_headers(response):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/")
    def index():
        return render_template("index.html", game_config=GAME_CONFIG)

    @app.get("/api/game-config")
    def game_config():
        return jsonify(GAME_CONFIG)

    @app.get("/api/leaderboard")
    def get_leaderboard():
        return jsonify({"entries": read_leaderboard()})

    @app.post("/api/leaderboard")
    def post_leaderboard():
        entries = add_leaderboard_entry(request.get_json(silent=True) or {})
        return jsonify({"entries": entries}), 201

    return app


def run_flask() -> None:
    app = create_app()

    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG") == "1"
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port, debug=debug, use_reloader=debug)


class PreviewHandler(SimpleHTTPRequestHandler):
    """Small preview server used only when Flask is not installed."""

    def log_message(self, format, *args):  # noqa: A002 - stdlib method name
        try:
            with (BASE_DIR / "server.access.log").open("a", encoding="utf-8") as log:
                log.write((format % args) + "\n")
        except OSError:
            pass

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            request_path = unquote(parsed.path)
            if request_path in {"/", "/index.html"}:
                self._send_file(BASE_DIR / "templates" / "index.html", "text/html; charset=utf-8")
                return
            if request_path == "/api/game-config":
                self._send_json(GAME_CONFIG)
                return
            if request_path == "/api/leaderboard":
                self._send_json({"entries": read_leaderboard()})
                return
            if request_path.startswith("/static/"):
                target = (BASE_DIR / request_path.lstrip("/")).resolve()
                if BASE_DIR in target.parents and target.is_file():
                    content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
                    self._send_file(target, content_type)
                    return
            self.send_error(404, "Not found")
        except Exception:
            (BASE_DIR / "server.err.log").write_text(traceback.format_exc(), encoding="utf-8")
            try:
                self.send_response(500)
                self.end_headers()
            except Exception:
                pass

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            request_path = unquote(parsed.path)
            if request_path != "/api/leaderboard":
                self.send_error(404, "Not found")
                return
            length = int(self.headers.get("Content-Length", "0") or 0)
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {}
            self._send_json({"entries": add_leaderboard_entry(payload)}, status=201)
        except Exception:
            (BASE_DIR / "server.err.log").write_text(traceback.format_exc(), encoding="utf-8")
            try:
                self.send_response(500)
                self.end_headers()
            except Exception:
                pass

    def _send_file(self, path: Path, content_type: str) -> None:
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload: object, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(data)


def run_preview_server() -> None:
    port = int(os.environ.get("PORT", "5000"))
    host = os.environ.get("HOST", "127.0.0.1")
    server = ThreadingHTTPServer((host, port), PreviewHandler)
    (BASE_DIR / "server.out.log").write_text(
        "Flask is not installed; running the built-in preview server instead.\n"
        f"Open http://{host}:{port}\n",
        encoding="utf-8",
    )
    server.serve_forever()


if __name__ == "__main__":
    try:
        run_flask()
    except ModuleNotFoundError as exc:
        if exc.name != "flask":
            raise
        try:
            run_preview_server()
        except Exception as preview_error:  # pragma: no cover - startup diagnostics
            (BASE_DIR / "server.err.log").write_text(repr(preview_error), encoding="utf-8")
            raise
