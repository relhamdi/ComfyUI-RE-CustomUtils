from ..config import EMPTY_VALUE, NODE_CATEGORY


class PromptRouter:
    """
    Routes one of up to 10 connected STRING inputs to the output.
    The active input is selected via a dynamic dropdown,
    showing the title of each connected source node.
    """

    CATEGORY = NODE_CATEGORY
    NUM_INPUTS = 10

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "selected": (
                    "STRING",
                    {
                        "default": EMPTY_VALUE,
                        "tooltip": "Select the active input.",
                    },
                ),
                "_sub_selected": (
                    "STRING",
                    {
                        "default": EMPTY_VALUE,
                        "tooltip": "Internal use only.",
                    },
                ),
            },
            "optional": {
                f"input_{i}": ("STRING", {"forceInput": True})
                for i in range(cls.NUM_INPUTS)
            },
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("text", "index")
    FUNCTION = "process"

    def _build_mapping(self, prompt, unique_id, kwargs):
        """
        Build a mapping of {label: (input_name, index)} from the prompt graph.
        Label format: "N: title"
        """
        mapping = {}
        if prompt is None or unique_id is None:
            return mapping

        try:
            node_data = prompt[str(unique_id)]
            inputs = node_data.get("inputs", {})

            for i in range(self.NUM_INPUTS):
                input_name = f"input_{i}"
                if input_name not in kwargs:
                    continue

                link = inputs.get(input_name)
                if not link:
                    continue

                source_id = str(link[0])
                source_node = prompt.get(source_id)
                if not source_node:
                    continue

                title = source_node.get("_meta", {}).get("title")
                if not title:
                    title = source_node.get("class_type", source_id)

                # Build both variants, with and without indicator
                label = f"{i}: {title}"
                label_router = f"{i}: {title} ▶"
                entry = (input_name, i)
                mapping[label] = entry
                mapping[label_router] = entry  # Match both

        except Exception as e:
            raise ValueError(f"[PromptRouter] mapping error: {e}")

        return mapping

    def process(self, selected, _sub_selected, prompt=None, unique_id=None, **kwargs):
        # Remove internal widgets from kwargs
        kwargs.pop("_sub_source", None)

        if not selected or selected == EMPTY_VALUE:
            return ("", 0)

        mapping = self._build_mapping(prompt, unique_id, kwargs)
        entry = mapping.get(selected)

        if entry is None:
            return ("", 0)

        input_name, index = entry
        value = kwargs.get(input_name, "")
        return (value, index)


NODE_CLASS_MAPPINGS = {
    "PromptRouter": PromptRouter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptRouter": "Prompt Router",
}
