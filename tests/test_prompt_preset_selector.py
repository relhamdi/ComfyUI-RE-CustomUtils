import pytest
from src.nodes.prompt_preset_selector import PromptPresetSelector


@pytest.fixture
def node():
    return PromptPresetSelector()


def run(node, text, index=0, preset_names="", cleanup=False):
    return node.process(
        syntax="{% | %}",
        preset_index=index,
        preset_names=preset_names,
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
        preset_names="",
        text="I am << happy / sad >> today",
        cleanup=False,
    )
    assert result == "I am sad today"


# --- Preset names ---


def test_preset_names_valid_count(node):
    text, _, count = run(node, "{% a | b | c %}", preset_names="neutral, happy, sad")
    assert count == 3


def test_preset_names_empty_ignored(node):
    text, _, _ = run(node, "{% a | b %}", preset_names="")
    assert text == "a"


def test_preset_names_mismatch_ignored(node):
    text, _, _ = run(node, "{% a | b %}", preset_names="neutral, happy, sad")
    assert text == "a"


def test_preset_names_single(node):
    text, _, _ = run(node, "{% a | b %}", preset_names="neutral")
    assert text == "a"


# --- References ---


def test_reference_basic(node):
    # Index 1, resolve reference
    text, _, _ = run(node, "{% hello | $0 world %}", index=1)
    assert text == "hello world"


def test_reference_index_0(node):
    # Index 0, nothing to resolve
    text, _, _ = run(node, "{% hello | $0 world %}", index=0)
    assert text == "hello"


def test_reference_out_of_range(node):
    with pytest.raises(ValueError, match="out of range"):
        run(node, "{% a | b | $5 %}", index=2)


def test_reference_not_yet_declared(node):
    with pytest.raises(ValueError, match="not yet declared"):
        run(node, "{% $1 | b %}", index=0)


def test_reference_circular(node):
    with pytest.raises(ValueError, match="circular"):
        run(node, "{% $0 | $0 %}", index=1)


def test_reference_chained(node):
    text, _, _ = run(node, "{% base | $0 mid | $1 top %}", index=2)
    assert text == "base mid top"


def test_reference_empty_preset(node):
    text, _, _ = run(node, "{% | $0 suffix %}", index=1)
    assert text == " suffix"


# --- Cleanup (see test file for function behavior) ---


def test_cleanup_applied(node):
    # Verify cleanup is triggered, not the rules themselves
    text, _, _ = run(node, "tag1, {% a | %}, tag2", index=1, cleanup=True)
    assert text == "tag1, tag2"


def test_cleanup_not_applied(node):
    # Verify cleanup can be disabled
    text, _, _ = run(node, "tag1, {% a | %}, tag2", index=1, cleanup=False)
    assert text == "tag1, , tag2"


# --- VALIDATE_INPUTS ---


def test_validate_empty_separator():
    result = PromptPresetSelector.VALIDATE_INPUTS(syntax="{% %}", preset_names="")
    assert result != True


def test_validate_same_tags():
    result = PromptPresetSelector.VALIDATE_INPUTS(syntax="% | %", preset_names="")
    assert result != True


def test_validate_preset_names_single_entry_valid():
    result = PromptPresetSelector.VALIDATE_INPUTS(
        syntax="{% | %}",
        preset_index=0,
        preset_names="neutral",  # Only one element
        text="",
        cleanup=False,
    )
    assert result == True
