from ..config import EMPTY_VALUE, NODE_CATEGORY


class QuickCombo:
    """
    Creates a dropdown from a comma-separated list typed inline.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "one_based": (
                    "BOOLEAN",
                    {
                        "default": False,
                        "tooltip": "If True, index output starts at 1 instead of 0.",
                    },
                ),
                "options": (
                    "STRING",
                    {
                        "default": "",
                        "tooltip": "Comma-separated list. Ex: neutral, happy, sad",
                    },
                ),
                "selected": (
                    "STRING",
                    {
                        "default": EMPTY_VALUE,
                        "tooltip": "Internal — stores selected value.",
                    },
                ),
            },
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("value", "index")
    FUNCTION = "process"

    def _parse_options(self, raw: str) -> list[str]:
        return [o.strip() for o in raw.split(",") if o.strip()]

    def process(self, options, selected, one_based=False):
        parsed = self._parse_options(options)

        if not parsed:
            return ("", 0)

        value = "" if selected == EMPTY_VALUE else selected
        index = parsed.index(value) if value in parsed else 0

        if one_based:
            index += 1

        return (value, index)


NODE_CLASS_MAPPINGS = {
    "QuickCombo": QuickCombo,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "QuickCombo": "Quick Combo",
}
