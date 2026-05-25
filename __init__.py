"""Top-level package for the node pack."""

from .src.nodes.prompt_layout_filler import (
    NODE_CLASS_MAPPINGS as PromptLayoutFillerMappings,
)
from .src.nodes.prompt_layout_filler import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptLayoutFillerDisplayMappings,
)
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
from .src.nodes.prompt_switch import (
    NODE_CLASS_MAPPINGS as PromptSwitchMappings,
)
from .src.nodes.prompt_switch import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptSwitchDisplayMappings,
)

NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(PromptPresetSelectorMappings)
NODE_CLASS_MAPPINGS.update(PromptOptionPickerMappings)
NODE_CLASS_MAPPINGS.update(PromptLayoutFillerMappings)
NODE_CLASS_MAPPINGS.update(PromptSwitchMappings)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPresetSelectorDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptOptionPickerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptLayoutFillerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptSwitchDisplayMappings)

# Node registration
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]

WEB_DIRECTORY = "./web"
