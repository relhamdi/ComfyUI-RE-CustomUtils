from .. import config


class PromptOptionPicker:
    """
    Presents a multiline list of options as a dropdown.
    One line = one option. Empty lines are allowed (displayed as '--', value is '').
    If the field is empty, no output is produced.
    """

    CATEGORY = config.NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "options": (
                    "STRING",
                    {
                        "multiline": True,
                        "tooltip": "One option per line. Empty line = empty value (displayed as --).",
                    },
                ),
                "selected": (
                    ["--"],
                    {
                        "tooltip": "Select an option.",
                    },
                ),
            },
            "optional": {
                "extra_options": (
                    "STRING",
                    {
                        "forceInput": True,
                        "tooltip": "External options prepended to the options field.",
                    },
                ),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("value",)
    FUNCTION = "process"

    @classmethod
    def VALIDATE_INPUTS(cls, options, **kwargs):
        if not options or not options.strip():
            return "options cannot be empty"
        return True

    def process(self, options, selected, extra_options=None):
        # -- displays an empty string
        return ("" if selected == "--" else selected,)


NODE_CLASS_MAPPINGS = {
    "PromptOptionPicker": PromptOptionPicker,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptOptionPicker": "Prompt Option Picker",
}
