import json

from ..config import EMPTY_VALUE, NODE_CATEGORY
from ..utils import clean_prompt


class PromptMultiPicker:
    """
    Allows selecting multiple lines from a list and joining them with a separator.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "join": ("STRING", {"default": ", "}),
                "options": ("STRING", {"multiline": True, "default": ""}),
                "selected": ("STRING", {"default": "[]"}),
            },
            "optional": {
                "extra": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "process"
    CATEGORY = NODE_CATEGORY

    def process(self, join: str, options, selected, extra=""):
        # Parse selected indices
        try:
            selected_values = json.loads(selected) if selected else []
            if not isinstance(selected_values, list):
                selected_values = []
        except json.JSONDecodeError:
            selected_values = []

        # Get valid lines in order of appearance
        lines = [
            l.strip()
            for l in options.split("\n")
            if l.strip() and l.strip() != EMPTY_VALUE
        ]

        # Filter selected values preserving appearance order
        result_parts = [l for l in lines if l in selected_values]
        extra = extra.strip() if extra else ""

        if not result_parts:
            return (extra,)

        result = join.join(result_parts)

        # Chain with extra if provided
        if extra:
            result = clean_prompt(extra + join + result)
        return (result,)


NODE_CLASS_MAPPINGS = {
    "PromptMultiPicker": PromptMultiPicker,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptMultiPicker": "Prompt Multi Picker",
}
