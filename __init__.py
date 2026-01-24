"""Top-level package for the node pack."""

from .src.nodes.prompt_preset_selector import (
    NODE_CLASS_MAPPINGS as PromptPresetSelectorMappings,
)
from .src.nodes.prompt_preset_selector import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptPresetSelectorDisplayMappings,
)

NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(PromptPresetSelectorMappings)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPresetSelectorDisplayMappings)

# Node registration
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]

WEB_DIRECTORY = "./web"
