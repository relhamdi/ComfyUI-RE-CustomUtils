"""Top-level package for the node pack."""

from .src.nodes.prompt_option_picker import (
    NODE_CLASS_MAPPINGS as PromptOptionPickerMappings,
)
from .src.nodes.prompt_option_picker import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptOptionPickerDisplayMappings,
)
from .src.nodes.prompt_preset_selector import (
    NODE_CLASS_MAPPINGS as PromptPresetSelectorMappings,
)
from .src.nodes.prompt_preset_selector import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptPresetSelectorDisplayMappings,
)

NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(PromptPresetSelectorMappings)
NODE_CLASS_MAPPINGS.update(PromptOptionPickerMappings)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPresetSelectorDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptOptionPickerDisplayMappings)

# Node registration
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]

WEB_DIRECTORY = "./web"
