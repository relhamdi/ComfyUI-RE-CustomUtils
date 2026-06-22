from ..config import NODE_CATEGORY
from ..utils import clean_prompt, override
from ..utils_loader import clean_val

SOURCE_MODES = ["both", "outfit", "character"]


def _merge_source(mode, character_val, outfit_val, join=", "):
    """
    mode: "both" | "outfit" | "character"
    """
    cv = clean_val(character_val)
    ov = clean_val(outfit_val)

    if mode == "character":
        return cv
    if mode == "outfit":
        return ov

    if cv and ov:
        return clean_prompt(cv + join + ov)

    return cv or ov


class OutfitBuilder:
    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "preset_data": ("STRING", {"default": "{}"}),
                "hat_override": ("STRING", {"default": ""}),
                "hat_override_mode": ("BOOLEAN", {"default": False}),
                "facewear_override": ("STRING", {"default": ""}),
                "facewear_override_mode": ("BOOLEAN", {"default": False}),
                "facewear_source": (SOURCE_MODES,),
                "neckwear_override": ("STRING", {"default": ""}),
                "neckwear_override_mode": ("BOOLEAN", {"default": False}),
                "neckwear_source": (SOURCE_MODES,),
                "coat_override": ("STRING", {"default": ""}),
                "coat_override_mode": ("BOOLEAN", {"default": False}),
                "midlayer_override": ("STRING", {"default": ""}),
                "midlayer_override_mode": ("BOOLEAN", {"default": False}),
                "top_override": ("STRING", {"default": ""}),
                "top_override_mode": ("BOOLEAN", {"default": False}),
                "armwear_override": ("STRING", {"default": ""}),
                "armwear_override_mode": ("BOOLEAN", {"default": False}),
                "armwear_source": (SOURCE_MODES,),
                "accessories_override": ("STRING", {"default": ""}),
                "accessories_override_mode": ("BOOLEAN", {"default": False}),
                "bottom_override": ("STRING", {"default": ""}),
                "bottom_override_mode": ("BOOLEAN", {"default": False}),
                "legwear_override": ("STRING", {"default": ""}),
                "legwear_override_mode": ("BOOLEAN", {"default": False}),
                "footwear_override": ("STRING", {"default": ""}),
                "footwear_override_mode": ("BOOLEAN", {"default": False}),
                "use_bypass": ("BOOLEAN", {"default": False}),
                "bypass_options": (
                    "STRING",
                    {"multiline": True, "default": ""},
                ),
                "bypass_selected": ("STRING", {"default": ""}),
            },
            "optional": {
                "hat": ("STRING", {"forceInput": True}),
                "facewear": ("STRING", {"forceInput": True}),
                "neckwear": ("STRING", {"forceInput": True}),
                "coat": ("STRING", {"forceInput": True}),
                "midlayer": ("STRING", {"forceInput": True}),
                "top": ("STRING", {"forceInput": True}),
                "armwear": ("STRING", {"forceInput": True}),
                "accessories": ("STRING", {"forceInput": True}),
                "bottom": ("STRING", {"forceInput": True}),
                "legwear": ("STRING", {"forceInput": True}),
                "footwear": ("STRING", {"forceInput": True}),
                "facewear_modifiers": ("STRING", {"forceInput": True}),
                "neckwear_modifiers": ("STRING", {"forceInput": True}),
                "armwear_modifiers": ("STRING", {"forceInput": True}),
                "top_modifiers": ("STRING", {"forceInput": True}),
                "bottom_modifiers": ("STRING", {"forceInput": True}),
                "outfit_modifiers": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("outfit",)
    FUNCTION = "build"

    def build(
        self,
        preset_data,
        hat_override,
        hat_override_mode,
        facewear_override,
        facewear_override_mode,
        facewear_source,
        neckwear_override,
        neckwear_override_mode,
        neckwear_source,
        coat_override,
        coat_override_mode,
        midlayer_override,
        midlayer_override_mode,
        top_override,
        top_override_mode,
        armwear_override,
        armwear_override_mode,
        armwear_source,
        accessories_override,
        accessories_override_mode,
        bottom_override,
        bottom_override_mode,
        legwear_override,
        legwear_override_mode,
        footwear_override,
        footwear_override_mode,
        use_bypass,
        bypass_options,
        bypass_selected,
        # Optional
        hat="",
        facewear="",
        neckwear="",
        coat="",
        midlayer="",
        top="",
        armwear="",
        accessories="",
        bottom="",
        legwear="",
        footwear="",
        facewear_modifiers="",
        neckwear_modifiers="",
        armwear_modifiers="",
        top_modifiers="",
        bottom_modifiers="",
        outfit_modifiers="",
    ):
        if use_bypass:
            return (clean_val(bypass_selected),)

        hat_out = override(hat_override, hat_override_mode, clean_val(hat))

        facewear_base = _merge_source(facewear_source, facewear_modifiers, facewear)
        facewear_out = override(
            facewear_override, facewear_override_mode, facewear_base
        )

        neckwear_base = _merge_source(neckwear_source, neckwear_modifiers, neckwear)
        neckwear_out = override(
            neckwear_override, neckwear_override_mode, neckwear_base
        )

        coat_out = override(coat_override, coat_override_mode, clean_val(coat))

        midlayer_out = override(
            midlayer_override, midlayer_override_mode, clean_val(midlayer)
        )

        top_out = override(top_override, top_override_mode, clean_val(top))

        armwear_base = _merge_source(armwear_source, armwear_modifiers, armwear)
        armwear_out = override(armwear_override, armwear_override_mode, armwear_base)

        accessories_out = override(
            accessories_override, accessories_override_mode, clean_val(accessories)
        )

        bottom_out = override(bottom_override, bottom_override_mode, clean_val(bottom))

        legwear_out = override(
            legwear_override, legwear_override_mode, clean_val(legwear)
        )

        footwear_out = override(
            footwear_override, footwear_override_mode, clean_val(footwear)
        )

        # --- Output assembly ---
        groups = []

        if v := clean_val(hat_out):
            groups.append(f"({v})")

        facewear_neckwear = [p for p in [facewear_out, neckwear_out] if p]
        if facewear_neckwear:
            groups.append(f"({', '.join(facewear_neckwear)})")

        if v := clean_val(coat_out):
            groups.append(f"({v})")

        if v := clean_val(midlayer_out):
            groups.append(f"({v})")

        top_group = [p for p in [top_out, clean_val(top_modifiers)] if p]
        if top_group:
            groups.append(f"({', '.join(top_group)})")

        if v := clean_val(armwear_out):
            groups.append(f"({v})")

        if v := clean_val(accessories_out):
            groups.append(f"({v})")

        bottom_group = [p for p in [bottom_out, clean_val(bottom_modifiers)] if p]
        if bottom_group:
            groups.append(f"({', '.join(bottom_group)})")

        if v := clean_val(legwear_out):
            groups.append(f"({v})")

        if v := clean_val(footwear_out):
            groups.append(f"({v})")

        if v := clean_val(outfit_modifiers):
            groups.append(f"({v})")

        outfit_out = clean_prompt(", ".join(groups))

        return (outfit_out,)


NODE_CLASS_MAPPINGS = {
    "OutfitBuilder": OutfitBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "OutfitBuilder": "Outfit Builder",
}
