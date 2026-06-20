"""Top-level package for the node pack."""

from .src.nodes.break_encoder import (
    NODE_CLASS_MAPPINGS as BreakEncoderMappings,
)
from .src.nodes.break_encoder import (
    NODE_DISPLAY_NAME_MAPPINGS as BreakEncoderDisplayMappings,
)
from .src.nodes.character_builder import (
    NODE_CLASS_MAPPINGS as CharacterBuilderMappings,
)
from .src.nodes.character_builder import (
    NODE_DISPLAY_NAME_MAPPINGS as CharacterBuilderDisplayMappings,
)
from .src.nodes.character_loader import (
    NODE_CLASS_MAPPINGS as CharacterLoaderMappings,
)
from .src.nodes.character_loader import (
    NODE_DISPLAY_NAME_MAPPINGS as CharacterLoaderDisplayMappings,
)
from .src.nodes.prompt_add_or_replace import (
    NODE_CLASS_MAPPINGS as PromptAddOrReplaceMappings,
)
from .src.nodes.prompt_add_or_replace import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptAddOrReplaceDisplayMappings,
)
from .src.nodes.prompt_face_builder import (
    NODE_CLASS_MAPPINGS as PromptFaceBuilderMappings,
)
from .src.nodes.prompt_face_builder import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptFaceBuilderDisplayMappings,
)
from .src.nodes.prompt_layout_filler import (
    NODE_CLASS_MAPPINGS as PromptLayoutFillerMappings,
)
from .src.nodes.prompt_layout_filler import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptLayoutFillerDisplayMappings,
)
from .src.nodes.prompt_multi_picker import (
    NODE_CLASS_MAPPINGS as PromptMultiPickerMappings,
)
from .src.nodes.prompt_multi_picker import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptMultiPickerDisplayMappings,
)
from .src.nodes.prompt_option_picker import (
    NODE_CLASS_MAPPINGS as PromptOptionPickerMappings,
)
from .src.nodes.prompt_option_picker import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptOptionPickerDisplayMappings,
)
from .src.nodes.prompt_pose_builder import (
    NODE_CLASS_MAPPINGS as PromptPoseBuilderMappings,
)
from .src.nodes.prompt_pose_builder import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptPoseBuilderDisplayMappings,
)
from .src.nodes.prompt_preset_selector import (
    NODE_CLASS_MAPPINGS as PromptPresetSelectorMappings,
)
from .src.nodes.prompt_preset_selector import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptPresetSelectorDisplayMappings,
)
from .src.nodes.prompt_router import (
    NODE_CLASS_MAPPINGS as PromptRouterMappings,
)
from .src.nodes.prompt_router import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptRouterDisplayMappings,
)
from .src.nodes.prompt_scene_builder import (
    NODE_CLASS_MAPPINGS as PromptSceneBuilderMappings,
)
from .src.nodes.prompt_scene_builder import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptSceneBuilderDisplayMappings,
)
from .src.nodes.prompt_switch import (
    NODE_CLASS_MAPPINGS as PromptSwitchMappings,
)
from .src.nodes.prompt_switch import (
    NODE_DISPLAY_NAME_MAPPINGS as PromptSwitchDisplayMappings,
)
from .src.nodes.quick_combo import (
    NODE_CLASS_MAPPINGS as QuickComboMappings,
)
from .src.nodes.quick_combo import (
    NODE_DISPLAY_NAME_MAPPINGS as QuickComboDisplayMappings,
)
from .src.nodes.style_loader import (
    NODE_CLASS_MAPPINGS as StyleLoaderMappings,
)
from .src.nodes.style_loader import (
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
NODE_CLASS_MAPPINGS.update(CharacterLoaderMappings)
NODE_CLASS_MAPPINGS.update(BreakEncoderMappings)
NODE_CLASS_MAPPINGS.update(PromptFaceBuilderMappings)
NODE_CLASS_MAPPINGS.update(PromptPoseBuilderMappings)
NODE_CLASS_MAPPINGS.update(PromptSceneBuilderMappings)
NODE_CLASS_MAPPINGS.update(PromptMultiPickerMappings)
NODE_CLASS_MAPPINGS.update(PromptAddOrReplaceMappings)
NODE_CLASS_MAPPINGS.update(CharacterBuilderMappings)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPresetSelectorDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptOptionPickerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptLayoutFillerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptSwitchDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptRouterDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(QuickComboDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(StyleLoaderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(CharacterLoaderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(BreakEncoderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptFaceBuilderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptPoseBuilderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptSceneBuilderDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptMultiPickerDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(PromptAddOrReplaceDisplayMappings)
NODE_DISPLAY_NAME_MAPPINGS.update(CharacterBuilderDisplayMappings)

# Node registration
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]

WEB_DIRECTORY = "./web"
