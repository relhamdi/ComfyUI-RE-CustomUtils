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
                "syntax": (
                    "STRING",
                    {
                        "default": "{% | %}",
                        "tooltip": "Format: open_tag separator close_tag. Ex: {% | %}",
                    },
                ),
                "preset_index": (
                    "INT",
                    {
                        "default": 0,
                        "min": -1,
                        "max": 99,
                        "step": 1,
                        "tooltip": "0-based index of the preset to select.",
                    },
                ),
                "text": (
                    "STRING",
                    {
                        "multiline": True,
                        "tooltip": "Text with preset blocks.",
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
    def VALIDATE_INPUTS(cls, syntax, **kwargs):
        parts = syntax.split()
        if len(parts) != 3:
            return (
                f"Invalid syntax '{syntax}'. Expected: 'open_tag separator close_tag'"
            )
        open_tag, _, close_tag = parts
        if open_tag == close_tag:
            return "open_tag and close_tag must be different"
        return True

    def _parse_syntax(self, syntax: str) -> tuple[str, str, str]:
        """
        Parse the syntax string into (open_tag, separator, close_tag).
        Expected format: 'open_tag separator close_tag', ex: '{% | %}'
        """
        parts = syntax.split()
        if len(parts) != 3:
            raise ValueError(
                f"PromptPresetSelector: invalid syntax '{syntax}'. "
                "Expected format: 'open_tag separator close_tag', ex: '{% | %}'"
            )
        return parts[0], parts[1], parts[2]

    def _build_pattern(self, open_tag: str, close_tag: str) -> str:
        """Build the regex pattern from the configured tags."""
        return re.escape(open_tag) + r"\s*(.*?)\s*" + re.escape(close_tag)

    def _parse_blocks(self, text: str, pattern: str, separator: str) -> list[list[str]]:
        """Return all blocks as a list of option lists."""
        raw_blocks = re.findall(pattern, text, re.DOTALL)
        return [
            [p.strip() for p in block.strip().split(separator)] for block in raw_blocks
        ]

    def _validate(self, blocks: list[list[str]], preset_index: int) -> str | None:
        """
        Validate blocks consistency.
        Raises an error message string if an error is found, else None.
        """
        if not blocks:
            return None

        counts = [len(b) for b in blocks]
        min_count = min(counts)
        max_count = max(counts)

        if min_count != max_count:
            raise ValueError(
                f"PromptPresetSelector: blocks have inconsistent option counts "
                f"(found between {min_count} and {max_count})."
            )

        if preset_index >= max_count:
            raise ValueError(
                f"PromptPresetSelector: preset_index {preset_index} is out of range "
                f"(max index is {max_count - 1})."
            )

        return None

    def _replace_blocks(
        self,
        text: str,
        pattern: str,
        separator: str,
        preset_index: int,
    ) -> str:
        """Replace each block with the selected option."""

        def replace_block(match: re.Match) -> str:
            parts = [opt.strip() for opt in match.group(1).split(separator)]
            return parts[preset_index]

        return re.sub(pattern, replace_block, text, flags=re.DOTALL)

    def _clean_prompt(self, text: str) -> str:
        text = re.sub(r" +,", ",", text)  # spaces before commas
        text = re.sub(r",\s*,", ",", text)  # double or empty commas
        text = re.sub(r"\n\s*\n", "\n", text)  # empty lines
        return text.strip()

    def process(
        self,
        syntax: str,
        preset_index: int,
        text: str,
        cleanup: bool,
    ) -> tuple[str, int, int]:
        open_tag, separator, close_tag = self._parse_syntax(syntax)

        pattern = self._build_pattern(open_tag, close_tag)
        blocks = self._parse_blocks(text, pattern, separator)

        self._validate(blocks, preset_index)

        preset_count = max((len(b) for b in blocks), default=0)
        result = self._replace_blocks(text, pattern, separator, preset_index)

        if cleanup:
            result = self._clean_prompt(result)

        return (result, preset_index, preset_count)


NODE_CLASS_MAPPINGS = {
    "PromptPresetSelector": PromptPresetSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptPresetSelector": "Prompt Preset Selector",
}
