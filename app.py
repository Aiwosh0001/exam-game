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
STATS_PATH = BASE_DIR / "data" / "stats.json"
LEADERBOARD_LIMIT = 10
DEFAULT_LEADERBOARD_NAME = "考生"
LEADERBOARD_SCORE_VERSION = "combat-time-v1"

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
        "bossCoreHp": 240,
        "eliteWeaponMultiplier": 1.25,
    },
}


def sanitize_leaderboard_name(value: object) -> str:
    text = " ".join(str(value or DEFAULT_LEADERBOARD_NAME).split())
    text = "".join(ch for ch in text if ch.isprintable() and ch not in "<>")
    return (text or DEFAULT_LEADERBOARD_NAME)[:12]


def clean_text_list(value: object, limit: int = 12) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        text = " ".join(str(item or "").split())
        text = "".join(ch for ch in text if ch.isprintable() and ch not in "<>")
        if text:
            items.append(text[:32])
    return items[:limit]


def route_type_for_rooms(room_count: int) -> str:
    if room_count <= 0:
        return "direct"
    if room_count >= 6:
        return "full"
    return "prepared"


def normalize_leaderboard_entry(entry: object) -> dict | None:
    if not isinstance(entry, dict):
        return None
    if entry.get("scoreVersion") != LEADERBOARD_SCORE_VERSION:
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
    completed_rooms = [str(room) for room in completed_rooms if room][:6]

    completed_room_keys = clean_text_list(entry.get("completedRoomKeys"), 6)
    completed_room_types = clean_text_list(entry.get("completedRoomTypes"), 6)
    weapon_ids = clean_text_list(entry.get("weaponIds"), 12)
    weapon_names = clean_text_list(entry.get("weaponNames"), 12)
    buffs = clean_text_list(entry.get("buffs"), 16)

    raw_route_type = str(entry.get("routeType") or "")
    route_type = raw_route_type if raw_route_type in {"direct", "prepared", "full"} else route_type_for_rooms(len(completed_rooms))
    final_weapon_id = clean_text_list([entry.get("finalWeaponId")], 1)
    final_weapon_name = clean_text_list([entry.get("finalWeaponName")], 1)
    boss_top_damage_weapon_id = clean_text_list([entry.get("bossTopDamageWeaponId")], 1)
    boss_top_damage_weapon_name = clean_text_list([entry.get("bossTopDamageWeaponName")], 1)
    try:
        boss_top_damage_weapon_damage = max(0, round(float(entry.get("bossTopDamageWeaponDamage", 0)), 1))
    except (TypeError, ValueError):
        boss_top_damage_weapon_damage = 0

    played_at = entry.get("playedAt")
    if not isinstance(played_at, str) or not played_at:
        played_at = ""

    raw_sword_only = entry.get("swordOnly")
    sword_only = raw_sword_only if isinstance(raw_sword_only, bool) else max(1, as_int("weaponsFound", 1)) <= 1 and not completed_rooms
    if sword_only and not weapon_ids:
        weapon_ids = ["sword"]

    return {
        "id": str(entry.get("id") or f"{played_at}-{score}"),
        "name": sanitize_leaderboard_name(entry.get("name")),
        "score": score,
        "seconds": max(1, as_int("seconds", 1)),
        "kills": as_int("kills", 0),
        "weaponsFound": max(1, as_int("weaponsFound", 1)),
        "hp": as_int("hp", 0),
        "maxHp": max(1, as_int("maxHp", 1)),
        "completedRooms": completed_rooms,
        "completedRoomKeys": completed_room_keys,
        "completedRoomTypes": completed_room_types,
        "routeType": route_type,
        "weaponIds": weapon_ids,
        "weaponNames": weapon_names,
        "buffs": buffs,
        "finalWeaponId": final_weapon_id[0] if final_weapon_id else "",
        "finalWeaponName": final_weapon_name[0] if final_weapon_name else "",
        "bossTopDamageWeaponId": boss_top_damage_weapon_id[0] if boss_top_damage_weapon_id else (final_weapon_id[0] if final_weapon_id else ""),
        "bossTopDamageWeaponName": boss_top_damage_weapon_name[0] if boss_top_damage_weapon_name else (final_weapon_name[0] if final_weapon_name else ""),
        "bossTopDamageWeaponDamage": boss_top_damage_weapon_damage,
        "swordOnly": sword_only,
        "playedAt": played_at,
        "scoreVersion": LEADERBOARD_SCORE_VERSION,
        "timeMode": "combat",
    }


def normalize_stats_entry(entry: object) -> dict | None:
    if not isinstance(entry, dict):
        return None
    if entry.get("scoreVersion") != LEADERBOARD_SCORE_VERSION:
        return None

    raw_result = str(entry.get("result") or entry.get("outcome") or "win").lower()
    result = "loss" if raw_result in {"loss", "fail", "failed", "death"} else "win"
    if result == "win":
        normalized = normalize_leaderboard_entry(entry)
        if not normalized:
            return None
        normalized["result"] = "win"
    else:
        def as_int(key: str, default: int) -> int:
            try:
                return max(0, round(float(entry.get(key, default))))
            except (TypeError, ValueError):
                return default

        try:
            score = max(0, round(float(entry.get("score", 0))))
        except (TypeError, ValueError):
            score = 0

        completed_rooms = entry.get("completedRooms")
        if not isinstance(completed_rooms, list):
            completed_rooms = []
        completed_rooms = [str(room) for room in completed_rooms if room][:6]

        completed_room_keys = clean_text_list(entry.get("completedRoomKeys"), 6)
        completed_room_types = clean_text_list(entry.get("completedRoomTypes"), 6)
        weapon_ids = clean_text_list(entry.get("weaponIds"), 12)
        weapon_names = clean_text_list(entry.get("weaponNames"), 12)
        buffs = clean_text_list(entry.get("buffs"), 16)

        raw_route_type = str(entry.get("routeType") or "")
        route_type = raw_route_type if raw_route_type in {"direct", "prepared", "full"} else route_type_for_rooms(len(completed_rooms))
        final_weapon_id = clean_text_list([entry.get("finalWeaponId")], 1)
        final_weapon_name = clean_text_list([entry.get("finalWeaponName")], 1)

        played_at = entry.get("playedAt")
        if not isinstance(played_at, str) or not played_at:
            played_at = ""

        normalized = {
            "id": str(entry.get("id") or f"{played_at}-{score}"),
            "name": sanitize_leaderboard_name(entry.get("name")),
            "score": score,
            "seconds": max(1, as_int("seconds", 1)),
            "kills": as_int("kills", 0),
            "weaponsFound": max(1, as_int("weaponsFound", 1)),
            "hp": as_int("hp", 0),
            "maxHp": max(1, as_int("maxHp", 1)),
            "completedRooms": completed_rooms,
            "completedRoomKeys": completed_room_keys,
            "completedRoomTypes": completed_room_types,
            "routeType": route_type,
            "weaponIds": weapon_ids or ["sword"],
            "weaponNames": weapon_names,
            "buffs": buffs,
            "finalWeaponId": final_weapon_id[0] if final_weapon_id else "",
            "finalWeaponName": final_weapon_name[0] if final_weapon_name else "",
            "swordOnly": bool(entry.get("swordOnly")) if isinstance(entry.get("swordOnly"), bool) else False,
            "playedAt": played_at,
            "scoreVersion": LEADERBOARD_SCORE_VERSION,
            "timeMode": "combat",
            "result": "loss",
        }

    death_room_key = clean_text_list([entry.get("deathRoomKey")], 1)
    death_room_name = clean_text_list([entry.get("deathRoomName")], 1)
    death_stage = clean_text_list([entry.get("deathStage")], 1)
    normalized["deathRoomKey"] = death_room_key[0] if death_room_key else ""
    normalized["deathRoomName"] = death_room_name[0] if death_room_name else ""
    normalized["deathStage"] = death_stage[0] if death_stage else ""
    return normalized


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


def default_stats() -> dict:
    return {
        "version": LEADERBOARD_SCORE_VERSION,
        "totalRuns": 0,
        "bossClears": 0,
        "failedRuns": 0,
        "directBossClears": 0,
        "preparedClears": 0,
        "fullPrepClears": 0,
        "fastestSeconds": 0,
        "longestSeconds": 0,
        "totalSeconds": 0,
        "totalRunSeconds": 0,
        "swordOnlyClears": 0,
        "bestScore": 0,
        "bestRemainingHp": 0,
        "bestRemainingHpMax": 0,
        "worstRemainingHp": 0,
        "worstRemainingHpMax": 0,
        "firepowerOverloadClears": 0,
        "mostRooms": 0,
        "totalKills": 0,
        "maxKills": 0,
        "maxWeaponsFound": 0,
        "totalRoomsCompleted": 0,
        "totalWeaponsFound": 0,
        "lastPlayedAt": "",
        "routeCounts": {"direct": 0, "prepared": 0, "full": 0},
        "weaponUseCounts": {},
        "finalWeaponCounts": {},
        "bossTopDamageWeaponCounts": {},
        "buffUseCounts": {},
        "roomClearCounts": {},
        "deathRoomCounts": {},
        "deathStageCounts": {},
        "entryIds": [],
    }


def normalize_count_map(value: object, limit: int = 80) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    items: list[tuple[str, int]] = []
    for raw_key, raw_count in value.items():
        key = " ".join(str(raw_key or "").split())
        key = "".join(ch for ch in key if ch.isprintable() and ch not in "<>")
        if not key:
            continue
        try:
            count = max(0, round(float(raw_count)))
        except (TypeError, ValueError):
            count = 0
        if count:
            items.append((key[:32], count))
    items.sort(key=lambda item: (-item[1], item[0]))
    return dict(items[:limit])


def increment_count(stats: dict, map_key: str, key: str, amount: int = 1) -> None:
    if not key:
        return
    counts = stats.setdefault(map_key, {})
    counts[key] = max(0, round(counts.get(key, 0))) + amount


def update_stats_with_entry(stats: dict, entry: dict) -> None:
    stats["totalRuns"] += 1
    stats["totalRunSeconds"] += entry["seconds"]
    if entry.get("result") == "loss":
        stats["failedRuns"] += 1
        death_room = entry.get("deathRoomKey") or entry.get("deathRoomName") or "unknown"
        death_stage = entry.get("deathStage") or "探索中断"
        increment_count(stats, "deathRoomCounts", death_room)
        increment_count(stats, "deathStageCounts", death_stage)
        if entry["playedAt"] and entry["playedAt"] > stats["lastPlayedAt"]:
            stats["lastPlayedAt"] = entry["playedAt"]
        return

    stats["bossClears"] += 1
    route_type = entry.get("routeType") or route_type_for_rooms(len(entry["completedRooms"]))
    if route_type == "direct":
        stats["directBossClears"] += 1
    elif route_type == "full":
        stats["fullPrepClears"] += 1
    else:
        stats["preparedClears"] += 1
    increment_count(stats, "routeCounts", route_type)
    stats["fastestSeconds"] = (
        entry["seconds"]
        if not stats["fastestSeconds"]
        else min(stats["fastestSeconds"], entry["seconds"])
    )
    stats["longestSeconds"] = max(stats["longestSeconds"], entry["seconds"])
    stats["totalSeconds"] += entry["seconds"]
    stats["swordOnlyClears"] += 1 if entry["swordOnly"] else 0
    stats["bestScore"] = max(stats["bestScore"], entry["score"])
    old_hp_ratio = stats["bestRemainingHp"] / max(1, stats["bestRemainingHpMax"])
    new_hp_ratio = entry["hp"] / max(1, entry["maxHp"])
    if new_hp_ratio > old_hp_ratio or (new_hp_ratio == old_hp_ratio and entry["hp"] > stats["bestRemainingHp"]):
        stats["bestRemainingHp"] = entry["hp"]
        stats["bestRemainingHpMax"] = entry["maxHp"]
    old_worst_hp_ratio = (
        stats["worstRemainingHp"] / max(1, stats["worstRemainingHpMax"])
        if stats["worstRemainingHpMax"]
        else None
    )
    if old_worst_hp_ratio is None or new_hp_ratio < old_worst_hp_ratio or (
        new_hp_ratio == old_worst_hp_ratio and entry["hp"] < stats["worstRemainingHp"]
    ):
        stats["worstRemainingHp"] = entry["hp"]
        stats["worstRemainingHpMax"] = entry["maxHp"]
    if max(entry["weaponsFound"], len(entry["weaponIds"])) >= 5:
        stats["firepowerOverloadClears"] += 1
    room_count = len(entry["completedRooms"])
    stats["mostRooms"] = max(stats["mostRooms"], room_count)
    stats["totalRoomsCompleted"] += room_count
    stats["totalKills"] += entry["kills"]
    stats["maxKills"] = max(stats["maxKills"], entry["kills"])
    stats["maxWeaponsFound"] = max(stats["maxWeaponsFound"], entry["weaponsFound"])
    stats["totalWeaponsFound"] += entry["weaponsFound"]

    room_keys = entry["completedRoomKeys"] or entry["completedRooms"]
    for room_key in set(room_keys):
        increment_count(stats, "roomClearCounts", room_key)
    for weapon_id in set(entry["weaponIds"]):
        increment_count(stats, "weaponUseCounts", weapon_id)
    final_weapon = entry["finalWeaponId"] or (entry["weaponIds"][-1] if entry["weaponIds"] else "")
    increment_count(stats, "finalWeaponCounts", final_weapon)
    top_damage_weapon = entry.get("bossTopDamageWeaponId") or final_weapon
    increment_count(stats, "bossTopDamageWeaponCounts", top_damage_weapon)
    for buff in set(entry["buffs"]):
        increment_count(stats, "buffUseCounts", buff)
    if entry["playedAt"] and entry["playedAt"] > stats["lastPlayedAt"]:
        stats["lastPlayedAt"] = entry["playedAt"]


def normalize_stats(value: object) -> dict:
    if not isinstance(value, dict):
        return default_stats()

    stats = default_stats()

    def as_int(key: str) -> int:
        try:
            return max(0, round(float(value.get(key, 0))))
        except (TypeError, ValueError):
            return 0

    stats["bossClears"] = as_int("bossClears")
    stats["failedRuns"] = as_int("failedRuns")
    stats["totalRuns"] = max(as_int("totalRuns"), stats["bossClears"] + stats["failedRuns"])
    stats["directBossClears"] = as_int("directBossClears")
    stats["preparedClears"] = as_int("preparedClears")
    stats["fullPrepClears"] = as_int("fullPrepClears")
    stats["fastestSeconds"] = as_int("fastestSeconds")
    stats["longestSeconds"] = as_int("longestSeconds")
    stats["totalSeconds"] = as_int("totalSeconds")
    stats["totalRunSeconds"] = max(as_int("totalRunSeconds"), stats["totalSeconds"])
    stats["swordOnlyClears"] = as_int("swordOnlyClears")
    stats["bestScore"] = as_int("bestScore")
    stats["bestRemainingHp"] = as_int("bestRemainingHp")
    stats["bestRemainingHpMax"] = as_int("bestRemainingHpMax")
    stats["worstRemainingHp"] = as_int("worstRemainingHp")
    stats["worstRemainingHpMax"] = as_int("worstRemainingHpMax")
    stats["firepowerOverloadClears"] = as_int("firepowerOverloadClears")
    stats["mostRooms"] = as_int("mostRooms")
    stats["totalKills"] = as_int("totalKills")
    stats["maxKills"] = as_int("maxKills")
    stats["maxWeaponsFound"] = as_int("maxWeaponsFound")
    stats["totalRoomsCompleted"] = as_int("totalRoomsCompleted")
    stats["totalWeaponsFound"] = as_int("totalWeaponsFound")
    stats["lastPlayedAt"] = value.get("lastPlayedAt") if isinstance(value.get("lastPlayedAt"), str) else ""
    stats["routeCounts"] = {
        "direct": as_int("directBossClears"),
        "prepared": as_int("preparedClears"),
        "full": as_int("fullPrepClears"),
        **normalize_count_map(value.get("routeCounts"), 6),
    }
    stats["weaponUseCounts"] = normalize_count_map(value.get("weaponUseCounts"))
    stats["finalWeaponCounts"] = normalize_count_map(value.get("finalWeaponCounts"))
    stats["bossTopDamageWeaponCounts"] = normalize_count_map(value.get("bossTopDamageWeaponCounts"))
    if not stats["bossTopDamageWeaponCounts"]:
        stats["bossTopDamageWeaponCounts"] = dict(stats["finalWeaponCounts"])
    stats["buffUseCounts"] = normalize_count_map(value.get("buffUseCounts"))
    stats["roomClearCounts"] = normalize_count_map(value.get("roomClearCounts"))
    stats["deathRoomCounts"] = normalize_count_map(value.get("deathRoomCounts"))
    stats["deathStageCounts"] = normalize_count_map(value.get("deathStageCounts"))
    entry_ids = value.get("entryIds")
    stats["entryIds"] = [str(entry_id) for entry_id in entry_ids[-1000:]] if isinstance(entry_ids, list) else []
    return stats


def stats_from_entries(entries: list[object]) -> dict:
    stats = default_stats()
    seen: set[str] = set()
    seen_ids: list[str] = []
    for entry in (normalize_leaderboard_entry(item) for item in entries):
        if not entry or entry["id"] in seen:
            continue
        seen.add(entry["id"])
        seen_ids.append(entry["id"])
        update_stats_with_entry(stats, entry)
    stats["entryIds"] = seen_ids[-1000:]
    return stats


def public_stats(stats: dict) -> dict:
    public = normalize_stats(stats)
    public.pop("entryIds", None)
    return public


def read_stats() -> dict:
    try:
        data = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return stats_from_entries(read_leaderboard())
    except (OSError, json.JSONDecodeError):
        return default_stats()
    return normalize_stats(data)


def write_stats(stats: dict) -> dict:
    normalized = normalize_stats(stats)
    STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATS_PATH.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return normalized


def add_stats_entry(entry: object) -> dict:
    normalized = normalize_stats_entry(entry)
    if not normalized:
        return read_stats()
    stats = read_stats()
    entry_ids = stats.get("entryIds", [])
    if normalized["id"] in entry_ids:
        return write_stats(stats)

    update_stats_with_entry(stats, normalized)
    stats["entryIds"] = [*entry_ids, normalized["id"]][-1000:]
    return write_stats(stats)


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
        payload = request.get_json(silent=True) or {}
        entries = add_leaderboard_entry(payload)
        add_stats_entry(payload)
        return jsonify({"entries": entries}), 201

    @app.get("/api/stats")
    def get_stats():
        return jsonify({"stats": public_stats(read_stats())})

    @app.post("/api/stats")
    def post_stats():
        stats = add_stats_entry(request.get_json(silent=True) or {})
        return jsonify({"stats": public_stats(stats)}), 201

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
            if request_path == "/api/stats":
                self._send_json({"stats": public_stats(read_stats())})
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
            if request_path not in {"/api/leaderboard", "/api/stats"}:
                self.send_error(404, "Not found")
                return
            length = int(self.headers.get("Content-Length", "0") or 0)
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {}
            if request_path == "/api/leaderboard":
                entries = add_leaderboard_entry(payload)
                add_stats_entry(payload)
                self._send_json({"entries": entries}, status=201)
                return
            self._send_json({"stats": public_stats(add_stats_entry(payload))}, status=201)
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
