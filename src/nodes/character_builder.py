from ..config import NODE_CATEGORY
from ..utils import clean_prompt
from ..utils_loader import clean_val


def _override(override_val, override_mode, base_val, join=", "):
    """
    Apply toggle override logic.
    override_mode=False (add): base + override
    override_mode=True (replace): override replaces base (or base if override empty)
    """
    ov = clean_val(override_val)
    bv = clean_val(base_val)

    # Replace mode
    if override_mode:
        return ov

    # Add mode
    if bv and ov:
        return clean_prompt(bv + join + ov)

    return bv or ov


class CharacterBuilder:
    CATEGORY = NODE_CATEGORY

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "preset_data": ("STRING", {"default": "{}"}),
                # Eyes toggles
                "show_eyes": ("BOOLEAN", {"default": True}),
                "show_eyeballs": ("BOOLEAN", {"default": True}),
                "eyes_override": ("STRING", {"default": ""}),
                "eyes_override_mode": ("BOOLEAN", {"default": False}),
                "eyewear_override": ("STRING", {"default": ""}),
                "eyewear_override_mode": ("BOOLEAN", {"default": False}),
                # Face
                "face_details_override": ("STRING", {"default": ""}),
                "face_details_override_mode": ("BOOLEAN", {"default": False}),
                # Hair
                "bald": ("BOOLEAN", {"default": False}),
                # Piercings
                "show_piercings": ("BOOLEAN", {"default": True}),
                "face_piercings_override": ("STRING", {"default": ""}),
                "face_piercings_override_mode": ("BOOLEAN", {"default": False}),
                "upper_piercings_override": ("STRING", {"default": ""}),
                "upper_piercings_override_mode": ("BOOLEAN", {"default": False}),
                "mid_piercings_override": ("STRING", {"default": ""}),
                "mid_piercings_override_mode": ("BOOLEAN", {"default": False}),
                "lower_piercings_override": ("STRING", {"default": ""}),
                "lower_piercings_override_mode": ("BOOLEAN", {"default": False}),
                # Nails / Makeup
                "show_nails": ("BOOLEAN", {"default": True}),
                "nail_color_override": ("STRING", {"default": ""}),
                "nail_color_override_mode": ("BOOLEAN", {"default": False}),
                "show_makeup": ("BOOLEAN", {"default": True}),
                # Accessories
                "toggle_accessories": ("BOOLEAN", {"default": True}),
                "facewear_override": ("STRING", {"default": ""}),
                "facewear_override_mode": ("BOOLEAN", {"default": False}),
                "neckwear_override": ("STRING", {"default": ""}),
                "neckwear_override_mode": ("BOOLEAN", {"default": False}),
                "armwear_override": ("STRING", {"default": ""}),
                "armwear_override_mode": ("BOOLEAN", {"default": False}),
                # Body
                "show_body": ("BOOLEAN", {"default": True}),
                "show_upper_body": ("BOOLEAN", {"default": True}),
                "show_mid_body": ("BOOLEAN", {"default": True}),
                "show_lower_body": ("BOOLEAN", {"default": True}),
                "show_butt": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                # Eyes
                "eye_color": ("STRING", {"forceInput": True}),
                "eye_type": ("STRING", {"forceInput": True}),
                "pupils": ("STRING", {"forceInput": True}),
                "eye_details": ("STRING", {"forceInput": True}),
                "eye_effects": ("STRING", {"forceInput": True}),
                "eyewear": ("STRING", {"forceInput": True}),
                # Face
                "teeth": ("STRING", {"forceInput": True}),
                "mouth_type": ("STRING", {"forceInput": True}),
                "face_details": ("STRING", {"forceInput": True}),
                "face_piercings": ("STRING", {"forceInput": True}),
                # Hair
                "hair_color": ("STRING", {"forceInput": True}),
                "hair_style": ("STRING", {"forceInput": True}),
                # Nails / Makeup
                "nail_color": ("STRING", {"forceInput": True}),
                "nail_type": ("STRING", {"forceInput": True}),
                "makeup": ("STRING", {"forceInput": True}),
                "makeup_modifiers": ("STRING", {"forceInput": True}),
                # Accessories
                "facewear": ("STRING", {"forceInput": True}),
                "neckwear": ("STRING", {"forceInput": True}),
                "armwear": ("STRING", {"forceInput": True}),
                # Body
                "base_body": ("STRING", {"forceInput": True}),
                "body_type": ("STRING", {"forceInput": True}),
                "skin_color": ("STRING", {"forceInput": True}),
                "body_details": ("STRING", {"forceInput": True}),
                "upper_body": ("STRING", {"forceInput": True}),
                "upper_piercings": ("STRING", {"forceInput": True}),
                "mid_body": ("STRING", {"forceInput": True}),
                "mid_piercings": ("STRING", {"forceInput": True}),
                "lower_body": ("STRING", {"forceInput": True}),
                "lower_piercings": ("STRING", {"forceInput": True}),
                "butt": ("STRING", {"forceInput": True}),
                "body_modifiers": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("head", "accessories", "body")
    FUNCTION = "build"

    def build(
        self,
        preset_data,
        show_eyes,
        show_eyeballs,
        eyes_override,
        eyes_override_mode,
        eyewear_override,
        eyewear_override_mode,
        face_details_override,
        face_details_override_mode,
        bald,
        show_piercings,
        face_piercings_override,
        face_piercings_override_mode,
        upper_piercings_override,
        upper_piercings_override_mode,
        mid_piercings_override,
        mid_piercings_override_mode,
        lower_piercings_override,
        lower_piercings_override_mode,
        show_nails,
        nail_color_override,
        nail_color_override_mode,
        show_makeup,
        toggle_accessories,
        facewear_override,
        facewear_override_mode,
        neckwear_override,
        neckwear_override_mode,
        armwear_override,
        armwear_override_mode,
        show_body,
        show_upper_body,
        show_mid_body,
        show_lower_body,
        show_butt,
        # Optional
        eye_color="",
        eye_type="",
        pupils="",
        eye_details="",
        eye_effects="",
        eyewear="",
        teeth="",
        mouth_type="",
        face_details="",
        face_piercings="",
        hair_color="",
        hair_style="",
        nail_color="",
        nail_type="",
        makeup="",
        makeup_modifiers="",
        facewear="",
        neckwear="",
        armwear="",
        base_body="",
        body_type="",
        skin_color="",
        body_details="",
        upper_body="",
        upper_piercings="",
        mid_body="",
        mid_piercings="",
        lower_body="",
        lower_piercings="",
        butt="",
        body_modifiers="",
    ):
        # --- Head group 1: eyes ---
        eyes_group = []
        if show_eyes:
            if show_eyeballs:
                # eyes_override replaces eye_color + eye_type
                base_eyes = ", ".join(
                    p for p in [clean_val(eye_color), clean_val(eye_type)] if p
                )
                if v := _override(eyes_override, eyes_override_mode, base_eyes):
                    eyes_group.append(v)
                # pupils
                if v := clean_val(pupils):
                    eyes_group.append(v)
            if v := clean_val(eye_details):
                eyes_group.append(v)
        if v := clean_val(eye_effects):
            eyes_group.append(v)
        # eyewear always if override or base
        if v := _override(eyewear_override, eyewear_override_mode, clean_val(eyewear)):
            eyes_group.append(v)
        if v := clean_val(mouth_type):
            eyes_group.append(v)
        if v := clean_val(teeth):
            eyes_group.append(v)

        # --- Head group 2: hair/bald ---
        hair_group = []
        if bald:
            hair_group.append("bald, bald head, no hair")
        else:
            if v := clean_val(hair_color):
                hair_group.append(v)
            if v := clean_val(hair_style):
                hair_group.append(v)

        # --- Head group 3: face details / makeup ---
        face_group = []
        if v := _override(
            face_details_override, face_details_override_mode, clean_val(face_details)
        ):
            face_group.append(v)
        if show_piercings:
            if v := _override(
                face_piercings_override,
                face_piercings_override_mode,
                clean_val(face_piercings),
            ):
                face_group.append(v)

        if show_nails:
            if v := clean_val(nail_type):
                face_group.append(v)
        if show_nails and show_makeup:
            if v := _override(
                nail_color_override, nail_color_override_mode, clean_val(nail_color)
            ):
                face_group.append(v)

        if show_makeup:
            if v := clean_val(makeup):
                face_group.append(v)
            if v := clean_val(makeup_modifiers):
                face_group.append(v)

        # Build head output
        head_parts = []
        if eyes_group:
            head_parts.append(f"({', '.join(eyes_group)})")
        if hair_group:
            head_parts.append(f"({', '.join(hair_group)})")
        if face_group:
            head_parts.append(f"({', '.join(face_group)})")
        head_out = clean_prompt(", ".join(head_parts))

        # --- Accessories ---
        acc_parts = []
        if toggle_accessories:
            if v := _override(
                facewear_override,
                facewear_override_mode,
                clean_val(facewear),
            ):
                acc_parts.append(v)
            if v := _override(
                neckwear_override,
                neckwear_override_mode,
                clean_val(neckwear),
            ):
                acc_parts.append(v)
            if v := _override(
                armwear_override,
                armwear_override_mode,
                clean_val(armwear),
            ):
                acc_parts.append(v)
        acc_out = clean_prompt(f"({', '.join(acc_parts)})") if acc_parts else ""

        # --- Body ---
        body_parts = []
        if show_body:
            if v := clean_val(base_body):
                body_parts.append(v)
            if v := clean_val(body_type):
                body_parts.append(v)
            if v := clean_val(skin_color):
                body_parts.append(v)
            if v := clean_val(body_details):
                body_parts.append(v)
            if show_upper_body:
                if v := clean_val(upper_body):
                    body_parts.append(v)
                if show_piercings:
                    if v := _override(
                        upper_piercings_override,
                        upper_piercings_override_mode,
                        clean_val(upper_piercings),
                    ):
                        body_parts.append(v)
            if show_mid_body:
                if v := clean_val(mid_body):
                    body_parts.append(v)
                if show_piercings:
                    if v := _override(
                        mid_piercings_override,
                        mid_piercings_override_mode,
                        clean_val(mid_piercings),
                    ):
                        body_parts.append(v)
            if show_lower_body:
                if v := clean_val(lower_body):
                    body_parts.append(v)
                if show_piercings:
                    if v := _override(
                        lower_piercings_override,
                        lower_piercings_override_mode,
                        clean_val(lower_piercings),
                    ):
                        body_parts.append(v)
            if show_butt:
                if v := clean_val(butt):
                    body_parts.append(v)
            if v := clean_val(body_modifiers):
                body_parts.append(v)

        body_out = clean_prompt(f"({', '.join(body_parts)})") if body_parts else ""

        return (head_out, acc_out, body_out)


NODE_CLASS_MAPPINGS = {
    "CharacterBuilder": CharacterBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterBuilder": "Character Builder",
}
