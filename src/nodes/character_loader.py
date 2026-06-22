import os

from ..config import API_ROOT, DATA_DIR, EMPTY_VALUE, NODE_CATEGORY
from ..loader_api import register_loader_routes
from ..utils_loader import (
    clean_val,
    get_builder_config_key,
    load_builder_config,
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
    "eye_type": EMPTY_VALUE,
    "eye_color": "",
    "pupils": EMPTY_VALUE,
    "eye_details": "",
    "eyewear": "",
    # Mouth
    "mouth_type": EMPTY_VALUE,
    "teeth": EMPTY_VALUE,
    # Hair
    "hair_color": "",
    "hair_style_options": "",
    "hair_style_selected": "",
    # Face details
    "face_details": "",
    "face_piercings": "",
    # Nails / Makeup
    "nail_type": EMPTY_VALUE,
    "nail_color": "",
    "makeup": "",
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
    "upper_details": "",
    # Mid body
    "stomach": EMPTY_VALUE,
    "narrow_waist": False,
    "muffin_top": False,
    "mid_details": "",
    # Lower body
    "lower_body": "",
    "hips": EMPTY_VALUE,
    "hip_dips": False,
    "thighs": EMPTY_VALUE,
    "lower_details": "",
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
                "eye_type": (get_builder_config_key(_CFG, "eye_type"),),
                "eye_color": ("STRING", {"default": ""}),
                "pupils": (get_builder_config_key(_CFG, "pupils"),),
                "eye_details": ("STRING", {"default": ""}),
                "eyewear": ("STRING", {"default": ""}),
                # Mouth
                "mouth_type": (get_builder_config_key(_CFG, "mouth_type"),),
                "teeth": (get_builder_config_key(_CFG, "teeth"),),
                # Hair
                "hair_color": ("STRING", {"default": ""}),
                "hair_style_options": ("STRING", {"multiline": True, "default": ""}),
                "hair_style_selected": ("STRING", {"default": ""}),
                # Face details
                "face_details": ("STRING", {"default": ""}),
                "face_piercings": ("STRING", {"default": ""}),
                # Nails / Makeup
                "nail_type": (get_builder_config_key(_CFG, "nail_type"),),
                "nail_color": ("STRING", {"default": ""}),
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
                "upper_details": ("STRING", {"default": ""}),
                # Mid body
                "stomach": (get_builder_config_key(_CFG, "stomach"),),
                "narrow_waist": ("BOOLEAN", {"default": False}),
                "muffin_top": ("BOOLEAN", {"default": False}),
                "mid_details": ("STRING", {"default": ""}),
                # Lower body
                "lower_body": ("STRING", {"default": ""}),
                "hips": (get_builder_config_key(_CFG, "hips"),),
                "hip_dips": ("BOOLEAN", {"default": False}),
                "thighs": (get_builder_config_key(_CFG, "thighs"),),
                "lower_details": ("STRING", {"default": ""}),
                # Butt
                "butt": (get_builder_config_key(_CFG, "butt"),),
            }
        }

    RETURN_TYPES = ("STRING",) * 28
    RETURN_NAMES = (
        # Eyes
        "eye_type",
        "eye_color",
        "pupils",
        "eye_details",
        "eyewear",
        # Mouth
        "mouth_type",
        "teeth",
        # Hair
        "hair_color",
        "hair_style",
        # Face details
        "face_details",
        "face_piercings",
        # Nails / Makeup
        "nail_type",
        "nail_color",
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
        "upper_details",
        "mid_body",
        "mid_details",
        "lower_body",
        "lower_details",
        "butt",
    )
    FUNCTION = "load_character"

    def load_character(
        self,
        character_file,
        eye_type,
        eye_color,
        pupils,
        eye_details,
        eyewear,
        mouth_type,
        teeth,
        hair_color,
        hair_style_options,
        hair_style_selected,
        face_details,
        face_piercings,
        nail_type,
        nail_color,
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
        upper_details,
        stomach,
        narrow_waist,
        muffin_top,
        mid_details,
        lower_body,
        hips,
        hip_dips,
        thighs,
        lower_details,
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
            clean_val(eye_type),
            clean_val(eye_color),
            clean_val(pupils),
            clean_val(eye_details),
            clean_val(eyewear),
            # Mouth
            clean_val(mouth_type),
            clean_val(teeth),
            # Hair
            clean_val(hair_color),
            clean_val(hair_style_selected),
            # Face details
            clean_val(face_details),
            clean_val(face_piercings),
            # Nails / Makeup
            clean_val(nail_type),
            clean_val(nail_color),
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
            clean_val(upper_details),
            mid_body_out,
            clean_val(mid_details),
            lower_body_out,
            clean_val(lower_details),
            clean_val(butt),
        )


# --- API Routes ---

register_loader_routes(BASE_ENDPOINT, CHARACTERS_DIR, CHARACTER_TEMPLATE, "characters")


# --- Registration ---

NODE_CLASS_MAPPINGS = {
    "CharacterLoader": CharacterLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterLoader": "Character Loader",
}
