import pytest
from src.nodes.prompt_add_or_replace import PromptAddOrReplace


@pytest.fixture
def node():
    return PromptAddOrReplace()


def run(node, **kwargs):
    defaults = dict(
        join=", ",
        mode_toggle=True,
        options="",
        selected="",
        input="",
    )
    defaults.update(kwargs)
    return node.process(**defaults)


# --- Add mode (mode_toggle=True) ---


def test_add_with_input_and_selected(node):
    (text,) = run(node, input="blue eyes", selected="sparkle", mode_toggle=True)
    assert text == "blue eyes, sparkle"


def test_add_no_selected_returns_input(node):
    (text,) = run(node, input="blue eyes", selected="", mode_toggle=True)
    assert text == "blue eyes"


def test_add_no_input_returns_selected(node):
    (text,) = run(node, input="", selected="sparkle", mode_toggle=True)
    assert text == "sparkle"


def test_add_both_empty_returns_empty(node):
    (text,) = run(node, input="", selected="", mode_toggle=True)
    assert text == ""


def test_add_dash_dash_selected_passthrough(node):
    (text,) = run(node, input="blue eyes", selected="--", mode_toggle=True)
    assert text == "blue eyes"


def test_add_custom_join(node):
    (text,) = run(
        node, input="blue eyes", selected="sparkle", join=" | ", mode_toggle=True
    )
    assert text == "blue eyes | sparkle"


def test_add_cleanup_applied(node):
    (text,) = run(node, input="blue eyes,", selected="sparkle", mode_toggle=True)
    assert ",," not in text


# --- Replace mode (mode_toggle=False) ---


def test_replace_with_selected_replaces_input(node):
    (text,) = run(node, input="blue eyes", selected="red eyes", mode_toggle=False)
    assert text == "red eyes"
    assert "blue eyes" not in text


def test_replace_no_selected_returns_empty(node):
    (text,) = run(node, input="blue eyes", selected="", mode_toggle=False)
    assert text == ""


def test_replace_dash_dash_returns_empty(node):
    (text,) = run(node, input="blue eyes", selected="--", mode_toggle=False)
    assert text == ""


def test_replace_no_input_returns_selected(node):
    (text,) = run(node, input="", selected="red eyes", mode_toggle=False)
    assert text == "red eyes"


def test_replace_both_empty_returns_empty(node):
    (text,) = run(node, input="", selected="", mode_toggle=False)
    assert text == ""
