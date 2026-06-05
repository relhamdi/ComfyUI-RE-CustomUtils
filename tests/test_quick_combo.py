import pytest
from src.config import EMPTY_VALUE
from src.nodes.quick_combo import QuickCombo


@pytest.fixture
def node():
    return QuickCombo()


def run(node, options, selected, one_based=False):
    return node.process(
        options=options,
        selected=selected,
        one_based=one_based,
    )


# --- Base cases ---


def test_simple_selection(node):
    value, index = run(node, "neutral, happy, sad", "happy")
    assert value == "happy"
    assert index == 1


def test_first_option(node):
    value, index = run(node, "neutral, happy, sad", "neutral")
    assert value == "neutral"
    assert index == 0


def test_last_option(node):
    value, index = run(node, "neutral, happy, sad", "sad")
    assert value == "sad"
    assert index == 2


def test_empty_selected(node):
    value, index = run(node, "neutral, happy", EMPTY_VALUE)
    assert value == ""
    assert index == 0


def test_empty_options(node):
    value, index = run(node, "", EMPTY_VALUE)
    assert value == ""
    assert index == 0


def test_whitespace_trimmed(node):
    value, index = run(node, "  neutral  ,  happy  ,  sad  ", "happy")
    assert value == "happy"
    assert index == 1


def test_selected_not_in_list(node):
    # Selected value no longer in list, fallback to index 0
    value, index = run(node, "neutral, happy", "sad")
    assert value == "sad"
    assert index == 0


def test_one_based_index(node):
    value, index = run(
        node,
        options="neutral, happy, sad",
        selected="happy",
        one_based=True,
    )
    assert value == "happy"
    assert index == 2  # 1-based


def test_zero_based_default(node):
    value, index = run(
        node,
        options="neutral, happy, sad",
        selected="happy",
        one_based=False,
    )
    assert value == "happy"
    assert index == 1  # 0-based


def test_one_based_first(node):
    value, index = run(
        node,
        options="neutral, happy",
        selected="neutral",
        one_based=True,
    )
    assert index == 1  # First element is 1, not 0
