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
                # Hair
                "bald": ("BOOLEAN", {"default": False}),
                # Face details
                "face_details_override": ("STRING", {"default": ""}),
                "face_details_override_mode": ("BOOLEAN", {"default": False}),
                "face_piercings_override": ("STRING", {"default": ""}),
                "face_piercings_override_mode": ("BOOLEAN", {"default": False}),
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
                # Body / Body details
                "show_body": ("BOOLEAN", {"default": True}),
                "show_body_details": ("BOOLEAN", {"default": True}),
                "show_upper_body": ("BOOLEAN", {"default": True}),
                "upper_details_override": ("STRING", {"default": ""}),
                "upper_details_override_mode": ("BOOLEAN", {"default": False}),
                "show_mid_body": ("BOOLEAN", {"default": True}),
                "mid_details_override": ("STRING", {"default": ""}),
                "mid_details_override_mode": ("BOOLEAN", {"default": False}),
                "show_lower_body": ("BOOLEAN", {"default": True}),
                "lower_details_override": ("STRING", {"default": ""}),
                "lower_details_override_mode": ("BOOLEAN", {"default": False}),
                "show_butt": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                # Eyes
                "eye_type": ("STRING", {"forceInput": True}),
                "eye_color": ("STRING", {"forceInput": True}),
                "pupils": ("STRING", {"forceInput": True}),
                "eye_details": ("STRING", {"forceInput": True}),
                "eye_effects": ("STRING", {"forceInput": True}),
                "eyewear": ("STRING", {"forceInput": True}),
                # Mouth
                "mouth_type": ("STRING", {"forceInput": True}),
                "teeth": ("STRING", {"forceInput": True}),
                # Hair
                "hair_color": ("STRING", {"forceInput": True}),
                "hair_style": ("STRING", {"forceInput": True}),
                # Face details
                "face_details": ("STRING", {"forceInput": True}),
                "face_piercings": ("STRING", {"forceInput": True}),
                # Nails / Makeup
                "nail_type": ("STRING", {"forceInput": True}),
                "nail_color": ("STRING", {"forceInput": True}),
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
                "upper_details": ("STRING", {"forceInput": True}),
                "mid_body": ("STRING", {"forceInput": True}),
                "mid_details": ("STRING", {"forceInput": True}),
                "lower_body": ("STRING", {"forceInput": True}),
                "lower_details": ("STRING", {"forceInput": True}),
                "butt": ("STRING", {"forceInput": True}),
                "body_modifiers": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",) * 5
    RETURN_NAMES = ("head", "body", "facewear", "neckwear", "armwear")
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
        bald,
        face_details_override,
        face_details_override_mode,
        face_piercings_override,
        face_piercings_override_mode,
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
        show_body_details,
        show_upper_body,
        upper_details_override,
        upper_details_override_mode,
        show_mid_body,
        mid_details_override,
        mid_details_override_mode,
        show_lower_body,
        lower_details_override,
        lower_details_override_mode,
        show_butt,
        # Optional
        eye_type="",
        eye_color="",
        pupils="",
        eye_details="",
        eye_effects="",
        eyewear="",
        mouth_type="",
        teeth="",
        hair_color="",
        hair_style="",
        face_details="",
        face_piercings="",
        nail_type="",
        nail_color="",
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
        upper_details="",
        mid_body="",
        mid_details="",
        lower_body="",
        lower_details="",
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
        facewear_out = ""
        neckwear_out = ""
        armwear_out = ""
        if toggle_accessories:
            if v := _override(
                facewear_override,
                facewear_override_mode,
                clean_val(facewear),
            ):
                facewear_out = v
            if v := _override(
                neckwear_override,
                neckwear_override_mode,
                clean_val(neckwear),
            ):
                neckwear_out = v
            if v := _override(
                armwear_override,
                armwear_override_mode,
                clean_val(armwear),
            ):
                armwear_out = v

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
                if show_body_details:
                    if v := _override(
                        upper_details_override,
                        upper_details_override_mode,
                        clean_val(upper_details),
                    ):
                        body_parts.append(v)
            if show_mid_body:
                if v := clean_val(mid_body):
                    body_parts.append(v)
                if show_body_details:
                    if v := _override(
                        mid_details_override,
                        mid_details_override_mode,
                        clean_val(mid_details),
                    ):
                        body_parts.append(v)
            if show_lower_body:
                if v := clean_val(lower_body):
                    body_parts.append(v)
                if show_body_details:
                    if v := _override(
                        lower_details_override,
                        lower_details_override_mode,
                        clean_val(lower_details),
                    ):
                        body_parts.append(v)
            if show_butt:
                if v := clean_val(butt):
                    body_parts.append(v)
            if v := clean_val(body_modifiers):
                body_parts.append(v)

        body_out = clean_prompt(f"({', '.join(body_parts)})") if body_parts else ""

        return (head_out, body_out, facewear_out, neckwear_out, armwear_out)


NODE_CLASS_MAPPINGS = {
    "CharacterBuilder": CharacterBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterBuilder": "Character Builder",
}
