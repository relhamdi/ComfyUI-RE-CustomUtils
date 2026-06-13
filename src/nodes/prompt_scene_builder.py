from ..config import NODE_CATEGORY
from ..utils import clean_prompt
from ..utils_loader import clean_val, get_builder_config_key, load_builder_config

_CFG = load_builder_config("scene")


class PromptSceneBuilder:
    """
    Builds a scene prompt string from individual components.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "view": (get_builder_config_key(_CFG, "view"),),
                "angle": (get_builder_config_key(_CFG, "angle"),),
                "framing": (get_builder_config_key(_CFG, "framing"),),
                "time": (get_builder_config_key(_CFG, "time"),),
                "sky": (get_builder_config_key(_CFG, "sky"),),
                "location": (get_builder_config_key(_CFG, "location"),),
                "effect": (get_builder_config_key(_CFG, "effect"),),
                "preset_data": ("STRING", {"default": "{}"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "build"

    def build(
        self,
        view,
        angle,
        framing,
        time,
        sky,
        location,
        effect,
        preset_data,
    ):
        camera_parts = []
        if v := clean_val(view):
            camera_parts.append(v)
        if v := clean_val(angle):
            camera_parts.append(v)
        if v := clean_val(framing):
            camera_parts.append(v)

        scene_parts = []
        if v := clean_val(time):
            scene_parts.append(v)
        if v := clean_val(sky):
            scene_parts.append(v)
        if v := clean_val(location):
            scene_parts.append(v)

        effect_parts = []
        if v := clean_val(effect):
            effect_parts.append(v)

        parts = []
        if camera_parts:
            parts.append(f"({', '.join(camera_parts)})")
        if scene_parts:
            parts.append(f"({', '.join(scene_parts)})")
        if effect_parts:
            parts.append(f"({', '.join(effect_parts)})")

        return (clean_prompt(", ".join(parts)),)


NODE_CLASS_MAPPINGS = {
    "PromptSceneBuilder": PromptSceneBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptSceneBuilder": "Prompt Scene Builder",
}
