from ..config import NODE_CATEGORY
from ..utils import clean_prompt
from ..utils_loader import clean_val, get_builder_config_key, load_builder_config

_CFG = load_builder_config("face")


class PromptFaceBuilder:
    """
    Builds a face/expression prompt string from individual components.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "show_eyes": ("BOOLEAN", {"default": True}),
                "pupils": (get_builder_config_key(_CFG, "pupils"),),
                "eye_state": (get_builder_config_key(_CFG, "eye_state"),),
                "gaze": (get_builder_config_key(_CFG, "gaze"),),
                "show_eyewear": ("BOOLEAN", {"default": False}),
                "blush": (get_builder_config_key(_CFG, "blush"),),
                "mouth_state": (get_builder_config_key(_CFG, "mouth_state"),),
                "mouth_expression": (get_builder_config_key(_CFG, "mouth_expression"),),
                "emotion": (get_builder_config_key(_CFG, "emotion"),),
                "head_angle": (get_builder_config_key(_CFG, "head_angle"),),
                "preset_data": ("STRING", {"default": "{}"}),
            },
            "optional": {
                "eyes": ("STRING", {"forceInput": True}),
                "eye_type": ("STRING", {"forceInput": True}),
                "eyewear": ("STRING", {"forceInput": True}),
                "teeth": ("STRING", {"forceInput": True}),
                "eye_modifiers": ("STRING", {"forceInput": True}),
                "mouth_modifiers": ("STRING", {"forceInput": True}),
                "face_modifiers": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "build"

    def build(
        self,
        eyes,
        eye_type,
        eyewear,
        teeth,
        eye_modifiers,
        mouth_modifiers,
        face_modifiers,
        show_eyes,
        pupils,
        eye_state,
        gaze,
        show_eyewear,
        blush,
        mouth_state,
        mouth_expression,
        emotion,
        head_angle,
        preset_data,
    ):
        eye_parts = []
        if show_eyes:
            if v := clean_val(eyes):
                eye_parts.append(v)
            if v := clean_val(pupils):
                eye_parts.append(v)
            if v := clean_val(eye_type):
                eye_parts.append(v)
            if v := clean_val(eye_state):
                eye_parts.append(v)
        if v := clean_val(eye_state):
            eye_parts.append(v)
        if show_eyewear:
            if v := clean_val(eyewear):
                eye_parts.append(v)
        if v := clean_val(eye_modifiers):
            eye_parts.append(v)

        face_parts = []
        if show_eyes:
            if v := clean_val(gaze):
                face_parts.append(v)
        if v := clean_val(blush):
            face_parts.append(v)
        if v := clean_val(teeth):
            face_parts.append(v)
        if v := clean_val(mouth_state):
            face_parts.append(v)
        if v := clean_val(mouth_expression):
            face_parts.append(v)
        if v := clean_val(mouth_modifiers):
            face_parts.append(v)
        if v := clean_val(emotion):
            face_parts.append(v)
        if v := clean_val(head_angle):
            face_parts.append(v)

        face_modifiers_parts = []
        if v := clean_val(face_modifiers):
            face_modifiers_parts.append(v)

        parts = []
        if eye_parts:
            parts.append(f"({', '.join(eye_parts)})")
        if face_parts:
            parts.append(f"({', '.join(face_parts)})")
        if face_modifiers_parts:
            parts.append(f"({', '.join(face_modifiers_parts)})")

        return (clean_prompt(", ".join(parts)),)


NODE_CLASS_MAPPINGS = {
    "PromptFaceBuilder": PromptFaceBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptFaceBuilder": "Prompt Face Builder",
}
