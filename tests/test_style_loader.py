import base64
import json
import os
from unittest.mock import MagicMock, patch

import pytest
from aiohttp import web
from src.nodes.style_loader import STYLE_TEMPLATE, _apply_loras
from src.utils_loader import safe_relative_path

# --- _apply_loras ---


def make_model_clip():
    return MagicMock(), MagicMock()


def test_apply_loras_empty():
    model, clip = make_model_clip()
    result_model, result_clip = _apply_loras(model, clip, [])
    assert result_model is model
    assert result_clip is clip


def test_apply_loras_skips_missing(capsys):
    model, clip = make_model_clip()
    with patch("folder_paths.get_full_path", return_value=None):
        result_model, result_clip = _apply_loras(
            model, clip, [{"name": "missing.safetensors"}]
        )
    captured = capsys.readouterr()
    assert "not found" in captured.out
    assert result_model is model
    assert result_clip is clip


def test_apply_loras_skips_empty_name():
    model, clip = make_model_clip()
    result_model, result_clip = _apply_loras(model, clip, [{"name": ""}])
    assert result_model is model
    assert result_clip is clip


def test_apply_loras_weight_fallback():
    model, clip = make_model_clip()
    fake_lora_sd = {}
    with (
        patch("folder_paths.get_full_path", return_value="/fake/lora.safetensors"),
        patch("comfy.utils.load_torch_file", return_value=fake_lora_sd),
        patch("comfy.sd.load_lora_for_models", return_value=(model, clip)) as mock_load,
    ):
        _apply_loras(model, clip, [{"name": "lora.safetensors", "weight": 0.8}])
    mock_load.assert_called_once_with(model, clip, fake_lora_sd, 0.8, 0.8)


def test_apply_loras_explicit_weights():
    model, clip = make_model_clip()
    fake_lora_sd = {}
    with (
        patch("folder_paths.get_full_path", return_value="/fake/lora.safetensors"),
        patch("comfy.utils.load_torch_file", return_value=fake_lora_sd),
        patch("comfy.sd.load_lora_for_models", return_value=(model, clip)) as mock_load,
    ):
        _apply_loras(
            model,
            clip,
            [{"name": "lora.safetensors", "model_weight": 0.7, "clip_weight": 0.4}],
        )
    mock_load.assert_called_once_with(model, clip, fake_lora_sd, 0.7, 0.4)


def test_apply_loras_chained():
    model1, clip1 = make_model_clip()
    model2, clip2 = make_model_clip()
    model3, clip3 = make_model_clip()
    fake_lora_sd = {}
    call_results = [(model2, clip2), (model3, clip3)]
    with (
        patch("folder_paths.get_full_path", return_value="/fake/lora.safetensors"),
        patch("comfy.utils.load_torch_file", return_value=fake_lora_sd),
        patch("comfy.sd.load_lora_for_models", side_effect=call_results),
    ):
        result_model, result_clip = _apply_loras(
            model1,
            clip1,
            [
                {"name": "lora1.safetensors", "weight": 0.8},
                {"name": "lora2.safetensors", "weight": 0.6},
            ],
        )
    assert result_model is model3
    assert result_clip is clip3


# --- STYLE_TEMPLATE ---


def test_style_template_has_required_keys():
    for key in [
        "checkpoint",
        "vae",
        "clip_skip",
        "loras",
        "quality_tags",
        "extra_quality_tags",
        "negative_tags",
        "steps",
        "refiner_step",
        "cfg",
    ]:
        assert key in STYLE_TEMPLATE


def test_style_template_loras_empty_list():
    assert STYLE_TEMPLATE["loras"] == []


def test_style_template_defaults():
    assert STYLE_TEMPLATE["clip_skip"] == -2
    assert STYLE_TEMPLATE["cfg"] == 4.0
    assert STYLE_TEMPLATE["steps"] == 15


# --- Routes ---


@pytest.fixture
def app(tmp_path):
    async def save_handler(request):
        body = await request.json()
        file = body.get("file", "")
        content = body.get("content", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            return web.json_response({"error": f"Invalid JSON: {e}"}, status=400)
        path = os.path.join(str(tmp_path), rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return web.json_response({"ok": True})

    async def new_handler(request):
        body = await request.json()
        file = body.get("file", "").strip()
        if not file:
            return web.json_response({"error": "File name is required."}, status=400)
        if not file.endswith(".json"):
            file += ".json"
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        path = os.path.join(str(tmp_path), rel)
        if os.path.exists(path):
            return web.json_response({"error": "File already exists."}, status=409)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        content = json.dumps(STYLE_TEMPLATE, indent=2, ensure_ascii=False)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return web.json_response(
            {"ok": True, "file": rel.replace("\\", "/"), "content": content}
        )

    async def load_handler(request):
        file = request.rel_url.query.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        path = os.path.join(str(tmp_path), rel)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            return web.json_response({"content": content})
        except FileNotFoundError:
            return web.json_response({"error": "File not found."}, status=404)

    async def delete_handler(request):
        body = await request.json()
        file = body.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        path = os.path.join(str(tmp_path), rel)
        if not os.path.isfile(path):
            return web.json_response({"error": "File not found."}, status=404)
        os.remove(path)
        return web.json_response({"ok": True})

    async def preview_handler(request):
        file = request.rel_url.query.get("file", "")
        rel = safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid path."}, status=400)

        base = os.path.splitext(os.path.join(str(tmp_path), rel))[0]
        for ext in [".png", ".jpg", ".webp", ".jpeg"]:
            path = base + ext
            if os.path.isfile(path):
                with open(path, "rb") as f:
                    data = f.read()
                b64 = base64.b64encode(data).decode()
                mime = (
                    "image/png"
                    if ext == ".png"
                    else "image/jpeg"
                    if ext in [".jpg", ".jpeg"]
                    else "image/webp"
                )
                return web.json_response({"image": f"data:{mime};base64,{b64}"})

        return web.json_response({"image": None})

    application = web.Application()
    application.router.add_post("/styles/save", save_handler)
    application.router.add_post("/styles/new", new_handler)
    application.router.add_get("/styles/load", load_handler)
    application.router.add_post("/styles/delete", delete_handler)
    application.router.add_get("/styles/preview", preview_handler)
    return application


@pytest.fixture
async def client(app, aiohttp_client):
    return await aiohttp_client(app)


# --- /styles/save ---


async def test_save_valid(client, tmp_path):
    content = json.dumps({"checkpoint": "model.safetensors"})
    resp = await client.post(
        "/styles/save", json={"file": "test.json", "content": content}
    )
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert (tmp_path / "test.json").exists()


async def test_save_invalid_json(client):
    resp = await client.post(
        "/styles/save", json={"file": "test.json", "content": "not json"}
    )
    assert resp.status == 400
    data = await resp.json()
    assert "Invalid JSON" in data["error"]


async def test_save_invalid_path(client):
    resp = await client.post(
        "/styles/save", json={"file": "../../evil.json", "content": "{}"}
    )
    assert resp.status == 400


async def test_save_creates_subdir(client, tmp_path):
    content = json.dumps({"checkpoint": "model.safetensors"})
    resp = await client.post(
        "/styles/save", json={"file": "anime/test.json", "content": content}
    )
    assert resp.status == 200
    assert (tmp_path / "anime" / "test.json").exists()


# --- /styles/new ---


async def test_new_creates_file(client, tmp_path):
    resp = await client.post("/styles/new", json={"file": "new_style"})
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert data["file"] == "new_style.json"
    assert (tmp_path / "new_style.json").exists()


async def test_new_adds_json_extension(client):
    resp = await client.post("/styles/new", json={"file": "mystyle"})
    data = await resp.json()
    assert data["file"].endswith(".json")


async def test_new_empty_name(client):
    resp = await client.post("/styles/new", json={"file": ""})
    assert resp.status == 400


async def test_new_conflict(client, tmp_path):
    (tmp_path / "existing.json").write_text("{}")
    resp = await client.post("/styles/new", json={"file": "existing.json"})
    assert resp.status == 409


async def test_new_template_valid_json(client):
    resp = await client.post("/styles/new", json={"file": "template_test"})
    data = await resp.json()
    parsed = json.loads(data["content"])
    assert "checkpoint" in parsed
    assert "loras" in parsed
    assert isinstance(parsed["loras"], list)


async def test_new_invalid_path(client):
    resp = await client.post("/styles/new", json={"file": "../../evil"})
    assert resp.status == 400


# --- /styles/load ---


async def test_load_existing(client, tmp_path):
    (tmp_path / "style.json").write_text('{"checkpoint": "model.safetensors"}')
    resp = await client.get("/styles/load?file=style.json")
    assert resp.status == 200
    data = await resp.json()
    assert "checkpoint" in data["content"]


async def test_load_not_found(client):
    resp = await client.get("/styles/load?file=missing.json")
    assert resp.status == 404


async def test_load_invalid_path(client):
    resp = await client.get("/styles/load?file=../../etc/passwd")
    assert resp.status == 400


# --- /styles/delete ---


async def test_delete_existing(client, tmp_path):
    (tmp_path / "to_delete.json").write_text("{}")
    resp = await client.post("/styles/delete", json={"file": "to_delete.json"})
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert not (tmp_path / "to_delete.json").exists()


async def test_delete_not_found(client):
    resp = await client.post("/styles/delete", json={"file": "missing.json"})
    assert resp.status == 404


async def test_delete_invalid_path(client):
    resp = await client.post("/styles/delete", json={"file": "../../evil.json"})
    assert resp.status == 400


# --- /styles/preview ---


async def test_preview_png_found(client, tmp_path):
    # Create a minimal 1x1 PNG
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    (tmp_path / "style.png").write_bytes(png_bytes)
    resp = await client.get("/styles/preview?file=style.json")
    assert resp.status == 200
    data = await resp.json()
    assert data["image"] is not None
    assert data["image"].startswith("data:image/png;base64,")


async def test_preview_jpg_found(client, tmp_path):
    # Minimal JPEG bytes
    jpg_bytes = bytes(
        [
            0xFF,
            0xD8,
            0xFF,
            0xE0,
            0x00,
            0x10,
            0x4A,
            0x46,
            0x49,
            0x46,
            0x00,
            0x01,
            0x01,
            0x00,
            0x00,
            0x01,
            0x00,
            0x01,
            0x00,
            0x00,
            0xFF,
            0xD9,
        ]
    )
    (tmp_path / "style.jpg").write_bytes(jpg_bytes)
    resp = await client.get("/styles/preview?file=style.json")
    assert resp.status == 200
    data = await resp.json()
    assert data["image"].startswith("data:image/jpeg;base64,")


async def test_preview_no_image(client, tmp_path):
    (tmp_path / "style.json").write_text("{}")
    resp = await client.get("/styles/preview?file=style.json")
    assert resp.status == 200
    data = await resp.json()
    assert data["image"] is None


async def test_preview_invalid_path(client):
    resp = await client.get("/styles/preview?file=../../etc/passwd")
    assert resp.status == 400


async def test_preview_subdir(client, tmp_path):
    sub = tmp_path / "anime"
    sub.mkdir()
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    (sub / "illustrious.png").write_bytes(png_bytes)
    resp = await client.get("/styles/preview?file=anime/illustrious.json")
    assert resp.status == 200
    data = await resp.json()
    assert data["image"] is not None
