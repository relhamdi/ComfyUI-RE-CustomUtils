import json

import pytest
from src.nodes.prompt_multi_picker import PromptMultiPicker


@pytest.fixture
def node():
    return PromptMultiPicker()


# --- Base cases ---


def run(node, **kwargs):
    defaults = dict(join=", ", options="", selected="[]")
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
    (text,) = run(node, join=" | ", options="a\nb\nc", selected=json.dumps(["a", "b"]))
    assert text == "a | b"


def test_empty_selection_returns_empty(node):
    (text,) = run(node, options="a\nb", selected="[]")
    assert text == ""


def test_empty_selection_with_extra_returns_extra(node):
    (text,) = run(node, options="a\nb", selected="[]", extra="base text")
    assert text == "base text"


def test_extra_chained_before_result(node):
    (text,) = run(node, options="a\nb", selected=json.dumps(["a"]), extra="base text")
    assert text == "base text, a"


def test_extra_custom_join(node):
    (text,) = run(
        node, options="a\nb", selected=json.dumps(["a"]), extra="base", join=" | "
    )
    assert text == "base | a"


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


def test_value_not_in_options_ignored(node):
    (text,) = run(node, options="a\nb", selected=json.dumps(["c"]))
    assert text == ""


def test_no_options_returns_extra(node):
    (text,) = run(node, options="", selected=json.dumps(["a"]), extra="base")
    assert text == "base"
