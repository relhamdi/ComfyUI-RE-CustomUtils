from ..config import EMPTY_VALUE, NODE_CATEGORY
from ..utils import clean_prompt


class PromptAddOrReplace:
    """
    Adds or replaces the input string with the selected option.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "join": ("STRING", {"default": ", "}),
                "mode_toggle": (
                    "BOOLEAN",
                    {"default": True, "label_on": "Add", "label_off": "Replace"},
                ),
                "options": ("STRING", {"multiline": True, "default": ""}),
                "selected": ("STRING", {"default": ""}),
            },
            "optional": {
                "input": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "process"

    def process(self, join, mode_toggle, options, selected, input=""):
        v = selected.strip()
        if v == EMPTY_VALUE:
            v = ""
        inp = input.strip() if input else ""

        # If mode_toggle, mode = append, else replace
        if mode_toggle:
            if not v:
                return (inp,)
            if not inp:
                return (v,)
            return (clean_prompt(inp + join + v),)
        else:
            if not v:
                return ("",)
            return (v,)


NODE_CLASS_MAPPINGS = {
    "PromptAddOrReplace": PromptAddOrReplace,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptAddOrReplace": "Prompt Add or Replace",
}
