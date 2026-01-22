import re

from .. import config


class PromptPresetSelector:
    """
    Selects a variant from inline prompt blocks of the form:
    {% option1 | option2 | option3 %}

    The selected option is injected based on the chosen preset index.
    Preset indices start at 1.
    """

    CATEGORY = config.NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "separator": (
                    "STRING",
                    {
                        "default": "|",
                        "tooltip": "Preset separator character",
                    },
                ),
                "preset_index": (
                    "INT",
                    {
                        "default": 1,
                        "min": 1,
                        "max": 50,
                        "step": 1,
                    },
                ),
                "text": ("STRING", {"multiline": True}),
            },
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("prompt", "preset_index")
    FUNCTION = "process"

    TEMPLATE_PATTERN = r"{%(.*?)%}"

    @classmethod
    def VALIDATE_INPUTS(cls, separator, preset_index, text):
        if not separator:
            return "Separator cannot be empty"

        blocks = re.findall(cls.TEMPLATE_PATTERN, text, re.DOTALL)

        expected_count = None
        for block in blocks:
            parts = [p.strip() for p in block.split(separator)]
            if expected_count is None:
                expected_count = len(parts)
            elif len(parts) != expected_count:
                return "All preset blocks must have the same number of options"

            if preset_index > len(parts):
                return f"Preset index {preset_index} out of range (max {len(parts)})"

        return True

    def process(self, separator, preset_index, text):
        def replace_block(match: re.Match[str]) -> str:
            content = match.group(1)
            parts = [p.strip() for p in content.split(separator)]

            # index is 1-based
            return parts[preset_index - 1]

        def cleanup(text: str) -> str:
            text = re.sub(r"\s+,", ",", text)
            text = re.sub(r",\s*,", ",", text)
            text = re.sub(r"\n\s*\n", "\n", text)
            return text.strip()

        result = re.sub(self.TEMPLATE_PATTERN, replace_block, text, flags=re.DOTALL)
        result = cleanup(result)

        return (result, preset_index)


NODE_CLASS_MAPPINGS = {
    "PromptPresetSelector": PromptPresetSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptPresetSelector": "Prompt Preset Selector",
}
