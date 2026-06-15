import json
import os
from unittest.mock import patch

import pytest
from aiohttp import web
from src.nodes.character_loader import CHARACTER_TEMPLATE, CharacterLoader
from src.utils_loader import safe_relative_path

_CFG = {
    "eye_type": ["--", "almond eyes"],
    "teeth": ["--", "teeth"],
    "nail_type": ["--", "long nails"],
    "base_body": ["--", "slim"],
    "upper_body": ["--", "large chest"],
}

with patch("src.nodes.character_loader.load_builder_config", return_value=_CFG):
    from src.nodes.character_loader import CharacterLoader


@pytest.fixture
def node():
    return CharacterLoader()


def run(node, **kwargs):
    defaults = dict(
        character_file="--",
        eyes="",
        eye_type="--",
        eyewear="",
        teeth="--",
        hair_color="",
        hair_style_options="",
        hair_style_selected="",
        facial_piercings="",
        nail_color="",
        nail_type="--",
        makeup="",
        base_body="--",
        body_type="",
        body_piercings="",
        upper_body="--",
        lower_body="",
    )
    defaults.update(kwargs)
    return node.load_character(**defaults)


# --- Base cases ---


def test_eyes_returned(node):
    result = run(node, eyes="blue eyes")
    assert result[0] == "blue eyes"


def test_eyes_stripped(node):
    result = run(node, eyes="  blue eyes  ")
    assert result[0] == "blue eyes"


def test_eye_type_returned(node):
    result = run(node, eye_type="almond eyes")
    assert result[1] == "almond eyes"


def test_eye_type_dash_returns_empty(node):
    result = run(node, eye_type="--")
    assert result[1] == ""


def test_eyewear_returned(node):
    result = run(node, eyewear="sunglasses")
    assert result[2] == "sunglasses"


def test_teeth_returned(node):
    result = run(node, teeth="teeth")
    assert result[3] == "teeth"


def test_teeth_dash_returns_empty(node):
    result = run(node, teeth="--")
    assert result[3] == ""


def test_hair_color_returned(node):
    result = run(node, hair_color="black hair")
    assert result[4] == "black hair"


def test_hair_style_selected_returned(node):
    result = run(node, hair_style_selected="long hair")
    assert result[5] == "long hair"


def test_facial_piercings_returned(node):
    result = run(node, facial_piercings="nose ring")
    assert result[6] == "nose ring"


def test_nail_color_returned(node):
    result = run(node, nail_color="red nails")
    assert result[7] == "red nails"


def test_nail_type_returned(node):
    result = run(node, nail_type="long nails")
    assert result[8] == "long nails"


def test_nail_type_dash_returns_empty(node):
    result = run(node, nail_type="--")
    assert result[8] == ""


def test_makeup_returned(node):
    result = run(node, makeup="red lipstick")
    assert result[9] == "red lipstick"


def test_base_body_returned(node):
    result = run(node, base_body="slim")
    assert result[10] == "slim"


def test_base_body_dash_returns_empty(node):
    result = run(node, base_body="--")
    assert result[10] == ""


def test_body_type_returned(node):
    result = run(node, body_type="tall")
    assert result[11] == "tall"


def test_body_piercings_returned(node):
    result = run(node, body_piercings="navel piercing")
    assert result[12] == "navel piercing"


def test_upper_body_returned(node):
    result = run(node, upper_body="large chest")
    assert result[13] == "large chest"


def test_upper_body_dash_returns_empty(node):
    result = run(node, upper_body="--")
    assert result[13] == ""


def test_lower_body_returned(node):
    result = run(node, lower_body="wide hips")
    assert result[14] == "wide hips"


def test_return_count(node):
    result = run(node)
    assert len(result) == 15


def test_all_empty(node):
    result = run(node)
    assert all(v == "" for v in result)


# --- CHARACTER_TEMPLATE ---


def test_character_template_has_required_keys():
    for key in [
        "eyes",
        "eye_type",
        "eyewear",
        "teeth",
        "hair_color",
        "hair_style_options",
        "hair_style_selected",
        "makeup",
        "nail_color",
        "nail_type",
        "facial_piercings",
        "base_body",
        "body_type",
        "body_piercings",
        "upper_body",
        "lower_body",
    ]:
        assert key in CHARACTER_TEMPLATE


def test_character_template_defaults():
    for key in [
        "eyes",
        "eyewear",
        "hair_color",
        "hair_style_options",
        "hair_style_selected",
        "makeup",
        "nail_color",
        "facial_piercings",
        "body_type",
        "body_piercings",
        "lower_body",
    ]:
        assert CHARACTER_TEMPLATE[key] == ""
    for key in [
        "eye_type",
        "teeth",
        "nail_type",
        "base_body",
        "upper_body",
    ]:
        assert CHARACTER_TEMPLATE[key] == "--"


# --- Fixtures ---


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
        content = json.dumps(CHARACTER_TEMPLATE, indent=2, ensure_ascii=False)
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

    application = web.Application()
    application.router.add_post("/characters/save", save_handler)
    application.router.add_post("/characters/new", new_handler)
    application.router.add_get("/characters/load", load_handler)
    application.router.add_post("/characters/delete", delete_handler)
    return application


@pytest.fixture
async def client(app, aiohttp_client):
    return await aiohttp_client(app)


# --- /characters/save ---


async def test_save_valid(client, tmp_path):
    content = json.dumps({"eyes": "blue eyes", "hair_type": "long hair"})
    resp = await client.post(
        "/characters/save", json={"file": "alice.json", "content": content}
    )
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert (tmp_path / "alice.json").exists()


async def test_save_invalid_json(client):
    resp = await client.post(
        "/characters/save", json={"file": "alice.json", "content": "not json"}
    )
    assert resp.status == 400
    data = await resp.json()
    assert "Invalid JSON" in data["error"]


async def test_save_invalid_path(client):
    resp = await client.post(
        "/characters/save", json={"file": "../../evil.json", "content": "{}"}
    )
    assert resp.status == 400


async def test_save_creates_subdir(client, tmp_path):
    content = json.dumps({"eyes": "red eyes"})
    resp = await client.post(
        "/characters/save", json={"file": "heroes/alice.json", "content": content}
    )
    assert resp.status == 200
    assert (tmp_path / "heroes" / "alice.json").exists()


# --- /characters/new ---


async def test_new_creates_file(client, tmp_path):
    resp = await client.post("/characters/new", json={"file": "alice"})
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert data["file"] == "alice.json"
    assert (tmp_path / "alice.json").exists()


async def test_new_adds_json_extension(client):
    resp = await client.post("/characters/new", json={"file": "bob"})
    data = await resp.json()
    assert data["file"].endswith(".json")


async def test_new_empty_name(client):
    resp = await client.post("/characters/new", json={"file": ""})
    assert resp.status == 400


async def test_new_conflict(client, tmp_path):
    (tmp_path / "existing.json").write_text("{}")
    resp = await client.post("/characters/new", json={"file": "existing.json"})
    assert resp.status == 409


async def test_new_template_has_expected_fields(client):
    resp = await client.post("/characters/new", json={"file": "template_test"})
    data = await resp.json()
    parsed = json.loads(data["content"])
    for field in [
        "eyes",
        "eye_type",
        "eyewear",
        "teeth",
        "hair_color",
        "hair_style_options",
        "hair_style_selected",
        "makeup",
        "nail_color",
        "nail_type",
        "facial_piercings",
        "base_body",
        "body_type",
        "body_piercings",
        "upper_body",
        "lower_body",
    ]:
        assert field in parsed


async def test_new_invalid_path(client):
    resp = await client.post("/characters/new", json={"file": "../../evil"})
    assert resp.status == 400


# --- /characters/load ---


async def test_load_existing(client, tmp_path):
    (tmp_path / "alice.json").write_text('{"eyes": "blue eyes"}')
    resp = await client.get("/characters/load?file=alice.json")
    assert resp.status == 200
    data = await resp.json()
    assert "blue eyes" in data["content"]


async def test_load_not_found(client):
    resp = await client.get("/characters/load?file=missing.json")
    assert resp.status == 404


async def test_load_invalid_path(client):
    resp = await client.get("/characters/load?file=../../etc/passwd")
    assert resp.status == 400


# --- /characters/delete ---


async def test_delete_existing(client, tmp_path):
    (tmp_path / "alice.json").write_text("{}")
    resp = await client.post("/characters/delete", json={"file": "alice.json"})
    assert resp.status == 200
    data = await resp.json()
    assert data["ok"] is True
    assert not (tmp_path / "alice.json").exists()


async def test_delete_not_found(client):
    resp = await client.post("/characters/delete", json={"file": "missing.json"})
    assert resp.status == 404


async def test_delete_invalid_path(client):
    resp = await client.post("/characters/delete", json={"file": "../../evil.json"})
    assert resp.status == 400
