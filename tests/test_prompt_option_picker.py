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


# --- Extra options ---


def test_extra_options_prepended(node):
    # extra_options are handled by JS, process just returns selected
    (value,) = node.process(
        options="sitting down\nstanding up",
        selected="from extra",
        extra_options="from extra\nother extra",
    )
    assert value == "from extra"


def test_extra_options_none(node):
    (value,) = node.process(
        options="sitting down",
        selected="sitting down",
        extra_options=None,
    )
    assert value == "sitting down"


# --- VALIDATE_INPUTS ---


def test_validate_empty_options():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="")
    assert result != True


def test_validate_whitespace_only():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="   ")
    assert result != True


def test_validate_valid():
    result = PromptOptionPicker.VALIDATE_INPUTS(options="a\nb")
    assert result == True
