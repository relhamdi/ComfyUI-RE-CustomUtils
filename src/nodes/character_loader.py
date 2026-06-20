import json
import os

from aiohttp import web

from server import PromptServer

from ..config import API_ROOT, DATA_DIR, EMPTY_VALUE, NODE_CATEGORY
from ..utils_loader import (
    clean_val,
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
    # Eyes
    "eye_color": "",
    "eye_type": EMPTY_VALUE,
    "pupils": EMPTY_VALUE,
    "eye_details": "",
    "eyewear": "",
    # Face
    "teeth": EMPTY_VALUE,
    "mouth_type": EMPTY_VALUE,
    "face_details": "",
    "face_piercings": "",
    # Hair
    "hair_color": "",
    "hair_style_options": "",
    "hair_style_selected": "",
    # Nails / Makeup
    "makeup": "",
    "nail_color": "",
    "nail_type": EMPTY_VALUE,
    # Accessories
    "facewear": "",
    "neckwear": "",
    "armwear": "",
    # Body base
    "base_body": EMPTY_VALUE,
    "body_type": EMPTY_VALUE,
    "skin_color": EMPTY_VALUE,
    "body_details": "",
    # Upper body
    "upper_body": "",
    "chest": EMPTY_VALUE,
    "chest_details": EMPTY_VALUE,
    "upper_piercings": "",
    # Mid body
    "stomach": EMPTY_VALUE,
    "narrow_waist": False,
    "muffin_top": False,
    "mid_piercings": "",
    # Lower body
    "lower_body": "",
    "hips": EMPTY_VALUE,
    "hip_dips": False,
    "thighs": EMPTY_VALUE,
    "lower_piercings": "",
    # Butt
    "butt": EMPTY_VALUE,
}

# --- Helpers ---


def _get_characters_dir() -> str:
    os.makedirs(CHARACTERS_DIR, exist_ok=True)
    return CHARACTERS_DIR


# --- Node ---


class CharacterLoader:
    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "character_file": (scan_files(_get_characters_dir()),),
                # Eyes
                "eye_color": ("STRING", {"default": ""}),
                "eye_type": (get_builder_config_key(_CFG, "eye_type"),),
                "pupils": (get_builder_config_key(_CFG, "pupils"),),
                "eye_details": ("STRING", {"default": ""}),
                "eyewear": ("STRING", {"default": ""}),
                # Face
                "teeth": (get_builder_config_key(_CFG, "teeth"),),
                "mouth_type": (get_builder_config_key(_CFG, "mouth_type"),),
                "face_details": ("STRING", {"default": ""}),
                "face_piercings": ("STRING", {"default": ""}),
                # Hair
                "hair_color": ("STRING", {"default": ""}),
                "hair_style_options": ("STRING", {"multiline": True, "default": ""}),
                "hair_style_selected": ("STRING", {"default": ""}),
                # Nails / Makeup
                "nail_color": ("STRING", {"default": ""}),
                "nail_type": (get_builder_config_key(_CFG, "nail_type"),),
                "makeup": ("STRING", {"default": ""}),
                # Accessories
                "facewear": ("STRING", {"default": ""}),
                "neckwear": ("STRING", {"default": ""}),
                "armwear": ("STRING", {"default": ""}),
                # Body base
                "base_body": (get_builder_config_key(_CFG, "base_body"),),
                "body_type": (get_builder_config_key(_CFG, "body_type"),),
                "skin_color": (get_builder_config_key(_CFG, "skin_color"),),
                "body_details": ("STRING", {"default": ""}),
                # Upper body
                "upper_body": ("STRING", {"default": ""}),
                "chest": (get_builder_config_key(_CFG, "chest"),),
                "chest_details": (get_builder_config_key(_CFG, "chest_details"),),
                "upper_piercings": ("STRING", {"default": ""}),
                # Mid body
                "stomach": (get_builder_config_key(_CFG, "stomach"),),
                "narrow_waist": ("BOOLEAN", {"default": False}),
                "muffin_top": ("BOOLEAN", {"default": False}),
                "mid_piercings": ("STRING", {"default": ""}),
                # Lower body
                "lower_body": ("STRING", {"default": ""}),
                "hips": (get_builder_config_key(_CFG, "hips"),),
                "hip_dips": ("BOOLEAN", {"default": False}),
                "thighs": (get_builder_config_key(_CFG, "thighs"),),
                "lower_piercings": ("STRING", {"default": ""}),
                # Butt
                "butt": (get_builder_config_key(_CFG, "butt"),),
            }
        }

    RETURN_TYPES = ("STRING",) * 28
    RETURN_NAMES = (
        # Eyes
        "eye_color",
        "eye_type",
        "pupils",
        "eye_details",
        "eyewear",
        # Face
        "teeth",
        "mouth_type",
        "face_details",
        "face_piercings",
        # Hair
        "hair_color",
        "hair_style",
        # Nails / Makeup
        "nail_color",
        "nail_type",
        "makeup",
        # Accessories
        "facewear",
        "neckwear",
        "armwear",
        # Body base
        "base_body",
        "body_type",
        "skin_color",
        "body_details",
        # Body groups
        "upper_body",
        "upper_piercings",
        "mid_body",
        "mid_piercings",
        "lower_body",
        "lower_piercings",
        "butt",
    )
    FUNCTION = "load_character"

    def load_character(
        self,
        character_file,
        eye_color,
        eye_type,
        pupils,
        eye_details,
        eyewear,
        teeth,
        mouth_type,
        face_details,
        face_piercings,
        hair_color,
        hair_style_options,
        hair_style_selected,
        nail_color,
        nail_type,
        makeup,
        facewear,
        neckwear,
        armwear,
        base_body,
        body_type,
        skin_color,
        body_details,
        upper_body,
        chest,
        chest_details,
        upper_piercings,
        stomach,
        narrow_waist,
        muffin_top,
        mid_piercings,
        lower_body,
        hips,
        hip_dips,
        thighs,
        lower_piercings,
        butt,
    ):
        # Upper body group
        upper_parts = [
            p
            for p in [
                clean_val(upper_body),
                clean_val(chest),
                clean_val(chest_details),
            ]
            if p
        ]
        upper_body_out = ", ".join(upper_parts)

        # Mid body group
        mid_parts = [p for p in [clean_val(stomach)] if p]
        if narrow_waist:
            mid_parts.append("narrow waist")
        if muffin_top:
            mid_parts.append("muffin top")
        mid_body_out = ", ".join(mid_parts)

        # Lower body group
        lower_parts = [
            p
            for p in [
                clean_val(lower_body),
                clean_val(hips),
            ]
            if p
        ]
        if hip_dips:
            lower_parts.append("hip dips")
        if v := clean_val(thighs):
            lower_parts.append(v)
        lower_body_out = ", ".join(lower_parts)

        return (
            # Eyes
            clean_val(eye_color),
            clean_val(eye_type),
            clean_val(pupils),
            clean_val(eye_details),
            clean_val(eyewear),
            # Face
            clean_val(teeth),
            clean_val(mouth_type),
            clean_val(face_details),
            clean_val(face_piercings),
            # Hair
            clean_val(hair_color),
            clean_val(hair_style_selected),
            # Nails / Makeup
            clean_val(nail_color),
            clean_val(nail_type),
            clean_val(makeup),
            # Accessories
            clean_val(facewear),
            clean_val(neckwear),
            clean_val(armwear),
            # Body base
            clean_val(base_body),
            clean_val(body_type),
            clean_val(skin_color),
            clean_val(body_details),
            # Body groups
            upper_body_out,
            clean_val(upper_piercings),
            mid_body_out,
            clean_val(mid_piercings),
            lower_body_out,
            clean_val(lower_piercings),
            clean_val(butt),
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
