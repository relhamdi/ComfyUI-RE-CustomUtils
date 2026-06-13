import json
import os

from .config import DATA_DIR, EMPTY_VALUE

BUILDERS_DIR = os.path.join(os.path.dirname(__file__), DATA_DIR, "builders")


def scan_files(base_dir: str, empty_label: str = EMPTY_VALUE) -> list[str]:
    """Recursively scan for JSON files, return paths relative to base_dir."""
    results = []
    for root, _, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".json"):
                rel = os.path.relpath(os.path.join(root, f), base_dir)
                results.append(rel.replace("\\", "/"))
    return sorted(results) or [empty_label]


def safe_relative_path(file: str) -> str | None:
    """Validate that file stays within a base dir, return normalized path or None."""
    norm = os.path.normpath(file)
    if norm.startswith("..") or os.path.isabs(norm):
        return None
    return norm


def load_json_file(base_dir: str, file: str) -> dict:
    path = os.path.join(base_dir, file)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json_file(base_dir: str, file: str, content: str) -> None:
    path = os.path.join(base_dir, file)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def delete_file(base_dir: str, file: str) -> None:
    path = os.path.join(base_dir, file)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    os.remove(path)


def load_builder_config(name: str) -> dict[str, list[str]]:
    """Load combo options from data/builders/<name>.json."""

    path = os.path.join(BUILDERS_DIR, f"{name}.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure each field starts with empty value
        return {
            k: ([EMPTY_VALUE] + v if v and v[0] != EMPTY_VALUE else v)
            for k, v in data.items()
        }
    except Exception as e:
        print(f"[BuilderConfig] Failed to load {name}.json: {e}")
        return {}


def get_builder_config_key(builder_config: dict, key: str):
    return builder_config.get(key, [EMPTY_VALUE])


def clean_val(s: str) -> str:
    """Clean and return given value, or "" if EMPTY_VALUE is found."""
    v = s.strip()
    return v if v and v != EMPTY_VALUE else ""
