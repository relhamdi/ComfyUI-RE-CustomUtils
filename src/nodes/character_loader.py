import json
import os

from aiohttp import web

from server import PromptServer

from ..config import API_ROOT, DATA_DIR, EMPTY_VALUE, NODE_CATEGORY
from ..utils_loader import (
    delete_file,
    get_builder_config_key,
    load_builder_config,
    load_json_file,
    safe_relative_path,
    save_json_file,
    scan_files,
)

_CFG = load_builder_config("character")


# --- Constants ---

CHARACTERS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), DATA_DIR, "characters"
)

BASE_ENDPOINT = f"{API_ROOT}/characters"

CHARACTER_TEMPLATE = {
    "eyes": "",
    "eye_type": EMPTY_VALUE,
    "eyewear": "",
    "teeth": EMPTY_VALUE,
    "hair_color": "",
    "hair_style_options": "",
    "hair_style_selected": "",
    "makeup": "",
    "nails": "",
    "piercings": "",
    "body_type": "",
}

# --- Helpers ---


def _get_characters_dir() -> str:
    os.makedirs(CHARACTERS_DIR, exist_ok=True)
    return CHARACTERS_DIR


# --- Node ---


class CharacterLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "character_file": (scan_files(_get_characters_dir()),),
                "eyes": ("STRING", {"multiline": True, "default": ""}),
                "eye_type": (get_builder_config_key(_CFG, "eye_type"),),
                "eyewear": ("STRING", {"default": ""}),
                "teeth": (get_builder_config_key(_CFG, "teeth"),),
                "hair_color": ("STRING", {"default": ""}),
                "hair_style_options": ("STRING", {"multiline": True, "default": ""}),
                "hair_style_selected": ("STRING", {"default": ""}),
                "makeup": ("STRING", {"multiline": True, "default": ""}),
                "nails": ("STRING", {"default": ""}),
                "piercings": ("STRING", {"multiline": True, "default": ""}),
                "body_type": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = (
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
        "STRING",
    )
    RETURN_NAMES = (
        "eyes",
        "eye_type",
        "eyewear",
        "teeth",
        "hair_color",
        "hair_style",
        "makeup",
        "nails",
        "piercings",
        "body_type",
    )
    FUNCTION = "load_character"
    CATEGORY = NODE_CATEGORY

    def load_character(
        self,
        character_file,
        eyes,
        eye_type,
        eyewear,
        teeth,
        hair_color,
        hair_style_options,
        hair_style_selected,
        makeup,
        nails,
        piercings,
        body_type,
    ):
        eye_type_out = eye_type if eye_type and eye_type != EMPTY_VALUE else ""
        return (
            eyes.strip(),
            eye_type_out,
            eyewear.strip(),
            teeth,
            hair_color,
            hair_style_selected,
            makeup,
            nails,
            piercings,
            body_type,
        )


# --- API Routes ---


@PromptServer.instance.routes.get(f"{BASE_ENDPOINT}/assets")
async def get_assets(request: web.Request) -> web.Response:
    return web.json_response(
        {
            "characters": scan_files(_get_characters_dir()),
        }
    )


@PromptServer.instance.routes.get(f"{BASE_ENDPOINT}/load")
async def load_character_content(request: web.Request) -> web.Response:
    try:
        file = request.rel_url.query.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        data = load_json_file(CHARACTERS_DIR, rel)
        content = json.dumps(data, indent=2, ensure_ascii=False)

        return web.json_response({"content": content})
    except FileNotFoundError:
        return web.json_response({"error": "File not found."}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/save")
async def save_character(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        file = body.get("file", "")
        content = body.get("content", "")

        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)

        # Validate JSON before writing
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            return web.json_response({"error": f"Invalid JSON: {e}"}, status=400)

        save_json_file(CHARACTERS_DIR, rel, content)
        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/new")
async def new_character(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        file = body.get("file", "").strip()
        if not file:
            return web.json_response({"error": "File name is required."}, status=400)

        if not file.endswith(".json"):
            file += ".json"

        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)

        path = os.path.join(CHARACTERS_DIR, rel)
        if os.path.exists(path):
            return web.json_response({"error": "File already exists."}, status=409)

        content = json.dumps(CHARACTER_TEMPLATE, indent=2, ensure_ascii=False)
        save_json_file(CHARACTERS_DIR, rel, content)
        return web.json_response(
            {"ok": True, "file": rel.replace("\\", "/"), "content": content}
        )
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/delete")
async def delete_character(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        file = body.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        try:
            delete_file(CHARACTERS_DIR, rel)
        except FileNotFoundError:
            return web.json_response({"error": "File not found."}, status=404)

        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# --- Registration ---

NODE_CLASS_MAPPINGS = {
    "CharacterLoader": CharacterLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterLoader": "Character Loader",
}
