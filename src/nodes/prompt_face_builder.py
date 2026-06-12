from ..config import EMPTY_VALUE, NODE_CATEGORY
from ..utils import clean_prompt


def _val(s: str) -> str:
    v = s.strip()
    return v if v and v != EMPTY_VALUE else ""


class PromptFaceBuilder:
    """
    Builds a face/expression prompt string from individual components.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "eyes": ("STRING", {"forceInput": True}),
                "show_eyes": ("BOOLEAN", {"default": True}),
                "eye_details_options": ("STRING", {"multiline": True, "default": ""}),
                "eye_details_selected": ("STRING", {"default": ""}),
                "eye_state_options": ("STRING", {"multiline": True, "default": ""}),
                "eye_state_selected": ("STRING", {"default": ""}),
                "gaze_options": ("STRING", {"multiline": True, "default": ""}),
                "gaze_selected": ("STRING", {"default": ""}),
                "show_eyewear": ("BOOLEAN", {"default": True}),
                "eyewear": ("STRING", {"forceInput": True}),
                "blush_options": ("STRING", {"multiline": True, "default": ""}),
                "blush_selected": ("STRING", {"default": ""}),
                "mouth_options": ("STRING", {"multiline": True, "default": ""}),
                "mouth_selected": ("STRING", {"default": ""}),
                "mouth_expression_options": (
                    "STRING",
                    {"multiline": True, "default": ""},
                ),
                "mouth_expression_selected": ("STRING", {"default": ""}),
                "expression_options": ("STRING", {"multiline": True, "default": ""}),
                "expression_selected": ("STRING", {"default": ""}),
                "head_tilt": ("BOOLEAN", {"default": False}),
                "preset_data": ("STRING", {"default": "{}"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "build"

    def build(
        self,
        eyes,
        show_eyes,
        eye_details_options,
        eye_details_selected,
        eye_state_options,
        eye_state_selected,
        gaze_options,
        gaze_selected,
        show_eyewear,
        eyewear,
        blush_options,
        blush_selected,
        mouth_options,
        mouth_selected,
        mouth_expression_options,
        mouth_expression_selected,
        expression_options,
        expression_selected,
        head_tilt,
        preset_data,
    ):
        eye_block = ", ".join(
            filter(
                None,
                [
                    eyes.strip() if show_eyes else "",
                    _val(eye_details_selected) if show_eyes else "",
                    _val(eye_state_selected),
                    eyewear.strip() if show_eyewear else "",
                ],
            )
        )

        face_block = ", ".join(
            filter(
                None,
                [
                    _val(gaze_selected) if show_eyes else "",
                    _val(blush_selected),
                    _val(mouth_selected),
                    _val(mouth_expression_selected),
                    _val(expression_selected),
                    "head tilt" if head_tilt else "",
                ],
            )
        )

        parts = filter(
            None,
            [
                f"({eye_block})" if eye_block else "",
                f"({face_block})" if face_block else "",
            ],
        )

        result = ", ".join(parts)
        return (clean_prompt(result),)


NODE_CLASS_MAPPINGS = {
    "PromptFaceBuilder": PromptFaceBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptFaceBuilder": "Prompt Face Builder",
}
