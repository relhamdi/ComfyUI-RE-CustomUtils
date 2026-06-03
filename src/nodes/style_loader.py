import json
import os

from aiohttp import web

import comfy.samplers
import comfy.sd
import comfy.utils
import folder_paths
from server import PromptServer

from ..config import NODE_CATEGORY
from ..utils_loader import (
    delete_file,
    load_json_file,
    safe_relative_path,
    save_json_file,
    scan_files,
)

# --- Constants ---

STYLES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "styles")

SAMPLER_NAMES = comfy.samplers.KSampler.SAMPLERS
SCHEDULER_NAMES = comfy.samplers.KSampler.SCHEDULERS

BASE_ENDPOINT = "/re-customutils/styles"


STYLE_TEMPLATE = {
    "checkpoint": "",
    "vae": "",
    "clip_skip": -2,
    "loras": [],
    "quality_tags": "",
    "negative_tags": "",
    "steps": 15,
    "refiner_step": 24,
    "cfg": 4.0,
}

# --- Helpers ---


def _get_styles_dir() -> str:
    os.makedirs(STYLES_DIR, exist_ok=True)
    return STYLES_DIR


def _load_checkpoint(checkpoint_name: str):
    path = folder_paths.get_full_path("checkpoints", checkpoint_name)
    if not path:
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_name}")
    return comfy.sd.load_checkpoint_guess_config(
        path,
        output_vae=True,
        output_clip=True,
        embedding_directory=folder_paths.get_folder_paths("embeddings"),
    )


def _load_vae(vae_name: str):
    path = folder_paths.get_full_path("vae", vae_name)
    if not path:
        raise FileNotFoundError(f"VAE not found: {vae_name}")
    sd = comfy.utils.load_torch_file(path)
    return comfy.sd.VAE(sd=sd)


def _apply_loras(model, clip, loras: list[dict]):
    for entry in loras:
        name = entry.get("name", "")
        if not name:
            continue
        weight = float(entry.get("weight", 1.0))
        model_weight = float(entry.get("model_weight", weight))
        clip_weight = float(entry.get("clip_weight", weight))

        path = folder_paths.get_full_path("loras", name)
        if not path:
            print(f"[StyleLoader] LoRA not found, skipping: {name}")
            continue

        lora_sd = comfy.utils.load_torch_file(path, safe_load=True)
        model, clip = comfy.sd.load_lora_for_models(
            model, clip, lora_sd, model_weight, clip_weight
        )
    return model, clip


# --- Node ---


class StyleLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "style_file": (scan_files(_get_styles_dir(), "-- no styles found --"),),
                "checkpoint": (folder_paths.get_filename_list("checkpoints"),),
                "vae": (
                    ["none"] + folder_paths.get_filename_list("vae"),
                    {"default": "none"},
                ),
                "clip_skip": (
                    "INT",
                    {
                        "default": -2,
                        "min": -24,
                        "max": -1,
                        "tooltip": "-1 = No clip skip",
                    },
                ),
                "loras_data": ("STRING", {"default": "[]"}),
                "quality_tags": ("STRING", {"multiline": True, "default": ""}),
                "negative_tags": ("STRING", {"multiline": True, "default": ""}),
                "steps": (
                    "INT",
                    {"default": STYLE_TEMPLATE["steps"], "min": 1, "max": 150},
                ),
                "refiner_step": (
                    "INT",
                    {"default": STYLE_TEMPLATE["refiner_step"], "min": 1, "max": 150},
                ),
                "cfg": (
                    "FLOAT",
                    {"default": STYLE_TEMPLATE["cfg"], "min": 0.0, "max": 30.0},
                ),
                "sampler": (SAMPLER_NAMES, {"default": "euler_ancestral"}),
                "scheduler": (SCHEDULER_NAMES, {"default": "normal"}),
            }
        }

    RETURN_TYPES = (
        "MODEL",
        "CLIP",
        "VAE",
        "STRING",
        "STRING",
        "INT",
        "INT",
        "FLOAT",
        SAMPLER_NAMES,
        SCHEDULER_NAMES,
    )
    RETURN_NAMES = (
        "model",
        "clip",
        "vae",
        "quality_tags",
        "negative_tags",
        "steps",
        "refiner_step",
        "cfg",
        "sampler",
        "scheduler",
    )
    FUNCTION = "load_style"
    CATEGORY = NODE_CATEGORY

    def load_style(
        self,
        style_file,
        checkpoint,
        vae,
        clip_skip,
        loras_data,
        quality_tags,
        negative_tags,
        steps,
        refiner_step,
        cfg,
        sampler,
        scheduler,
    ):
        model, clip, vae_from_ckpt, _ = _load_checkpoint(checkpoint)

        if clip is None:
            raise ValueError(f"Checkpoint '{checkpoint}' returned no CLIP.")

        vae_out = _load_vae(vae) if vae != "none" else vae_from_ckpt

        clip = clip.clone()
        # -1 -> No clip skip (default)
        if clip_skip != -1:
            clip.clip_layer(clip_skip)

        try:
            loras = json.loads(loras_data) if loras_data else []
        except json.JSONDecodeError:
            loras = []
        model, clip = _apply_loras(model, clip, loras)

        return (
            model,
            clip,
            vae_out,
            quality_tags,
            negative_tags,
            steps,
            refiner_step,
            cfg,
            sampler,
            scheduler,
        )


# --- API Routes ---


@PromptServer.instance.routes.get(f"{BASE_ENDPOINT}/assets")
async def get_assets(request: web.Request) -> web.Response:
    return web.json_response(
        {
            "checkpoints": folder_paths.get_filename_list("checkpoints"),
            "vae": folder_paths.get_filename_list("vae"),
            "loras": folder_paths.get_filename_list("loras"),
            "samplers": SAMPLER_NAMES,
            "schedulers": SCHEDULER_NAMES,
        }
    )


@PromptServer.instance.routes.get(f"{BASE_ENDPOINT}/load")
async def load_style_content(request: web.Request) -> web.Response:
    file = request.rel_url.query.get("file", "")
    rel = safe_relative_path(file)
    if not rel:
        return web.json_response({"error": "Invalid file path."}, status=400)
    try:
        data = load_json_file(STYLES_DIR, rel)
        content = json.dumps(data, indent=2, ensure_ascii=False)

        return web.json_response({"content": content})
    except FileNotFoundError:
        return web.json_response({"error": "File not found."}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/save")
async def save_style(request: web.Request) -> web.Response:
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

        save_json_file(STYLES_DIR, rel, content)
        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/new")
async def new_style(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        file = body.get("file", "").strip()
        if not file:
            return web.json_response({"error": "File name is required."}, status=400)

        # Ensure .json extension
        if not file.endswith(".json"):
            file += ".json"

        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)

        path = os.path.join(STYLES_DIR, rel)
        if os.path.exists(path):
            return web.json_response({"error": "File already exists."}, status=409)

        content = json.dumps(STYLE_TEMPLATE, indent=2, ensure_ascii=False)
        save_json_file(STYLES_DIR, rel, content)
        return web.json_response(
            {"ok": True, "file": rel.replace("\\", "/"), "content": content}
        )
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post(f"{BASE_ENDPOINT}/delete")
async def delete_style(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        file = body.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        try:
            delete_file(STYLES_DIR, rel)
        except FileNotFoundError:
            return web.json_response({"error": "File not found."}, status=404)

        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# --- Registration ---

NODE_CLASS_MAPPINGS = {
    "StyleLoader": StyleLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StyleLoader": "Style Loader",
}
