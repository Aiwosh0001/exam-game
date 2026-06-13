from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env.image"
OUTPUT_DIR = BASE_DIR / "output" / "posters" / "gpt-image"


POSTER_PROMPTS = [
    (
        "poster-gpt-functional.png",
        """
        A4 portrait project poster visual design for a math roguelike intelligent website.
        Style: dark functional UI, tactical game interface, black background, white and yellow accents,
        clean modular layout, three screenshot placeholder frames, technical booklet design.
        Theme: math dungeon, knowledge rooms, roguelike weapons and buffs, three-core boss.
        Leave clear readable blank areas for Chinese text to be added later. Do not generate random text.
        """,
    ),
    (
        "poster-gpt-boss.png",
        """
        A4 portrait game project poster visual, dramatic boss battle theme.
        Background: HTML5 Canvas roguelike battlefield, three glowing mathematical cores,
        dark classroom-lab atmosphere, sharp tactical UI overlays, gold warning lines.
        Include structured empty panels for project intro, features, technology, design idea and team info.
        No random text, no watermark, no fake logos.
        """,
    ),
    (
        "poster-gpt-booklet.png",
        """
        A4 portrait clean workshop booklet poster for a student intelligent website project.
        Style: modern academic technology poster, light background, dark blue and yellow accents,
        organized grid layout matching: title, project intro, core features, technical implementation,
        design ideas, project achievements, team members, and screenshot frames.
        Leave text boxes blank or minimally marked; no unreadable generated text.
        """,
    ),
]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def normalize_base_url(value: str) -> str:
    base = value.strip().rstrip("/")
    if not base:
        raise RuntimeError("OPENAI_IMAGE_BASE_URL is empty.")
    if not base.endswith("/v1"):
        base += "/v1"
    return base


def request_image(prompt: str, *, size: str) -> bytes:
    api_key = os.environ.get("OPENAI_IMAGE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing OPENAI_IMAGE_API_KEY. Put it in .env.image or set it in the current terminal."
        )

    base_url = normalize_base_url(
        os.environ.get("OPENAI_IMAGE_BASE_URL", "https://api.openai.com/v1")
    )
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2")
    endpoint = f"{base_url}/images/generations"

    payload = {
        "model": model,
        "prompt": " ".join(prompt.split()),
        "size": size,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Image API request failed: HTTP {exc.code}\n{detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Image API request failed: {exc.reason}") from exc

    result = json.loads(body)
    item = result.get("data", [{}])[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=180) as image_response:
            return image_response.read()
    raise RuntimeError(f"Image API response did not contain b64_json or url: {body[:500]}")


def main() -> None:
    load_env_file(ENV_PATH)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    size = os.environ.get("OPENAI_IMAGE_SIZE", "1024x1536")
    only = os.environ.get("OPENAI_POSTER_ONLY", "").strip()
    prompts = POSTER_PROMPTS
    if only:
        try:
            selected_index = int(only) - 1
        except ValueError as exc:
            raise RuntimeError("OPENAI_POSTER_ONLY must be 1, 2, or 3.") from exc
        if selected_index < 0 or selected_index >= len(POSTER_PROMPTS):
            raise RuntimeError("OPENAI_POSTER_ONLY must be 1, 2, or 3.")
        prompts = [POSTER_PROMPTS[selected_index]]

    for index, (filename, prompt) in enumerate(prompts, start=1):
        print(f"[{index}/{len(prompts)}] generating {filename} ...")
        image_bytes = request_image(prompt, size=size)
        out_path = OUTPUT_DIR / filename
        out_path.write_bytes(image_bytes)
        print(out_path)
        time.sleep(0.5)


if __name__ == "__main__":
    main()
