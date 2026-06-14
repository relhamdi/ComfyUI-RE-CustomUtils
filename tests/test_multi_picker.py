import json

import pytest
from src.nodes.prompt_multi_picker import PromptMultiPicker


@pytest.fixture
def node():
    return PromptMultiPicker()


# --- Base cases ---


def run(node, **kwargs):
    defaults = dict(options="", selected="[]", join=", ", cleanup=True)
    defaults.update(kwargs)
    return node.process(**defaults)


def test_single_selected(node):
    (text,) = run(node, options="a\nb\nc", selected=json.dumps(["a"]))
    assert text == "a"


def test_multiple_selected_appearance_order(node):
    (text,) = run(node, options="a\nb\nc", selected=json.dumps(["c", "a"]))
    # Appearance order: a before c
    assert text == "a, c"


def test_custom_join(node):
    (text,) = run(node, options="a\nb\nc", selected=json.dumps(["a", "b"]), join=" | ")
    assert text == "a | b"


def test_empty_selection(node):
    (text,) = run(node, options="a\nb", selected="[]")
    assert text == ""


def test_dash_ignored(node):
    (text,) = run(node, options="--\na\nb", selected=json.dumps(["--", "a"]))
    assert "--" not in text
    assert "a" in text


def test_empty_lines_ignored(node):
    (text,) = run(node, options="\na\n\nb", selected=json.dumps(["a"]))
    assert text == "a"


def test_invalid_selected_json(node):
    (text,) = run(node, options="a\nb", selected="not json")
    assert text == ""


def test_cleanup_applied(node):
    (text,) = run(node, options="a,\nb", selected=json.dumps(["a,", "b"]), cleanup=True)
    assert ",," not in text
