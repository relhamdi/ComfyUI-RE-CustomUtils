from ..config import EMPTY_VALUE, NODE_CATEGORY
from ..utils import parse_options


class PromptOptionPicker:
    """
    Presents a multiline list of options as a dropdown.
    One line = one option. Empty lines are allowed (displayed as '--', value is '').
    If the field is empty, no output is produced.
    Supports @combine / @end blocks for cartesian product generation.
    --- outside a block is treated as a literal option.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "options": (
                    "STRING",
                    {
                        "multiline": True,
                        "tooltip": (
                            "One option per line. Empty line = empty value (--).\n"
                            "Use @combine / --- / @end blocks for cartesian products."
                        ),
                    },
                ),
                "selected": (
                    [EMPTY_VALUE],
                    {
                        "tooltip": "Select an option.",
                    },
                ),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("value",)
    FUNCTION = "process"

    @classmethod
    def VALIDATE_INPUTS(cls, options, **kwargs):
        try:
            parse_options(options)
        except ValueError as e:
            return str(e)
        return True

    def process(self, options, selected):
        # -- displays an empty string
        value = "" if selected in (EMPTY_VALUE, "\u200b") else selected
        return (value,)


NODE_CLASS_MAPPINGS = {
    "PromptOptionPicker": PromptOptionPicker,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptOptionPicker": "Prompt Option Picker",
}
