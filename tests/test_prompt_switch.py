import pytest
from src.nodes.prompt_switch import PromptSwitch


@pytest.fixture
def node():
    return PromptSwitch()


def run(node, on_true="", on_false="", condition=True):
    return node.process(on_true=on_true, on_false=on_false, condition=condition)


# --- Base cases ---


def test_condition_true(node):
    (text,) = run(node, on_true="hello", on_false="world", condition=True)
    assert text == "hello"


def test_condition_false(node):
    (text,) = run(node, on_true="hello", on_false="world", condition=False)
    assert text == "world"


def test_empty_on_true(node):
    (text,) = run(node, on_true="", on_false="world", condition=True)
    assert text == ""


def test_empty_on_false(node):
    (text,) = run(node, on_true="hello", on_false="", condition=False)
    assert text == ""


def test_both_empty(node):
    (text,) = run(node, on_true="", on_false="", condition=True)
    assert text == ""


def test_multiline_value(node):
    (text,) = run(node, on_true="line1\nline2", on_false="other", condition=True)
    assert text == "line1\nline2"


# --- With connected nodes (values passed as strings) ---


def test_connected_node_true(node):
    (text,) = run(
        node,
        on_true="masterpiece, detailed",
        on_false="simple",
        condition=True,
    )
    assert text == "masterpiece, detailed"


def test_connected_node_false(node):
    (text,) = run(
        node,
        on_true="detailed",
        on_false="{% preset_a | preset_b %}",
        condition=False,
    )
    assert text == "{% preset_a | preset_b %}"
