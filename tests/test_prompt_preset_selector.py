import pytest
from src.nodes.prompt_preset_selector import PromptPresetSelector


@pytest.fixture
def node():
    return PromptPresetSelector()


def run(node, text, index=0, cleanup=False):
    return node.process(
        syntax="{% | %}",
        preset_index=index,
        text=text,
        cleanup=cleanup,
    )


# --- Base cases ---


def test_simple_index_0(node):
    text, idx, count = run(node, "I am {% happy | sad %} today")
    assert text == "I am happy today"
    assert idx == 0
    assert count == 2


def test_simple_index_1(node):
    text, _, _ = run(node, "I am {% happy | sad %} today", index=1)
    assert text == "I am sad today"


def test_empty_preset_first(node):
    text, _, count = run(node, "I am {% | sad %} today", index=0)
    assert text == "I am  today"
    assert count == 2


def test_empty_preset_second(node):
    text, _, _ = run(node, "I am {% happy | %} today", index=1)
    assert text == "I am  today"


def test_multiple_blocks_same_index(node):
    text, _, count = run(node, "{% a | b %} and {% c | d %}", index=1)
    assert text == "b and d"
    assert count == 2


def test_no_blocks(node):
    text, idx, count = run(node, "clean text")
    assert text == "clean text"
    assert count == 0


def test_three_presets(node):
    text, _, count = run(node, "{% a | b | c %}", index=2)
    assert text == "c"
    assert count == 3


# --- Error raised ---


def test_index_out_of_range(node):
    with pytest.raises(ValueError, match="out of range"):
        run(node, "{% a | b %}", index=5)


def test_inconsistent_counts(node):
    with pytest.raises(ValueError, match="inconsistent"):
        run(node, "{% a | b %} and {% c | d | e %}")


# --- Custom tags / separator ---


def test_custom_tags(node):
    result, _, _ = node.process(
        syntax="<< / >>",
        preset_index=1,
        text="I am << happy / sad >> today",
        cleanup=False,
    )
    assert result == "I am sad today"


# --- Cleanup ---


def test_cleanup_double_comma(node):
    text, _, _ = run(node, "tag1, {% a | %}, tag2", index=1, cleanup=True)
    assert text == "tag1, tag2"


# --- VALIDATE_INPUTS ---


def test_validate_empty_separator():
    result = PromptPresetSelector.VALIDATE_INPUTS(syntax="{% %}")
    assert result != True


def test_validate_same_tags():
    result = PromptPresetSelector.VALIDATE_INPUTS(syntax="% | %")
    assert result != True
