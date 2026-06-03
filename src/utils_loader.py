import json
import os

from .config import EMPTY_VALUE


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
