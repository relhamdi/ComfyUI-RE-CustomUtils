"""Top-level package for the node pack."""

from src.nodes.prompt_layout_filler import (
    NODE_CLASS_MAPPINGS as PromptLayoutFillerMappings,
)
from src.nodes.prompt_layout_filler import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptLayoutFillerDisplayMappings,
)
from src.nodes.prompt_option_picker import (
    NODE_CLASS_MAPPINGS as PromptOptionPickerMappings,
)
from src.nodes.prompt_option_picker import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptOptionPickerDisplayMappings,
)
from src.nodes.prompt_preset_selector import (
    NODE_CLASS_MAPPINGS as PromptPresetSelectorMappings,
)
from src.nodes.prompt_preset_selector import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptPresetSelectorDisplayMappings,
)
from src.nodes.prompt_router import (
    NODE_CLASS_MAPPINGS as PromptRouterMappings,
)
from src.nodes.prompt_router import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptRouterDisplayMappings,
)
from src.nodes.prompt_switch import (
    NODE_CLASS_MAPPINGS as PromptSwitchMappings,
)
from src.nodes.prompt_switch import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptSwitchDisplayMappings,
)
from src.nodes.quick_combo import (
    NODE_CLASS_MAPPINGS as QuickComboMappings,
)
from src.nodes.quick_combo import (
    NODE_DISPLAY_NAME_MAPPINGS as QuickComboDisplayMappings,
)
from src.nodes.style_loader import (
    NODE_CLASS_MAPPINGS as StyleLoaderMappings,
)
from src.nodes.style_loader import (
    NODE_DISPLAY_NAME_MAPPINGS as StyleLoaderDisplayMappings,
)

NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(PromptPresetSelectorMappings)
NODE_CLASS_MAPPINGS.update(PromptOptionPickerMappings)
NODE_CLASS_MAPPINGS.update(PromptLayoutFillerMappings)
NODE_CLASS_MAPPINGS.update(PromptSwitchMappings)
NODE_CLASS_MAPPINGS.update(PromptRouterMappings)
NODE_CLASS_MAPPINGS.update(QuickComboMappings)
NODE_CLASS_MAPPINGS.update(StyleLoaderMappings)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPresetSelectorDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptOptionPickerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptLayoutFillerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptSwitchDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptRouterDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(QuickComboDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(StyleLoaderDisplayMappings)

# Node registration
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]

WEB_DIRECTORY = "./web"
