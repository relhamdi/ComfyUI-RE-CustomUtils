import json
import os
from unittest.mock import MagicMock, patch

import pytest
from aiohttp import web
from src.nodes.style_loader import (
    STYLE_TEMPLATE,
    _apply_loras,
    _load_style,
    _safe_relative_path,
    _scan_style_files,
)

# --- Fixtures ---


@pytest.fixture
def styles_dir(tmp_path):
    return tmp_path


@pytest.fixture
def style_file(tmp_path):
    def _make(data: dict, name: str = "test.json", subdir: str | None = None):
        target = tmp_path / subdir if subdir else tmp_path
        target.mkdir(parents=True, exist_ok=True)
        path = target / name
        path.write_text(json.dumps(data), encoding="utf-8")
        return str(tmp_path)

    return _make


# --- _safe_relative_path ---


def test_safe_relative_path_simple():
    assert _safe_relative_path("anime.json") == "anime.json"


def test_safe_relative_path_subdir():
    result = _safe_relative_path("anime/illustrious.json")
    assert result == os.path.normpath("anime/illustrious.json")


def test_safe_relative_path_traversal():
    assert _safe_relative_path("../../etc/passwd") is None


def test_safe_relative_path_absolute():
    assert _safe_relative_path("/etc/passwd") is None


def test_safe_relative_path_dotdot_middle():
    result = _safe_relative_path("anime/../../../etc/passwd")
    assert result is None


# --- _scan_style_files ---


def test_scan_empty_dir(styles_dir):
    result = _scan_style_files(str(styles_dir))
    assert result == ["-- no styles found --"]


def test_scan_single_file(styles_dir):
    (styles_dir / "anime.json").write_text("{}")
    result = _scan_style_files(str(styles_dir))
    assert result == ["anime.json"]


def test_scan_subdir(styles_dir):
    sub = styles_dir / "realistic"
    sub.mkdir()
    (sub / "photon.json").write_text("{}")
    result = _scan_style_files(str(styles_dir))
    assert result == ["realistic/photon.json"]


def test_scan_ignores_non_json(styles_dir):
    (styles_dir / "readme.txt").write_text("hello")
    (styles_dir / "style.json").write_text("{}")
    result = _scan_style_files(str(styles_dir))
    assert result == ["style.json"]


def test_scan_sorted(styles_dir):
    for name in ["zebra.json", "alpha.json", "middle.json"]:
        (styles_dir / name).write_text("{}")
    result = _scan_style_files(str(styles_dir))
    assert result == ["alpha.json", "middle.json", "zebra.json"]


# --- _load_style ---


def test_load_style_basic(style_file):
    data = {"checkpoint": "model.safetensors", "cfg": 7.5}
    base_dir = style_file(data)
    with patch("src.nodes.style_loader.STYLES_DIR", base_dir):
        result = _load_style("test.json")
    assert result["checkpoint"] == "model.safetensors"
    assert result["cfg"] == 7.5


def test_load_style_not_found(tmp_path):
    with patch("src.nodes.style_loader.STYLES_DIR", str(tmp_path)):
        with pytest.raises(FileNotFoundError):
            _load_style("missing.json")


def test_load_style_subdir(style_file):
    data = {"checkpoint": "model.safetensors"}
    base_dir = style_file(data, name="photon.json", subdir="realistic")
    with patch("src.nodes.style_loader.STYLES_DIR", base_dir):
        result = _load_style("realistic/photon.json")
    assert result["checkpoint"] == "model.safetensors"


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
        rel = _safe_relative_path(file)
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
        rel = _safe_relative_path(file)
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
        rel = _safe_relative_path(file)
        if not rel:
            return web.json_response({"error": "Invalid file path."}, status=400)
        path = os.path.join(str(tmp_path), rel)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            return web.json_response({"content": content})
        except FileNotFoundError:
            return web.json_response({"error": "File not found."}, status=404)

    application = web.Application()
    application.router.add_post("/styles/save", save_handler)
    application.router.add_post("/styles/new", new_handler)
    application.router.add_get("/styles/load", load_handler)
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
