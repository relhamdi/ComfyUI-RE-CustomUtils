import os

from aiohttp import web

from server import PromptServer

from ..config import API_ROOT, DATA_DIR, EMPTY_VALUE, NODE_CATEGORY
from ..loader_api import register_loader_routes
from ..utils_loader import (
    clean_val,
    load_json_file,
    scan_files,
)

# --- Constants ---

OUTFITS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), DATA_DIR, "outfits"
)

BASE_ENDPOINT = f"{API_ROOT}/outfits"

OUTFIT_PARTS = [
    "hat",
    "facewear",
    "neckwear",
    "coat",
    "midlayer",
    "top",
    "armwear",
    "accessories",
    "bottom",
    "legwear",
    "footwear",
]

OUTFIT_TEMPLATE = {
    "name": "",
    **{part: [EMPTY_VALUE] for part in OUTFIT_PARTS},
    "tags": [],
}

# --- Helpers ---


def _get_outfits_dir() -> str:
    os.makedirs(OUTFITS_DIR, exist_ok=True)
    return OUTFITS_DIR


# --- Node ---


class OutfitLoader:
    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "outfit_file": (scan_files(_get_outfits_dir()),),
                "tags_search": ("STRING", {"default": ""}),
                "name": ("STRING", {"default": ""}),
                "hat": ([EMPTY_VALUE],),
                "facewear": ([EMPTY_VALUE],),
                "neckwear": ([EMPTY_VALUE],),
                "coat": ([EMPTY_VALUE],),
                "midlayer": ([EMPTY_VALUE],),
                "top": ([EMPTY_VALUE],),
                "armwear": ([EMPTY_VALUE],),
                "accessories": ([EMPTY_VALUE],),
                "bottom": ([EMPTY_VALUE],),
                "legwear": ([EMPTY_VALUE],),
                "footwear": ([EMPTY_VALUE],),
                "tags": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",) * len(OUTFIT_PARTS)
    RETURN_NAMES = tuple(OUTFIT_PARTS)
    FUNCTION = "load_outfit"

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True

    def load_outfit(
        self,
        outfit_file,
        tags_search,
        name,
        hat,
        facewear,
        neckwear,
        coat,
        midlayer,
        top,
        armwear,
        accessories,
        bottom,
        legwear,
        footwear,
        tags,
    ):
        return (
            clean_val(hat),
            clean_val(facewear),
            clean_val(neckwear),
            clean_val(coat),
            clean_val(midlayer),
            clean_val(top),
            clean_val(armwear),
            clean_val(accessories),
            clean_val(bottom),
            clean_val(legwear),
            clean_val(footwear),
        )


# --- API Routes ---


register_loader_routes(BASE_ENDPOINT, OUTFITS_DIR, OUTFIT_TEMPLATE, "outfits")


@PromptServer.instance.routes.get(f"{BASE_ENDPOINT}/search_index")
async def get_search_index(request: web.Request) -> web.Response:
    index = []
    for file in scan_files(OUTFITS_DIR):
        if file == EMPTY_VALUE:
            continue
        try:
            data = load_json_file(OUTFITS_DIR, file)
            index.append(
                {
                    "file": file,
                    "name": data.get("name", ""),
                    "tags": data.get("tags", []),
                }
            )
        except Exception as e:
            print(f"[OutfitLoader] Failed to index {file}: {e}")
    return web.json_response({"index": index})


# --- Registration ---

NODE_CLASS_MAPPINGS = {
    "OutfitLoader": OutfitLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "OutfitLoader": "Outfit Loader",
}
