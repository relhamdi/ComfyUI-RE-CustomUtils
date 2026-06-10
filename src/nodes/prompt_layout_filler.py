import re

from ..config import NODE_CATEGORY
from ..utils import clean_prompt


class PromptLayoutFiller:
    """
    Fills a template with values injected into placeholders.
    Placeholder syntax: {0} or {0:label} where 0 is the slot index.
    Up to 10 slots supported (slot_0 to slot_9).
    Unconnected slots referenced in the template raise an error.
    """

    CATEGORY = NODE_CATEGORY
    NUM_SLOTS = 10

    PLACEHOLDER_PATTERN = re.compile(r"\{(\d+)(?::[^}]*)?\}")

    @classmethod
    def INPUT_TYPES(cls):
        inputs = {
            "required": {
                "template": (
                    "STRING",
                    {
                        "multiline": True,
                        "tooltip": "Template with placeholders. Ex: character, {0:position}, {1:background}",
                    },
                ),
                "cleanup": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "Clean up residual artifacts from empty slots.",
                    },
                ),
                "preset_data": ("STRING", {"default": "{}"}),
            },
            "optional": {
                f"slot_{i}": (
                    "STRING",
                    {
                        "forceInput": True,
                        "tooltip": f"Value for placeholder {{{i}}}.",
                    },
                )
                for i in range(cls.NUM_SLOTS)
            },
        }
        return inputs

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "process"

    # @classmethod
    # def VALIDATE_INPUTS(cls, template, **kwargs):
    #     # Tests done in the process() function to avoid errors
    #     ...

    def process(self, template, cleanup, preset_data, **kwargs):
        # Validate template
        if not template or not template.strip():
            raise ValueError("PromptLayoutFiller: template cannot be empty.")

        # Find all used indices
        used_indices = {
            int(m.group(1)) for m in self.PLACEHOLDER_PATTERN.finditer(template)
        }

        # Validate index range
        for idx in used_indices:
            if idx >= self.NUM_SLOTS:
                raise ValueError(
                    f"PromptLayoutFiller: placeholder {{{idx}}} exceeds "
                    f"maximum slot index (max is {self.NUM_SLOTS - 1})."
                )

        # Build slot map (None if not connected)
        slots = {i: kwargs.get(f"slot_{i}") for i in range(self.NUM_SLOTS)}

        # Validate all used slots are connected
        for idx in used_indices:
            if slots.get(idx) is None:
                raise ValueError(
                    f"PromptLayoutFiller: placeholder {{{idx}}} is used in the template "
                    f"but slot_{idx} is not connected."
                )

        def replace_placeholder(match: re.Match) -> str:
            return str(slots[int(match.group(1))])

        result = self.PLACEHOLDER_PATTERN.sub(replace_placeholder, template)

        if cleanup:
            result = clean_prompt(result)

        return (result,)


NODE_CLASS_MAPPINGS = {
    "PromptLayoutFiller": PromptLayoutFiller,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptLayoutFiller": "Prompt Layout Filler",
}
