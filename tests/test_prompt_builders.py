from unittest.mock import patch

import pytest

# Mock load_builder_config to avoid file dependency
with patch(
    "src.nodes.prompt_face_builder.load_builder_config",
    return_value={
        "pupils": ["--", "round pupils"],
        "eye_details": ["--", "detailed eyes"],
        "eye_state": ["--", "half closed eyes"],
        "gaze": ["--", "looking at viewer"],
        "blush": ["--", "light blush"],
        "teeth": ["--", "teeth"],
        "mouth_details": ["--", "tongue out"],
        "mouth_state": ["--", "closed mouth"],
        "mouth_expression": ["--", "smile"],
        "emotion": ["--", "neutral"],
        "head_angle": ["--", "head tilt"],
    },
):
    from src.nodes.prompt_face_builder import PromptFaceBuilder

with patch(
    "src.nodes.prompt_pose_builder.load_builder_config",
    return_value={
        "stance": ["--", "standing"],
        "posture": ["--", "contrapposto"],
        "arms": ["--", "arms at sides"],
        "arm": ["--", "arm raised"],
        "hands": ["--", "hands on hips"],
        "hand": ["--", "hand raised"],
        "holding": ["--", "sword"],
        "legs": ["--", "legs together"],
        "feet": ["--", "bare feet"],
    },
):
    from src.nodes.prompt_pose_builder import PromptPoseBuilder

with patch(
    "src.nodes.prompt_scene_builder.load_builder_config",
    return_value={
        "view": ["--", "from front"],
        "angle": ["--", "from above"],
        "framing": ["--", "full body"],
        "time": ["--", "daytime"],
        "sky": ["--", "clear sky"],
        "location": ["--", "indoors"],
        "effect": ["--", "bokeh"],
    },
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
        preset_data="{}",
        eyes="blue eyes",
        eyewear="",
        show_eyes=True,
        pupils="--",
        eye_details="--",
        eye_state="--",
        gaze="--",
        show_eyewear=False,
        blush="--",
        teeth="--",
        mouth_details="--",
        mouth_state="--",
        mouth_expression="--",
        emotion="--",
        head_angle="--",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


def run_pose(node, **kwargs):
    defaults = dict(
        preset_data="{}",
        extra="",
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
        action_options="",
        action_selected="",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


def run_scene(node, **kwargs):
    defaults = dict(
        preset_data="{}",
        view="--",
        angle="--",
        framing="--",
        time="--",
        sky="--",
        location="--",
        effect="--",
    )
    defaults.update(kwargs)
    return node.build(**defaults)


# --- FaceBuilder ---


class TestFaceBuilder:
    def test_eyes_included_when_show_eyes(self, face):
        (text,) = run_face(face, eyes="blue eyes", show_eyes=True)
        assert "blue eyes" in text

    def test_eyes_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, eyes="blue eyes", show_eyes=False)
        assert "blue eyes" not in text

    def test_pupils_included(self, face):
        (text,) = run_face(face, pupils="round pupils", show_eyes=True)
        assert "round pupils" in text

    def test_pupils_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, pupils="round pupils", show_eyes=False)
        assert "round pupils" not in text

    def test_eye_details_included(self, face):
        (text,) = run_face(face, eye_details="detailed eyes", show_eyes=True)
        assert "detailed eyes" in text

    def test_gaze_included_when_show_eyes(self, face):
        (text,) = run_face(face, gaze="looking at viewer", show_eyes=True)
        assert "looking at viewer" in text

    def test_gaze_excluded_when_show_eyes_false(self, face):
        (text,) = run_face(face, gaze="looking at viewer", show_eyes=False)
        assert "looking at viewer" not in text

    def test_eyewear_included_when_show_eyewear(self, face):
        (text,) = run_face(
            face, eyewear="sunglasses", show_eyewear=True, show_eyes=True
        )
        assert "sunglasses" in text

    def test_eyewear_excluded_when_show_eyewear_false(self, face):
        (text,) = run_face(face, eyewear="sunglasses", show_eyewear=False)
        assert "sunglasses" not in text

    def test_blush_always_included(self, face):
        (text,) = run_face(face, blush="light blush", show_eyes=False)
        assert "light blush" in text

    def test_mouth_state_included(self, face):
        (text,) = run_face(face, mouth_state="closed mouth")
        assert "closed mouth" in text

    def test_teeth_included(self, face):
        (text,) = run_face(face, teeth="teeth")
        assert "teeth" in text

    def test_mouth_details_included(self, face):
        (text,) = run_face(face, mouth_details="tongue out")
        assert "tongue out" in text

    def test_mouth_expression_included(self, face):
        (text,) = run_face(face, mouth_expression="smile")
        assert "smile" in text

    def test_emotion_included(self, face):
        (text,) = run_face(face, emotion="neutral")
        assert "neutral" in text

    def test_head_angle_included(self, face):
        (text,) = run_face(face, head_angle="head tilt")
        assert "head tilt" in text

    def test_dash_dash_ignored(self, face):
        (text,) = run_face(face, blush="--", mouth_state="--")
        assert "--" not in text

    def test_empty_ignored(self, face):
        (text,) = run_face(face, blush="", mouth_state="   ")
        assert ",," not in text

    def test_eye_group_in_parentheses(self, face):
        (text,) = run_face(
            face, eyes="blue eyes", pupils="round pupils", show_eyes=True
        )
        assert "(blue eyes, round pupils)" in text

    def test_face_group_in_parentheses(self, face):
        (text,) = run_face(face, blush="light blush", emotion="neutral")
        assert "(light blush" in text
        assert "neutral)" in text

    def test_all_empty_returns_empty(self, face):
        (text,) = run_face(face, eyes="", show_eyes=True)
        assert text == ""

    def test_cleanup_applied(self, face):
        (text,) = run_face(face, eyes="blue eyes,", show_eyes=True)
        assert not text.endswith(",")


# --- PoseBuilder ---


class TestPoseBuilder:
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

    def test_first_second_arm_excluded_when_not_split(self, pose):
        (text,) = run_pose(
            pose, first_arm="arm raised", second_arm="arm at side", split_arms=False
        )
        assert "arm raised" not in text
        assert "arm at side" not in text

    def test_hands_when_not_split(self, pose):
        (text,) = run_pose(pose, hands="hands on hips", split_hands=False)
        assert "hands on hips" in text

    def test_first_hand_when_split(self, pose):
        (text,) = run_pose(pose, first_hand="hand raised", split_hands=True)
        assert "hand raised" in text

    def test_second_hand_when_split(self, pose):
        (text,) = run_pose(pose, second_hand="hand at side", split_hands=True)
        assert "hand at side" in text

    def test_hands_excluded_when_split(self, pose):
        (text,) = run_pose(pose, hands="hands on hips", split_hands=True)
        assert "hands on hips" not in text

    def test_holding_prepends_holding(self, pose):
        (text,) = run_pose(pose, holding="sword")
        assert "holding sword" in text

    def test_legs_included(self, pose):
        (text,) = run_pose(pose, legs="legs together")
        assert "legs together" in text

    def test_feet_included(self, pose):
        (text,) = run_pose(pose, feet="bare feet")
        assert "bare feet" in text

    def test_action_included(self, pose):
        (text,) = run_pose(pose, action_selected="walking")
        assert "walking" in text

    def test_extra_included(self, pose):
        (text,) = run_pose(pose, extra="from behind")
        assert "from behind" in text

    def test_dash_dash_ignored(self, pose):
        (text,) = run_pose(pose, stance="--", posture="--")
        assert "--" not in text

    def test_pose_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, stance="standing", posture="contrapposto")
        assert "(standing, contrapposto)" in text

    def test_action_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, action_selected="walking")
        assert "(walking)" in text

    def test_extra_group_in_parentheses(self, pose):
        (text,) = run_pose(pose, extra="from behind")
        assert "(from behind)" in text

    def test_all_empty_returns_empty(self, pose):
        (text,) = run_pose(pose)
        assert text == ""

    def test_cleanup_applied(self, pose):
        (text,) = run_pose(pose, stance="standing,")
        assert not text.endswith(",")


# --- SceneBuilder ---


class TestSceneBuilder:
    def test_view_included(self, scene):
        (text,) = run_scene(scene, view="from front")
        assert "from front" in text

    def test_angle_included(self, scene):
        (text,) = run_scene(scene, angle="from above")
        assert "from above" in text

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
            view="from front",
            angle="from above",
            framing="full body",
            time="daytime",
            sky="clear sky",
            location="indoors",
            effect="bokeh",
        )
        assert (
            text
            == "(from front, from above, full body), (daytime, clear sky, indoors), (bokeh)"
        )
