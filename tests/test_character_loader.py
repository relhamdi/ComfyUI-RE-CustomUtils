from unittest.mock import patch

import pytest

_CFG = {
    "eye_type": ["--", "almond eyes"],
    "pupils": ["--", "round pupils"],
    "teeth": ["--", "sharp teeth"],
    "mouth_type": ["--", "small mouth"],
    "nail_type": ["--", "long nails"],
    "base_body": ["--", "slim"],
    "body_type": ["--", "toned"],
    "skin_color": ["--", "tan"],
    "chest": ["--", "pectorals"],
    "chest_details": ["--", "cleavage"],
    "stomach": ["--", "abs"],
    "hips": ["--", "narrow hips"],
    "thighs": ["--", "slim thighs"],
    "butt": ["--", "butt"],
}

with patch("src.nodes.character_loader.load_builder_config", return_value=_CFG):
    from src.nodes.character_loader import CharacterLoader


@pytest.fixture
def node():
    return CharacterLoader()


def run(node, **kwargs):
    defaults = dict(
        character_file="--",
        eye_color="",
        eye_type="--",
        pupils="--",
        eye_details="",
        eyewear="",
        teeth="--",
        mouth_type="--",
        face_details="",
        face_piercings="",
        hair_color="",
        hair_style_options="",
        hair_style_selected="",
        nail_color="",
        nail_type="--",
        makeup="",
        face_accessories="",
        neck_details="",
        hand_details="",
        base_body="--",
        body_type="--",
        skin_color="--",
        body_details="",
        upper_body="",
        chest="--",
        chest_details="--",
        upper_piercings="",
        stomach="--",
        narrow_waist=False,
        muffin_top=False,
        mid_piercings="",
        lower_body="",
        hips="--",
        hip_dips=False,
        thighs="--",
        lower_piercings="",
        butt="--",
    )
    defaults.update(kwargs)
    return node.load_character(**defaults)


# RETURN_NAMES index map for readability
IDX = {
    "eye_color": 0,
    "eye_type": 1,
    "pupils": 2,
    "eye_details": 3,
    "eyewear": 4,
    "teeth": 5,
    "mouth_type": 6,
    "face_details": 7,
    "face_piercings": 8,
    "hair_color": 9,
    "hair_style": 10,
    "nail_color": 11,
    "nail_type": 12,
    "makeup": 13,
    "face_accessories": 14,
    "neck_details": 15,
    "hand_details": 16,
    "base_body": 17,
    "body_type": 18,
    "skin_color": 19,
    "body_details": 20,
    "upper_body": 21,
    "upper_piercings": 22,
    "mid_body": 23,
    "mid_piercings": 24,
    "lower_body": 25,
    "lower_piercings": 26,
    "butt": 27,
}


# --- Base cases ---


def test_eye_color_returned(node):
    result = run(node, eye_color="blue eyes")
    assert result[IDX["eye_color"]] == "blue eyes"


def test_eye_type_returned(node):
    result = run(node, eye_type="almond eyes")
    assert result[IDX["eye_type"]] == "almond eyes"


def test_eye_type_dash_returns_empty(node):
    result = run(node, eye_type="--")
    assert result[IDX["eye_type"]] == ""


def test_pupils_returned(node):
    result = run(node, pupils="round pupils")
    assert result[IDX["pupils"]] == "round pupils"


def test_eye_details_returned(node):
    result = run(node, eye_details="sparkly")
    assert result[IDX["eye_details"]] == "sparkly"


def test_eyewear_returned(node):
    result = run(node, eyewear="glasses")
    assert result[IDX["eyewear"]] == "glasses"


def test_teeth_returned(node):
    result = run(node, teeth="sharp teeth")
    assert result[IDX["teeth"]] == "sharp teeth"


def test_teeth_dash_returns_empty(node):
    result = run(node, teeth="--")
    assert result[IDX["teeth"]] == ""


def test_mouth_type_returned(node):
    result = run(node, mouth_type="small mouth")
    assert result[IDX["mouth_type"]] == "small mouth"


def test_face_details_returned(node):
    result = run(node, face_details="freckles")
    assert result[IDX["face_details"]] == "freckles"


def test_face_piercings_returned(node):
    result = run(node, face_piercings="nose ring")
    assert result[IDX["face_piercings"]] == "nose ring"


def test_hair_color_returned(node):
    result = run(node, hair_color="black hair")
    assert result[IDX["hair_color"]] == "black hair"


def test_hair_style_selected_returned(node):
    result = run(node, hair_style_selected="ponytail")
    assert result[IDX["hair_style"]] == "ponytail"


def test_nail_color_returned(node):
    result = run(node, nail_color="red nails")
    assert result[IDX["nail_color"]] == "red nails"


def test_nail_type_returned(node):
    result = run(node, nail_type="long nails")
    assert result[IDX["nail_type"]] == "long nails"


def test_nail_type_dash_returns_empty(node):
    result = run(node, nail_type="--")
    assert result[IDX["nail_type"]] == ""


def test_makeup_returned(node):
    result = run(node, makeup="red lipstick")
    assert result[IDX["makeup"]] == "red lipstick"


def test_face_accessories_returned(node):
    result = run(node, face_accessories="freckle sticker")
    assert result[IDX["face_accessories"]] == "freckle sticker"


def test_neck_details_returned(node):
    result = run(node, neck_details="choker")
    assert result[IDX["neck_details"]] == "choker"


def test_hand_details_returned(node):
    result = run(node, hand_details="ring")
    assert result[IDX["hand_details"]] == "ring"


def test_base_body_returned(node):
    result = run(node, base_body="slim")
    assert result[IDX["base_body"]] == "slim"


def test_base_body_dash_returns_empty(node):
    result = run(node, base_body="--")
    assert result[IDX["base_body"]] == ""


def test_body_type_returned(node):
    result = run(node, body_type="toned")
    assert result[IDX["body_type"]] == "toned"


def test_skin_color_returned(node):
    result = run(node, skin_color="tan")
    assert result[IDX["skin_color"]] == "tan"


def test_body_details_returned(node):
    result = run(node, body_details="scar")
    assert result[IDX["body_details"]] == "scar"


def test_upper_piercings_returned(node):
    result = run(node, upper_piercings="nipple piercing")
    assert result[IDX["upper_piercings"]] == "nipple piercing"


def test_mid_piercings_returned(node):
    result = run(node, mid_piercings="navel piercing")
    assert result[IDX["mid_piercings"]] == "navel piercing"


def test_lower_piercings_returned(node):
    result = run(node, lower_piercings="hip piercing")
    assert result[IDX["lower_piercings"]] == "hip piercing"


def test_butt_returned(node):
    result = run(node, butt="butt")
    assert result[IDX["butt"]] == "butt"


# --- Upper body group: upper_body + chest + chest_details ---


def test_upper_body_group_combines_all(node):
    result = run(
        node,
        upper_body="large breasts",
        chest="pectorals",
        chest_details="cleavage",
    )
    assert result[IDX["upper_body"]] == "large breasts, pectorals, cleavage"


def test_upper_body_group_partial(node):
    result = run(node, upper_body="", chest="pectorals", chest_details="--")
    assert result[IDX["upper_body"]] == "pectorals"


def test_upper_body_group_all_empty(node):
    result = run(node)
    assert result[IDX["upper_body"]] == ""


def test_upper_body_group_dash_ignored(node):
    result = run(node, chest="--", chest_details="--")
    assert result[IDX["upper_body"]] == ""


# --- Mid body group: stomach + narrow_waist + muffin_top ---


def test_mid_body_group_stomach_only(node):
    result = run(node, stomach="abs")
    assert result[IDX["mid_body"]] == "abs"


def test_mid_body_group_narrow_waist_true(node):
    result = run(node, narrow_waist=True)
    assert "narrow waist" in result[IDX["mid_body"]]


def test_mid_body_group_muffin_top_true(node):
    result = run(node, muffin_top=True)
    assert "muffin top" in result[IDX["mid_body"]]


def test_mid_body_group_narrow_waist_false_excluded(node):
    result = run(node, narrow_waist=False)
    assert "narrow waist" not in result[IDX["mid_body"]]


def test_mid_body_group_combined(node):
    result = run(node, stomach="abs", narrow_waist=True, muffin_top=True)
    assert result[IDX["mid_body"]] == "abs, narrow waist, muffin top"


def test_mid_body_group_all_empty(node):
    result = run(node)
    assert result[IDX["mid_body"]] == ""


# --- Lower body group: lower_body + hips + hip_dips + thighs ---


def test_lower_body_group_combines_all(node):
    result = run(
        node,
        lower_body="narrow hips str",
        hips="narrow hips",
        hip_dips=True,
        thighs="slim thighs",
    )
    assert (
        result[IDX["lower_body"]]
        == "narrow hips str, narrow hips, hip dips, slim thighs"
    )


def test_lower_body_group_hip_dips_false_excluded(node):
    result = run(node, hip_dips=False)
    assert "hip dips" not in result[IDX["lower_body"]]


def test_lower_body_group_thighs_dash_ignored(node):
    result = run(node, thighs="--")
    assert result[IDX["lower_body"]] == ""


def test_lower_body_group_all_empty(node):
    result = run(node)
    assert result[IDX["lower_body"]] == ""


# --- General ---


def test_return_count(node):
    result = run(node)
    assert len(result) == 28


def test_all_empty(node):
    result = run(node)
    assert all(v == "" for v in result)


def test_stripped_values(node):
    result = run(node, eye_color="  blue eyes  ")
    assert result[IDX["eye_color"]] == "blue eyes"
