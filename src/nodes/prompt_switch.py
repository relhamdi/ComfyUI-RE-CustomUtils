from .. import config


class PromptSwitch:
    """
    Routes one of two STRING inputs to the output based on a boolean condition.
    If condition is True, returns on_true. If False, returns on_false.
    If the node is bypassed, ComfyUI returns on_true by convention.
    """

    CATEGORY = config.NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "on_true": (
                    "STRING",
                    {
                        "tooltip": "Value returned when condition is True.",
                    },
                ),
                "on_false": (
                    "STRING",
                    {
                        "tooltip": "Value returned when condition is False.",
                    },
                ),
                "condition": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "If True, returns on_true. If False, returns on_false.",
                    },
                ),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "process"

    def process(self, on_true: str, on_false: str, condition: bool) -> tuple[str]:
        return (on_true if condition else on_false,)


NODE_CLASS_MAPPINGS = {
    "PromptSwitch": PromptSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptSwitch": "Prompt Switch",
}
