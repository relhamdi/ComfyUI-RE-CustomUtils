import pytest
from src.nodes.character_builder import CharacterBuilder


@pytest.fixture
def node():
    return CharacterBuilder()


def run(node, **kwargs):
    defaults = dict(
        preset_data="{}",
        show_eyes=True,
        show_eyeballs=True,
        eyes_override="",
        eyes_override_mode=False,
        pupils_override="",
        pupils_override_mode=False,
        eyewear_override="",
        eyewear_override_mode=False,
        teeth_override="",
        teeth_override_mode=False,
        face_details_override="",
        face_details_override_mode=False,
        hair_style_override_options="",
        hair_style_override_selected="",
        show_piercings=True,
        face_piercings_override="",
        face_piercings_override_mode=False,
        upper_piercings_override="",
        upper_piercings_override_mode=False,
        mid_piercings_override="",
        mid_piercings_override_mode=False,
        lower_piercings_override="",
        lower_piercings_override_mode=False,
        show_nails=True,
        nail_color_override="",
        nail_color_override_mode=False,
        show_makeup=True,
        toggle_accessories=True,
        face_accessories_override="",
        face_accessories_override_mode=False,
        neck_details_override="",
        neck_details_override_mode=False,
        hand_details_override="",
        hand_details_override_mode=False,
        show_body=True,
        show_upper_body=True,
        show_mid_body=True,
        show_lower_body=True,
        show_butt=True,
        # Optional CharacterLoader inputs
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
        face_accessories="",
        neck_details="",
        hand_details="",
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
    )
    defaults.update(kwargs)
    return node.build(**defaults)


class TestCharacterBuilderHead:
    # --- Eyes group ---

    def test_eye_color_and_type_in_head(self, node):
        head, _, _ = run(node, eye_color="blue eyes", eye_type="almond eyes")
        assert "blue eyes" in head
        assert "almond eyes" in head

    def test_eyes_override_replace_mode(self, node):
        head, _, _ = run(
            node,
            eye_color="blue eyes",
            eye_type="almond eyes",
            eyes_override="red eyes",
            eyes_override_mode=True,
        )
        assert "red eyes" in head
        assert "blue eyes" not in head
        assert "almond eyes" not in head

    def test_eyes_override_add_mode(self, node):
        head, _, _ = run(
            node,
            eye_color="blue eyes",
            eyes_override="sparkle",
            eyes_override_mode=False,
        )
        assert "blue eyes" in head
        assert "sparkle" in head

    def test_eyes_excluded_when_show_eyes_false(self, node):
        head, _, _ = run(node, eye_color="blue eyes", show_eyes=False)
        assert "blue eyes" not in head

    def test_eyes_excluded_when_show_eyeballs_false(self, node):
        head, _, _ = run(node, eye_color="blue eyes", show_eyeballs=False)
        assert "blue eyes" not in head

    def test_pupils_override_replace(self, node):
        head, _, _ = run(
            node,
            pupils="round pupils",
            pupils_override="heart pupils",
            pupils_override_mode=True,
        )
        assert "heart pupils" in head
        assert "round pupils" not in head

    def test_eye_details_included_when_show_eyes(self, node):
        head, _, _ = run(node, eye_details="sparkly", show_eyes=True)
        assert "sparkly" in head

    def test_eye_details_excluded_when_show_eyes_false(self, node):
        head, _, _ = run(node, eye_details="sparkly", show_eyes=False)
        assert "sparkly" not in head

    def test_eye_effects_always_included(self, node):
        head, _, _ = run(node, eye_effects="glowing", show_eyes=False)
        assert "glowing" in head

    def test_eyewear_override_replace(self, node):
        head, _, _ = run(
            node,
            eyewear="glasses",
            eyewear_override="round eyewear",
            eyewear_override_mode=True,
        )
        assert "round eyewear" in head
        assert "glasses" not in head

    def test_mouth_type_included(self, node):
        head, _, _ = run(node, mouth_type="small mouth")
        assert "small mouth" in head

    def test_teeth_override_replace(self, node):
        head, _, _ = run(
            node,
            teeth="normal teeth",
            teeth_override="sharp teeth",
            teeth_override_mode=True,
        )
        assert "sharp teeth" in head
        assert "normal teeth" not in head

    # --- Hair group ---

    def test_hair_color_included(self, node):
        head, _, _ = run(node, hair_color="black hair")
        assert "black hair" in head

    def test_hair_style_override_takes_priority(self, node):
        head, _, _ = run(
            node, hair_style="ponytail", hair_style_override_selected="braids"
        )
        assert "braids" in head
        assert "ponytail" not in head

    def test_hair_style_used_when_no_override(self, node):
        head, _, _ = run(node, hair_style="ponytail", hair_style_override_selected="")
        assert "ponytail" in head

    # --- Face / makeup group ---

    def test_face_details_override_add(self, node):
        head, _, _ = run(
            node,
            face_details="freckles",
            face_details_override="scar",
            face_details_override_mode=False,
        )
        assert "freckles" in head
        assert "scar" in head

    def test_face_piercings_included_when_show_piercings(self, node):
        head, _, _ = run(node, face_piercings="nose ring", show_piercings=True)
        assert "nose ring" in head

    def test_face_piercings_excluded_when_show_piercings_false(self, node):
        head, _, _ = run(node, face_piercings="nose ring", show_piercings=False)
        assert "nose ring" not in head

    def test_nail_color_override_replace(self, node):
        head, _, _ = run(
            node,
            nail_color="red nails",
            nail_color_override="blue nails",
            nail_color_override_mode=True,
            show_nails=True,
            show_makeup=True,
        )
        assert "blue nails" in head
        assert "red nails" not in head

    def test_nail_color_excluded_when_show_nails_false(self, node):
        head, _, _ = run(node, nail_color="red nails", show_nails=False)
        assert "red nails" not in head

    def test_nail_color_excluded_when_show_makeup_false(self, node):
        head, _, _ = run(
            node, nail_color="red nails", show_nails=True, show_makeup=False
        )
        assert "red nails" not in head

    def test_nail_type_included_when_show_nails(self, node):
        head, _, _ = run(node, nail_type="long nails", show_nails=True)
        assert "long nails" in head

    def test_nail_type_excluded_when_show_nails_false(self, node):
        head, _, _ = run(node, nail_type="long nails", show_nails=False)
        assert "long nails" not in head

    def test_makeup_included_when_show_makeup(self, node):
        head, _, _ = run(node, makeup="red lipstick", show_makeup=True)
        assert "red lipstick" in head

    def test_makeup_excluded_when_show_makeup_false(self, node):
        head, _, _ = run(node, makeup="red lipstick", show_makeup=False)
        assert "red lipstick" not in head

    def test_makeup_modifiers_included_when_show_makeup(self, node):
        head, _, _ = run(node, makeup_modifiers="glossy", show_makeup=True)
        assert "glossy" in head

    # --- General head ---

    def test_head_in_parentheses_groups(self, node):
        head, _, _ = run(
            node, eye_color="blue eyes", hair_color="black hair", makeup="lipstick"
        )
        assert "(" in head and ")" in head

    def test_head_all_empty_returns_empty(self, node):
        head, _, _ = run(node)
        assert head == ""

    def test_head_cleanup_applied(self, node):
        head, _, _ = run(node, eye_color="blue eyes,")
        assert not head.endswith(",")


class TestCharacterBuilderAccessories:
    def test_face_accessories_override_replace(self, node):
        _, acc, _ = run(
            node,
            face_accessories="sticker",
            face_accessories_override="tattoo",
            face_accessories_override_mode=True,
        )
        assert "tattoo" in acc
        assert "sticker" not in acc

    def test_neck_details_included(self, node):
        _, acc, _ = run(node, neck_details="choker")
        assert "choker" in acc

    def test_hand_details_included(self, node):
        _, acc, _ = run(node, hand_details="ring")
        assert "ring" in acc

    def test_accessories_excluded_when_toggle_false(self, node):
        _, acc, _ = run(
            node,
            face_accessories="sticker",
            neck_details="choker",
            toggle_accessories=False,
        )
        assert acc == ""

    def test_accessories_all_empty_returns_empty(self, node):
        _, acc, _ = run(node)
        assert acc == ""

    def test_accessories_in_parentheses(self, node):
        _, acc, _ = run(node, neck_details="choker")
        assert acc == "(choker)"


class TestCharacterBuilderBody:
    def test_base_body_included(self, node):
        _, _, body = run(node, base_body="slim")
        assert "slim" in body

    def test_body_type_included(self, node):
        _, _, body = run(node, body_type="athletic")
        assert "athletic" in body

    def test_skin_color_included(self, node):
        _, _, body = run(node, skin_color="tan")
        assert "tan" in body

    def test_body_details_included(self, node):
        _, _, body = run(node, body_details="scar")
        assert "scar" in body

    def test_upper_body_included_when_show_upper_body(self, node):
        _, _, body = run(node, upper_body="pectorals", show_upper_body=True)
        assert "pectorals" in body

    def test_upper_body_excluded_when_show_upper_body_false(self, node):
        _, _, body = run(node, upper_body="pectorals", show_upper_body=False)
        assert "pectorals" not in body

    def test_upper_piercings_override_replace(self, node):
        _, _, body = run(
            node,
            upper_piercings="cross piercing",
            upper_piercings_override="other ring",
            upper_piercings_override_mode=True,
            show_upper_body=True,
            show_piercings=True,
        )
        assert "other ring" in body
        assert "cross piercing" not in body

    def test_upper_piercings_excluded_when_show_piercings_false(self, node):
        _, _, body = run(
            node,
            upper_piercings="cross piercing",
            show_upper_body=True,
            show_piercings=False,
        )
        assert "cross piercing" not in body

    def test_mid_body_included_when_show_mid_body(self, node):
        _, _, body = run(node, mid_body="abs", show_mid_body=True)
        assert "abs" in body

    def test_mid_body_excluded_when_show_mid_body_false(self, node):
        _, _, body = run(node, mid_body="abs", show_mid_body=False)
        assert "abs" not in body

    def test_mid_piercings_override_replace(self, node):
        _, _, body = run(
            node,
            mid_piercings="navel piercing",
            mid_piercings_override="other ring",
            mid_piercings_override_mode=True,
            show_mid_body=True,
            show_piercings=True,
        )
        assert "other ring" in body
        assert "navel piercing" not in body

    def test_lower_body_included_when_show_lower_body(self, node):
        _, _, body = run(node, lower_body="wide hips", show_lower_body=True)
        assert "wide hips" in body

    def test_lower_body_excluded_when_show_lower_body_false(self, node):
        _, _, body = run(node, lower_body="wide hips", show_lower_body=False)
        assert "wide hips" not in body

    def test_lower_piercings_override_replace(self, node):
        _, _, body = run(
            node,
            lower_piercings="hip ring",
            lower_piercings_override="other ring",
            lower_piercings_override_mode=True,
            show_lower_body=True,
            show_piercings=True,
        )
        assert "other ring" in body
        assert "hip ring" not in body

    def test_butt_included_when_show_butt(self, node):
        _, _, body = run(node, butt="butt", show_butt=True)
        assert "butt" in body

    def test_butt_excluded_when_show_butt_false(self, node):
        _, _, body = run(node, butt="butt", show_butt=False)
        assert "butt" not in body

    def test_body_modifiers_included(self, node):
        _, _, body = run(node, body_modifiers="toned")
        assert "toned" in body

    def test_show_body_false_excludes_everything(self, node):
        _, _, body = run(
            node,
            base_body="slim",
            body_type="athletic",
            skin_color="tan",
            upper_body="pectorals",
            mid_body="abs",
            lower_body="wide hips",
            butt="butt",
            body_modifiers="toned",
            show_body=False,
        )
        assert body == ""

    def test_body_all_empty_returns_empty(self, node):
        _, _, body = run(node)
        assert body == ""

    def test_body_in_parentheses(self, node):
        _, _, body = run(node, base_body="slim")
        assert body == "(slim)"

    def test_body_cleanup_applied(self, node):
        _, _, body = run(node, base_body="slim,")
        assert not body.endswith(",)")
