import re

from .. import config


class PromptPresetSelector:
    """
    Selects a variant from inline prompt blocks.

    Syntax: {open_tag} option_a | option_b | {close_tag}
    Default: {% option_a | option_b %}

    Rules:
    - All blocks must have the same number of options.
    - Empty presets are allowed: {% | something %} -> ("", "something")
    - Index is 0-based.
    """

    CATEGORY = config.NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": (
                    "STRING",
                    {
                        "multiline": True,
                        "tooltip": "Text with preset blocks.",
                    },
                ),
                "preset_index": (
                    "INT",
                    {
                        "default": 0,
                        "min": 0,
                        "max": 99,
                        "step": 1,
                        "tooltip": "0-based index of the preset to select.",
                    },
                ),
                "open_tag": (
                    "STRING",
                    {
                        "default": "{%",
                        "tooltip": "Opening tag for preset blocks.",
                    },
                ),
                "close_tag": (
                    "STRING",
                    {
                        "default": "%}",
                        "tooltip": "Closing tag for preset blocks.",
                    },
                ),
                "separator": (
                    "STRING",
                    {
                        "default": "|",
                        "tooltip": "Separator between presets. Spaces around it are mandatory.",
                    },
                ),
                "on_error": (
                    ["strict", "clamp", "empty"],
                    {
                        "default": "strict",
                        "tooltip": (
                            "strict: stops the workflow on error. "
                            "clamp: uses the last available preset. "
                            "empty: replaces the block with an empty string."
                        ),
                    },
                ),
                "cleanup": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "Clean up double commas and blank lines left by empty presets.",
                    },
                ),
            },
        }

    RETURN_TYPES = ("STRING", "INT", "INT")
    RETURN_NAMES = ("text", "preset_index", "preset_count")
    FUNCTION = "process"

    @classmethod
    def VALIDATE_INPUTS(cls, open_tag, close_tag, separator, **kwargs):
        if not open_tag or not open_tag.strip():
            return "open_tag cannot be empty"
        if not close_tag or not close_tag.strip():
            return "close_tag cannot be empty"
        if not separator or not separator.strip():
            return "separator cannot be empty"
        if open_tag == close_tag:
            return "open_tag and close_tag must be different"
        return True

    def _build_pattern(self, open_tag: str, close_tag: str) -> str:
        """Build the regex pattern from the configured tags."""
        return re.escape(open_tag) + r"\s*(.*?)\s*" + re.escape(close_tag)

    def _parse_blocks(self, text: str, pattern: str, separator: str) -> list[list[str]]:
        """Return all blocks as a list of option lists."""
        raw_blocks = re.findall(pattern, text, re.DOTALL)
        return [
            [p.strip() for p in block.strip().split(separator)] for block in raw_blocks
        ]

    def _validate(
        self,
        blocks: list[list[str]],
        preset_index: int,
        on_error: str,
    ) -> str | None:
        """
        Validate blocks consistency.
        Returns an error message string if strict mode and an error is found, else None.
        """
        if not blocks:
            return None

        counts = [len(b) for b in blocks]
        min_count = min(counts)
        max_count = max(counts)

        if min_count != max_count:
            msg = (
                f"PromptPresetSelector: blocks have inconsistent option counts "
                f"(found between {min_count} and {max_count})."
            )
            if on_error == "strict":
                raise ValueError(msg)

        if preset_index >= max_count:
            msg = (
                f"PromptPresetSelector: preset_index {preset_index} is out of range "
                f"(max index is {max_count - 1})."
            )
            if on_error == "strict":
                raise ValueError(msg)

        return None

    def _replace_blocks(
        self,
        text: str,
        pattern: str,
        separator: str,
        preset_index: int,
        on_error: str,
    ) -> str:
        """Replace each block with the selected option."""

        def replace_block(match: re.Match) -> str:
            parts = [opt.strip() for opt in match.group(1).split(separator)]
            count = len(parts)

            if preset_index >= count:
                if on_error == "clamp":
                    return parts[-1]
                else:  # empty
                    return ""

            return parts[preset_index]

        return re.sub(pattern, replace_block, text, flags=re.DOTALL)

    def _clean_prompt(self, text: str) -> str:
        text = re.sub(r" +,", ",", text)  # spaces before commas
        text = re.sub(r",\s*,", ",", text)  # double or empty commas
        text = re.sub(r"\n\s*\n", "\n", text)  # empty lines
        return text.strip()

    def process(
        self,
        text: str,
        preset_index: int,
        open_tag: str,
        close_tag: str,
        separator: str,
        on_error: str,
        cleanup: bool,
    ) -> tuple[str, int, int]:
        pattern = self._build_pattern(open_tag, close_tag)
        blocks = self._parse_blocks(text, pattern, separator)

        self._validate(blocks, preset_index, on_error)

        preset_count = max((len(b) for b in blocks), default=0)

        result = self._replace_blocks(text, pattern, separator, preset_index, on_error)

        if cleanup:
            result = self._clean_prompt(result)

        return (result, preset_index, preset_count)


NODE_CLASS_MAPPINGS = {
    "PromptPresetSelector": PromptPresetSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptPresetSelector": "Prompt Preset Selector",
}
