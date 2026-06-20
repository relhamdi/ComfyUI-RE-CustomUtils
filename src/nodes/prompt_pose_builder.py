from ..config import NODE_CATEGORY
from ..utils import clean_prompt
from ..utils_loader import clean_val, get_builder_config_key, load_builder_config

_CFG = load_builder_config("pose")


class PromptPoseBuilder:
    """
    Builds a pose/stance prompt string from individual components.
    """

    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "stance": (get_builder_config_key(_CFG, "stance"),),
                "posture": (get_builder_config_key(_CFG, "posture"),),
                "split_arms": ("BOOLEAN", {"default": False}),
                "arms": (get_builder_config_key(_CFG, "arms"),),
                "first_arm": (get_builder_config_key(_CFG, "arm"),),
                "second_arm": (get_builder_config_key(_CFG, "arm"),),
                "split_hands": ("BOOLEAN", {"default": False}),
                "hands": (get_builder_config_key(_CFG, "hands"),),
                "first_hand": (get_builder_config_key(_CFG, "hand"),),
                "second_hand": (get_builder_config_key(_CFG, "hand"),),
                "holding": (get_builder_config_key(_CFG, "holding"),),
                "legs": (get_builder_config_key(_CFG, "legs"),),
                "feet": (get_builder_config_key(_CFG, "feet"),),
                "show_body_details": ("BOOLEAN", {"default": True}),
                "show_upper_body": ("BOOLEAN", {"default": True}),
                "show_lower_body": ("BOOLEAN", {"default": True}),
                "action_options": ("STRING", {"multiline": True, "default": ""}),
                "action_selected": ("STRING", {"default": ""}),
                "preset_data": ("STRING", {"default": "{}"}),
            },
            "optional": {
                "base_body": ("STRING", {"forceInput": True}),
                "body_type": ("STRING", {"forceInput": True}),
                "body_piercings": ("STRING", {"forceInput": True}),
                "upper_body": ("STRING", {"forceInput": True}),
                "lower_body": ("STRING", {"forceInput": True}),
                "body_modifiers": ("STRING", {"forceInput": True}),
                "extra": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "build"

    def build(
        self,
        stance,
        posture,
        split_arms,
        arms,
        first_arm,
        second_arm,
        split_hands,
        hands,
        first_hand,
        second_hand,
        holding,
        legs,
        feet,
        show_body_details,
        show_upper_body,
        show_lower_body,
        action_options,
        action_selected,
        preset_data,
        base_body="",
        body_type="",
        body_piercings="",
        upper_body="",
        lower_body="",
        body_modifiers="",
        extra="",
    ):
        body_parts = []
        if v := clean_val(base_body):
            body_parts.append(v)
        if v := clean_val(body_type):
            body_parts.append(v)
        if show_body_details:
            if v := clean_val(body_piercings):
                body_parts.append(v)
        if show_upper_body:
            if v := clean_val(upper_body):
                body_parts.append(v)
        if show_lower_body:
            if v := clean_val(lower_body):
                body_parts.append(v)
        if v := clean_val(body_modifiers):
            body_parts.append(v)

        pose_parts = []
        if v := clean_val(stance):
            pose_parts.append(v)
        if v := clean_val(posture):
            pose_parts.append(v)

        if split_arms:
            if v := clean_val(first_arm):
                pose_parts.append(v)
            if v := clean_val(second_arm):
                pose_parts.append(v)
        else:
            if v := clean_val(arms):
                pose_parts.append(v)

        if split_hands:
            if v := clean_val(first_hand):
                pose_parts.append(v)
            if v := clean_val(second_hand):
                pose_parts.append(v)
        else:
            if v := clean_val(hands):
                pose_parts.append(v)

        if v := clean_val(holding):
            pose_parts.append(f"holding {v}")
        if v := clean_val(legs):
            pose_parts.append(v)
        if v := clean_val(feet):
            pose_parts.append(v)

        action_parts = []
        if v := clean_val(action_selected):
            action_parts.append(v)

        extra_parts = []
        if v := clean_val(extra):
            extra_parts.append(v)

        parts = []
        if body_parts:
            parts.append(f"({', '.join(body_parts)})")
        if pose_parts:
            parts.append(f"({', '.join(pose_parts)})")
        if action_parts:
            parts.append(f"({', '.join(action_parts)})")
        if extra_parts:
            parts.append(f"({', '.join(extra_parts)})")

        return (clean_prompt(", ".join(parts)),)


NODE_CLASS_MAPPINGS = {
    "PromptPoseBuilder": PromptPoseBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptPoseBuilder": "Prompt Pose Builder",
}
