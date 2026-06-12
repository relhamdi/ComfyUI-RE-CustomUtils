from ..config import EMPTY_VALUE, NODE_CATEGORY
from ..utils import clean_prompt


def _val(s: str) -> str:
    v = s.strip()
    return v if v and v != EMPTY_VALUE else ""


class PromptPoseBuilder:
    """
    Builds a pose/stance prompt string from individual components.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pov": ("BOOLEAN", {"default": False}),
                "framing_options": ("STRING", {"multiline": True, "default": ""}),
                "framing_selected": ("STRING", {"default": ""}),
                "stance_options": ("STRING", {"multiline": True, "default": ""}),
                "stance_selected": ("STRING", {"default": ""}),
                "contrapposto": ("BOOLEAN", {"default": False}),
                "action_options": ("STRING", {"multiline": True, "default": ""}),
                "action_selected": ("STRING", {"default": ""}),
                "action_extra_options": ("STRING", {"multiline": True, "default": ""}),
                "action_extra_selected": ("STRING", {"default": ""}),
                "holding_options": ("STRING", {"multiline": True, "default": ""}),
                "holding_selected": ("STRING", {"default": ""}),
                "extra_options": ("STRING", {"multiline": True, "default": ""}),
                "extra_selected": ("STRING", {"default": ""}),
                "preset_data": ("STRING", {"default": "{}"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "build"

    def build(
        self,
        preset_data,
        pov,
        framing_options,
        framing_selected,
        stance_options,
        stance_selected,
        contrapposto,
        action_options,
        action_selected,
        action_extra_options,
        action_extra_selected,
        holding_options,
        holding_selected,
        extra_options,
        extra_selected,
    ):
        movement_block = ", ".join(
            filter(
                None,
                [
                    "pov" if pov else "",
                    _val(framing_selected),
                    _val(stance_selected),
                    "contrapposto" if contrapposto else "",
                ],
            )
        )

        action_block = ", ".join(
            filter(
                None,
                [
                    _val(action_selected),
                    _val(action_extra_selected),
                ],
            )
        )

        holding_block = _val(holding_selected)
        extra_block = _val(extra_selected)

        parts = filter(
            None,
            [
                f"({movement_block})" if movement_block else "",
                f"({action_block})" if action_block else "",
                f"({holding_block})" if holding_block else "",
                f"({extra_block})" if extra_block else "",
            ],
        )

        result = ", ".join(parts)
        return (clean_prompt(result),)


NODE_CLASS_MAPPINGS = {
    "PromptPoseBuilder": PromptPoseBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptPoseBuilder": "Prompt Pose Builder",
}
