import pytest
from src.nodes.prompt_layout_filler import PromptLayoutFiller


@pytest.fixture
def node():
    return PromptLayoutFiller()


def run(node, template, cleanup=False, **slots):
    return node.process(template=template, cleanup=cleanup, preset_data="{}", **slots)


# --- Base cases ---


def test_single_slot(node):
    (text,) = run(node, "character, {0}", slot_0="sitting down")
    assert text == "character, sitting down"


def test_two_slots(node):
    (text,) = run(node, "character, {0}, {1}", slot_0="sitting down", slot_1="field")
    assert text == "character, sitting down, field"


def test_slot_with_label(node):
    (text,) = run(
        node,
        "character, {0:position}, {1:background}",
        slot_0="sitting down",
        slot_1="field",
    )
    assert text == "character, sitting down, field"


def test_label_with_spaces(node):
    (text,) = run(node, "{0:my position}", slot_0="sitting down")
    assert text == "sitting down"


def test_label_with_underscores(node):
    (text,) = run(node, "{0:my_position}", slot_0="sitting down")
    assert text == "sitting down"


def test_empty_slot_value(node):
    # Connected slot but empty value
    (text,) = run(node, "character, {0}", slot_0="")
    assert text == "character, "


def test_repeated_placeholder(node):
    # Same placeholder used twice
    (text,) = run(node, "{0} and {0}", slot_0="hello")
    assert text == "hello and hello"


def test_no_placeholders(node):
    (text,) = run(node, "character, sitting down")
    assert text == "character, sitting down"


def test_unused_slot_connected(node):
    # slot_1 connected but not used in the template
    (text,) = run(node, "character, {0}", slot_0="sitting down", slot_1="field")
    assert text == "character, sitting down"


# --- Error raised ---


def test_missing_slot(node):
    with pytest.raises(ValueError, match="not connected"):
        run(node, "character, {0}", slot_0=None)


def test_placeholder_out_of_range(node):
    with pytest.raises(ValueError, match="exceeds maximum"):
        out_slot = PromptLayoutFiller.NUM_SLOTS + 1
        run(node, f"{{{out_slot}}}")


def test_empty_template(node):
    with pytest.raises(ValueError, match="empty"):
        run(node, "")


def test_validate_valid(node):
    # No error if template without placeholders
    (text,) = run(node, "character, sitting down")
    assert text == "character, sitting down"


# --- Cleanup (see test file for function behavior) ---


def test_cleanup_applied(node):
    (text,) = run(
        node,
        template="({0})",
        cleanup=True,
        slot_0="",
    )
    assert text == ""


def test_cleanup_not_applied(node):
    (text,) = run(
        node,
        template="({0})",
        cleanup=False,
        slot_0="",
    )
    assert text == "()"


def test_cleanup_comma_residual(node):
    (text,) = run(
        node,
        template="tag, {0}, other",
        cleanup=True,
        slot_0="",
    )
    assert text == "tag, other"
