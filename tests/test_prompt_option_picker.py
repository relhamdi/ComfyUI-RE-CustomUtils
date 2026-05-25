import pytest
from src.nodes.prompt_option_picker import PromptOptionPicker


@pytest.fixture
def node():
    return PromptOptionPicker()


def run(node, options, selected):
    return node.process(options=options, selected=selected)


# --- Base cases ---


def test_simple_selection(node):
    (value,) = run(node, "sitting down\nstanding up", "sitting down")
    assert value == "sitting down"


def test_second_option(node):
    (value,) = run(node, "sitting down\nstanding up", "standing up")
    assert value == "standing up"


def test_empty_option_displayed_as_dash(node):
    # -- displays an empty string
    (value,) = run(node, "sitting down\n\nstanding up", "--")
    assert value == ""


def test_single_option(node):
    (value,) = run(node, "only one", "only one")
    assert value == "only one"


def test_whitespace_only_lines(node):
    # Line with only whitespaces counts as empty
    (value,) = run(node, "a\n   \nb", "--")
    assert value == ""


def test_empty_options_returns_empty(node):
    (value,) = node.process(options="", selected="--")
    assert value == ""


# --- VALIDATE_INPUTS ---


def test_validate_empty_options():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="")
    assert result == True


def test_validate_whitespace_only():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="   ")
    assert result == True


def test_validate_valid():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="a\nb")
    assert result == True
