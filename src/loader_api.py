import json
import os

from aiohttp import web

from server import PromptServer

from .utils_loader import (
    delete_file,
    load_json_file,
    safe_relative_path,
    save_json_file,
    scan_files,
)


def register_loader_routes(
    base_endpoint: str,
    base_dir: str,
    template: dict,
    asset_key: str,
):
    """Register the standard CRUD routes for a file-backed Loader node."""
    os.makedirs(base_dir, exist_ok=True)

    @PromptServer.instance.routes.get(f"{base_endpoint}/files")
    async def get_files(request: web.Request) -> web.Response:
        return web.json_response({asset_key: scan_files(base_dir)})

    @PromptServer.instance.routes.get(f"{base_endpoint}/load")
    async def load_content(request: web.Request) -> web.Response:
        try:
            file = request.rel_url.query.get("file", "")
            rel = safe_relative_path(file)
            if not rel:
                return web.json_response({"error": "Invalid file path."}, status=400)
            data = load_json_file(base_dir, rel)
            content = json.dumps(data, indent=2, ensure_ascii=False)
            return web.json_response({"content": content})
        except FileNotFoundError:
            return web.json_response({"error": "File not found."}, status=404)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.post(f"{base_endpoint}/save")
    async def save(request: web.Request) -> web.Response:
        try:
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

            save_json_file(base_dir, rel, content)
            return web.json_response({"ok": True})
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.post(f"{base_endpoint}/new")
    async def new(request: web.Request) -> web.Response:
        try:
            body = await request.json()
            file = body.get("file", "").strip()
            if not file:
                return web.json_response(
                    {"error": "File name is required."}, status=400
                )

            if not file.endswith(".json"):
                file += ".json"

            rel = safe_relative_path(file)
            if not rel:
                return web.json_response({"error": "Invalid file path."}, status=400)

            path = os.path.join(base_dir, rel)
            if os.path.exists(path):
                return web.json_response({"error": "File already exists."}, status=409)

            content = json.dumps(template, indent=2, ensure_ascii=False)
            save_json_file(base_dir, rel, content)
            return web.json_response(
                {"ok": True, "file": rel.replace("\\", "/"), "content": content}
            )
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.post(f"{base_endpoint}/delete")
    async def delete(request: web.Request) -> web.Response:
        try:
            body = await request.json()
            file = body.get("file", "")
            rel = safe_relative_path(file)
            if not rel:
                return web.json_response({"error": "Invalid file path."}, status=400)
            try:
                delete_file(base_dir, rel)
            except FileNotFoundError:
                return web.json_response({"error": "File not found."}, status=404)

            return web.json_response({"ok": True})
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
