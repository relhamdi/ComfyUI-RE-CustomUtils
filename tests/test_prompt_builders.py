from unittest.mock import patch

import pytest

_FACE_CFG = {
    "pupils": ["--", "round pupils"],
    "eye_state": ["--", "half closed"],
    "gaze": ["--", "looking at viewer"],
    "blush": ["--", "light blush"],
    "mouth_state": ["--", "closed mouth"],
    "mouth_expression": ["--", "smile"],
    "emotion": ["--", "neutral"],
    "head_angle": ["--", "head tilt"],
}

_POSE_CFG = {
    "stance": ["--", "standing"],
    "posture": ["--", "contrapposto"],
    "arms": ["--", "arms at sides"],
    "arm": ["--", "arm raised"],
    "hands": ["--", "hands on hips"],
    "hand": ["--", "hand raised"],
    "holding": ["--", "sword"],
    "legs": ["--", "legs together"],
    "feet": ["--", "bare feet"],
}

_SCENE_CFG = {
    "focus": ["--", "subject"],
    "view": ["--", "from front"],
    "angle": ["--", "eye level"],
    "framing": ["--", "full body"],
    "time": ["--", "daytime"],
    "sky": ["--", "clear sky"],
    "location": ["--", "indoors"],
    "effect": ["--", "bokeh"],
}

with patch("src.nodes.prompt_face_builder.load_builder_config", return_value=_FACE_CFG):
    from src.nodes.prompt_face_builder import PromptFaceBuilder

with patch("src.nodes.prompt_pose_builder.load_builder_config", return_value=_POSE_CFG):
    from src.nodes.prompt_pose_builder import PromptPoseBuilder

with patch(
    "src.nodes.prompt_scene_builder.load_builder_config", return_value=_SCENE_CFG
):
    from src.nodes.prompt_scene_builder import PromptSceneBuilder


# --- Fixtures ---


@pytest.fixture
def face():
    return PromptFaceBuilder()


@pytest.fixture
def pose():
    return PromptPoseBuilder()


@pytest.fixture
def scene():
    return PromptSceneBuilder()


# --- Helpers ---


def run_face(node, **kwargs):
    defaults = dict(
        show_eyes=True,
        pupils="--",
        eye_state="--",
        gaze="--",
        show_eyewear=True,
        eyewear_override="",
        blush="--",
        mouth_state="--",
        mouth_expression="--",
        emotion="--",
        head_angle="--",
        show_body_details=True,
        show_nails=True,
        nail_color_override="",
        show_makeup=True,
        preset_data="{}",
        eyes="",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


def run_pose(node, **kwargs):
    defaults = dict(
        stance="--",
        posture="--",
        split_arms=False,
        arms="--",
        first_arm="--",
        second_arm="--",
        split_hands=False,
        hands="--",
        first_hand="--",
        second_hand="--",
        holding="--",
        legs="--",
        feet="--",
        show_body_details=True,
        show_upper_body=True,
        show_lower_body=True,
        action_options="",
        action_selected="",
        preset_data="{}",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


def run_scene(node, **kwargs):
    defaults = dict(
        focus="--",
        view="--",
        angle="--",
        framing="--",
        time="--",
        sky="--",
        location="--",
        effect="--",
        preset_data="{}",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


# --- FaceBuilder ---


class TestFaceBuilder:
    # --- Eyes group ---

    def test_eyes_included_when_show_eyes(self, face):
        (text,) = run_face(face, eyes="blue eyes", show_eyes=True)
        assert "blue eyes" in text

    def test_eyes_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, eyes="blue eyes", show_eyes=False)
        assert "blue eyes" not in text

    def test_pupils_included_when_show_eyes(self, face):
        (text,) = run_face(face, pupils="round pupils", show_eyes=True)
        assert "round pupils" in text

    def test_pupils_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, pupils="round pupils", show_eyes=False)
        assert "round pupils" not in text

    def test_eye_type_included_when_show_eyes(self, face):
        (text,) = run_face(face, eye_type="almond eyes", show_eyes=True)
        assert "almond eyes" in text

    def test_eye_type_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, eye_type="almond eyes", show_eyes=False)
        assert "almond eyes" not in text

    def test_eye_state_always_included(self, face):
        (text,) = run_face(face, eye_state="half closed", show_eyes=False)
        assert "half closed" in text

    def test_eyewear_included_when_show_eyewear(self, face):
        (text,) = run_face(face, eyewear="sunglasses", show_eyewear=True)
        assert "sunglasses" in text

    def test_eyewear_excluded_when_show_eyewear_false(self, face):
        (text,) = run_face(face, eyewear="sunglasses", show_eyewear=False)
        assert "sunglasses" not in text

    def test_eyewear_override_takes_priority(self, face):
        (text,) = run_face(
            face, eyewear="sunglasses", eyewear_override="glasses", show_eyewear=True
        )
        assert "glasses" in text
        assert "sunglasses" not in text

    def test_eye_modifiers_always_included(self, face):
        (text,) = run_face(face, eye_modifiers="sparkle", show_eyes=False)
        assert "sparkle" in text

    def test_eye_group_in_parentheses(self, face):
        (text,) = run_face(
            face, eyes="blue eyes", pupils="round pupils", show_eyes=True
        )
        assert "(blue eyes, round pupils)" in text

    # --- Hair group ---

    def test_hair_color_in_hair_group(self, face):
        (text,) = run_face(face, hair_color="black hair")
        assert "black hair" in text

    def test_hair_style_in_hair_group(self, face):
        (text,) = run_face(face, hair_style="long hair")
        assert "long hair" in text

    def test_hair_group_in_parentheses(self, face):
        (text,) = run_face(face, hair_color="black hair", hair_style="long hair")
        assert "(black hair, long hair)" in text

    # --- Face group ---

    def test_gaze_included_when_show_eyes(self, face):
        (text,) = run_face(face, gaze="looking at viewer", show_eyes=True)
        assert "looking at viewer" in text

    def test_gaze_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, gaze="looking at viewer", show_eyes=False)
        assert "looking at viewer" not in text

    def test_blush_included(self, face):
        (text,) = run_face(face, blush="light blush")
        assert "light blush" in text

    def test_teeth_included(self, face):
        (text,) = run_face(face, teeth="teeth")
        assert "teeth" in text

    def test_mouth_state_included(self, face):
        (text,) = run_face(face, mouth_state="closed mouth")
        assert "closed mouth" in text

    def test_mouth_expression_included(self, face):
        (text,) = run_face(face, mouth_expression="smile")
        assert "smile" in text

    def test_mouth_modifiers_included(self, face):
        (text,) = run_face(face, mouth_modifiers="tongue out")
        assert "tongue out" in text

    def test_emotion_included(self, face):
        (text,) = run_face(face, emotion="neutral")
        assert "neutral" in text

    def test_head_angle_included(self, face):
        (text,) = run_face(face, head_angle="head tilt")
        assert "head tilt" in text

    # --- Makeup group ---

    def test_piercings_included_when_show_body_details(self, face):
        (text,) = run_face(face, facial_piercings="nose ring", show_body_details=True)
        assert "nose ring" in text

    def test_piercings_excluded_when_show_body_details_false(self, face):
        (text,) = run_face(face, facial_piercings="nose ring", show_body_details=False)
        assert "nose ring" not in text

    def test_makeup_included_when_show_makeup(self, face):
        (text,) = run_face(face, makeup="red lipstick", show_makeup=True)
        assert "red lipstick" in text

    def test_makeup_excluded_when_show_makeup_false(self, face):
        (text,) = run_face(face, makeup="red lipstick", show_makeup=False)
        assert "red lipstick" not in text

    def test_nail_type_included_when_show_nails(self, face):
        (text,) = run_face(face, nail_type="long nails", show_nails=True)
        assert "long nails" in text

    def test_nail_type_excluded_when_show_nails_false(self, face):
        (text,) = run_face(face, nail_type="long nails", show_nails=False)
        assert "long nails" not in text

    def test_nail_color_included_when_show_makeup_and_nails(self, face):
        (text,) = run_face(
            face, nail_color="red nails", show_makeup=True, show_nails=True
        )
        assert "red nails" in text

    def test_nail_color_excluded_when_show_makeup_false(self, face):
        (text,) = run_face(
            face, nail_color="red nails", show_makeup=False, show_nails=True
        )
        assert "red nails" not in text

    def test_nail_color_override_takes_priority(self, face):
        (text,) = run_face(
            face,
            nail_color="red nails",
            nail_color_override="blue nails",
            show_makeup=True,
            show_nails=True,
        )
        assert "blue nails" in text
        assert "red nails" not in text

    # --- Extra group ---

    def test_face_modifiers_in_extra_group(self, face):
        (text,) = run_face(face, face_modifiers="freckles")
        assert "freckles" in text

    def test_face_modifiers_in_parentheses(self, face):
        (text,) = run_face(face, face_modifiers="freckles")
        assert "(freckles)" in text

    # --- General ---

    def test_dash_dash_ignored(self, face):
        (text,) = run_face(face, blush="--", emotion="--")
        assert "--" not in text

    def test_all_empty_returns_empty(self, face):
        (text,) = run_face(face, eyes="", show_eyes=True)
        assert text == ""

    def test_cleanup_applied(self, face):
        (text,) = run_face(face, eyes="blue eyes,", show_eyes=True)
        assert not text.endswith(",")


# --- PoseBuilder ---


class TestPoseBuilder:
    # --- Body group ---

    def test_base_body_included(self, pose):
        (text,) = run_pose(pose, base_body="slim")
        assert "slim" in text

    def test_body_type_included(self, pose):
        (text,) = run_pose(pose, body_type="tall")
        assert "tall" in text

    def test_body_piercings_included_when_show_body_details(self, pose):
        (text,) = run_pose(
            pose, body_piercings="navel piercing", show_body_details=True
        )
        assert "navel piercing" in text

    def test_body_piercings_excluded_when_show_body_details_false(self, pose):
        (text,) = run_pose(
            pose, body_piercings="navel piercing", show_body_details=False
        )
        assert "navel piercing" not in text

    def test_upper_body_included_when_show_upper_body(self, pose):
        (text,) = run_pose(pose, upper_body="large chest", show_upper_body=True)
        assert "large chest" in text

    def test_upper_body_excluded_when_show_upper_body_false(self, pose):
        (text,) = run_pose(pose, upper_body="large chest", show_upper_body=False)
        assert "large chest" not in text

    def test_lower_body_included_when_show_lower_body(self, pose):
        (text,) = run_pose(pose, lower_body="wide hips", show_lower_body=True)
        assert "wide hips" in text

    def test_lower_body_excluded_when_show_lower_body_false(self, pose):
        (text,) = run_pose(pose, lower_body="wide hips", show_lower_body=False)
        assert "wide hips" not in text

    def test_body_modifiers_always_included(self, pose):
        (text,) = run_pose(pose, body_modifiers="athletic")
        assert "athletic" in text

    def test_body_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, base_body="slim", body_type="tall")
        assert "(slim, tall)" in text

    # --- Pose group ---

    def test_stance_included(self, pose):
        (text,) = run_pose(pose, stance="standing")
        assert "standing" in text

    def test_posture_included(self, pose):
        (text,) = run_pose(pose, posture="contrapposto")
        assert "contrapposto" in text

    def test_arms_when_not_split(self, pose):
        (text,) = run_pose(pose, arms="arms at sides", split_arms=False)
        assert "arms at sides" in text

    def test_first_arm_when_split(self, pose):
        (text,) = run_pose(pose, first_arm="arm raised", split_arms=True)
        assert "arm raised" in text

    def test_second_arm_when_split(self, pose):
        (text,) = run_pose(pose, second_arm="arm at side", split_arms=True)
        assert "arm at side" in text

    def test_arms_excluded_when_split(self, pose):
        (text,) = run_pose(pose, arms="arms at sides", split_arms=True)
        assert "arms at sides" not in text

    def test_hands_when_not_split(self, pose):
        (text,) = run_pose(pose, hands="hands on hips", split_hands=False)
        assert "hands on hips" in text

    def test_first_hand_when_split(self, pose):
        (text,) = run_pose(pose, first_hand="hand raised", split_hands=True)
        assert "hand raised" in text

    def test_second_hand_when_split(self, pose):
        (text,) = run_pose(pose, second_hand="hand at side", split_hands=True)
        assert "hand at side" in text

    def test_holding_prepends_holding(self, pose):
        (text,) = run_pose(pose, holding="sword")
        assert "holding sword" in text

    def test_legs_included(self, pose):
        (text,) = run_pose(pose, legs="legs together")
        assert "legs together" in text

    def test_feet_included(self, pose):
        (text,) = run_pose(pose, feet="bare feet")
        assert "bare feet" in text

    def test_pose_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, stance="standing", posture="contrapposto")
        assert "(standing, contrapposto)" in text

    # --- Action group ---

    def test_action_included(self, pose):
        (text,) = run_pose(pose, action_selected="walking")
        assert "walking" in text

    def test_action_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, action_selected="walking")
        assert "(walking)" in text

    # --- Extra group ---

    def test_extra_included(self, pose):
        (text,) = run_pose(pose, extra="from behind")
        assert "from behind" in text

    def test_extra_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, extra="from behind")
        assert "(from behind)" in text

    # --- General ---

    def test_dash_dash_ignored(self, pose):
        (text,) = run_pose(pose, stance="--", posture="--")
        assert "--" not in text

    def test_all_empty_returns_empty(self, pose):
        (text,) = run_pose(pose)
        assert text == ""

    def test_cleanup_applied(self, pose):
        (text,) = run_pose(pose, stance="standing,")
        assert not text.endswith(",")


# --- SceneBuilder ---


class TestSceneBuilder:
    def test_focus_included(self, scene):
        (text,) = run_scene(scene, focus="subject")
        assert "subject" in text

    def test_view_included(self, scene):
        (text,) = run_scene(scene, view="from front")
        assert "from front" in text

    def test_angle_included(self, scene):
        (text,) = run_scene(scene, angle="eye level")
        assert "eye level" in text

    def test_framing_included(self, scene):
        (text,) = run_scene(scene, framing="full body")
        assert "full body" in text

    def test_time_included(self, scene):
        (text,) = run_scene(scene, time="daytime")
        assert "daytime" in text

    def test_sky_included(self, scene):
        (text,) = run_scene(scene, sky="clear sky")
        assert "clear sky" in text

    def test_location_included(self, scene):
        (text,) = run_scene(scene, location="indoors")
        assert "indoors" in text

    def test_effect_included(self, scene):
        (text,) = run_scene(scene, effect="bokeh")
        assert "bokeh" in text

    def test_dash_dash_ignored(self, scene):
        (text,) = run_scene(scene, view="--", framing="--")
        assert "--" not in text

    def test_camera_group_in_parentheses(self, scene):
        (text,) = run_scene(
            scene, view="from front", angle="from above", framing="full body"
        )
        assert "(from front, from above, full body)" in text

    def test_scene_group_in_parentheses(self, scene):
        (text,) = run_scene(scene, time="daytime", sky="clear sky", location="indoors")
        assert "(daytime, clear sky, indoors)" in text

    def test_effect_group_in_parentheses(self, scene):
        (text,) = run_scene(scene, effect="bokeh")
        assert "(bokeh)" in text

    def test_all_empty_returns_empty(self, scene):
        (text,) = run_scene(scene)
        assert text == ""

    def test_cleanup_applied(self, scene):
        (text,) = run_scene(scene, view="from front,")
        assert not text.endswith(",")

    def test_full(self, scene):
        (text,) = run_scene(
            scene,
            focus="subject",
            view="from front",
            angle="eye level",
            framing="full body",
            time="daytime",
            sky="clear sky",
            location="indoors",
            effect="bokeh",
        )
        assert "(subject, from front, eye level, full body)" in text
        assert "(daytime, clear sky, indoors)" in text
        assert "(bokeh)" in text
