import json
import os
from unittest.mock import patch

import pytest
from src.utils_loader import (
    delete_file,
    load_json_file,
    safe_relative_path,
    save_json_file,
    scan_files,
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


# --- safe_relative_path ---


def test_safe_relative_path_simple():
    assert safe_relative_path("anime.json") == "anime.json"


def test_safe_relative_path_subdir():
    result = safe_relative_path("anime/illustrious.json")
    assert result == os.path.normpath("anime/illustrious.json")


def test_safe_relative_path_traversal():
    assert safe_relative_path("../../etc/passwd") is None


def test_safe_relative_path_absolute():
    assert safe_relative_path("/etc/passwd") is None


def test_safe_relative_path_dotdot_middle():
    result = safe_relative_path("anime/../../../etc/passwd")
    assert result is None


# --- scan_files ---


def test_scan_empty_dir(styles_dir):
    result = scan_files(str(styles_dir))
    assert result == ["--"]


def test_scan_single_file(styles_dir):
    (styles_dir / "anime.json").write_text("{}")
    result = scan_files(str(styles_dir))
    assert result == ["anime.json"]


def test_scan_subdir(styles_dir):
    sub = styles_dir / "realistic"
    sub.mkdir()
    (sub / "photon.json").write_text("{}")
    result = scan_files(str(styles_dir))
    assert result == ["realistic/photon.json"]


def test_scan_ignores_non_json(styles_dir):
    (styles_dir / "readme.txt").write_text("hello")
    (styles_dir / "style.json").write_text("{}")
    result = scan_files(str(styles_dir))
    assert result == ["style.json"]


def test_scan_sorted(styles_dir):
    for name in ["zebra.json", "alpha.json", "middle.json"]:
        (styles_dir / name).write_text("{}")
    result = scan_files(str(styles_dir))
    assert result == ["alpha.json", "middle.json", "zebra.json"]


# --- load_json_file ---


def test_load_style_basic(style_file):
    data = {"checkpoint": "model.safetensors", "cfg": 7.5}
    base_dir = style_file(data)
    with patch("src.nodes.style_loader.STYLES_DIR", base_dir):
        result = load_json_file(base_dir, "test.json")
    assert result["checkpoint"] == "model.safetensors"
    assert result["cfg"] == 7.5


def test_load_style_not_found(tmp_path):
    with patch("src.nodes.style_loader.STYLES_DIR", str(tmp_path)):
        with pytest.raises(FileNotFoundError):
            load_json_file(str(tmp_path), "missing.json")


def test_load_style_subdir(style_file):
    data = {"checkpoint": "model.safetensors"}
    base_dir = style_file(data, name="photon.json", subdir="realistic")
    with patch("src.nodes.style_loader.STYLES_DIR", base_dir):
        result = load_json_file(base_dir, "realistic/photon.json")
    assert result["checkpoint"] == "model.safetensors"


# --- save_json_file ---


def test_save_json_file_creates_file(tmp_path):
    save_json_file(str(tmp_path), "test.json", '{"key": "value"}')
    assert (tmp_path / "test.json").exists()
    assert json.loads((tmp_path / "test.json").read_text()) == {"key": "value"}


def test_save_json_file_creates_subdir(tmp_path):
    save_json_file(str(tmp_path), "sub/test.json", '{"key": "value"}')
    assert (tmp_path / "sub" / "test.json").exists()


def test_save_json_file_overwrites(tmp_path):
    (tmp_path / "test.json").write_text('{"old": true}')
    save_json_file(str(tmp_path), "test.json", '{"new": true}')
    assert json.loads((tmp_path / "test.json").read_text()) == {"new": True}


# --- delete_file ---


def test_delete_file_removes(tmp_path):
    (tmp_path / "test.json").write_text("{}")
    delete_file(str(tmp_path), "test.json")
    assert not (tmp_path / "test.json").exists()


def test_delete_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError):
        delete_file(str(tmp_path), "missing.json")
