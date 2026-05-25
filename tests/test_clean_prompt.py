from src.utils import clean_prompt

# --- Tests clean prompt ---


def test_space_before_comma():
    assert clean_prompt("tag , other") == "tag, other"


def test_double_comma():
    assert clean_prompt("tag,, other") == "tag, other"


def test_empty_comma():
    assert clean_prompt("tag, , other") == "tag, other"


def test_empty_lines():
    assert clean_prompt("tag\n\nother") == "tag\nother"


def test_strip():
    assert clean_prompt("  tag  ") == "tag"


def test_multiple_spaces():
    assert clean_prompt("tag,  other") == "tag, other"


def test_empty_parentheses():
    # () is removed, leaving a double comma cleaned up
    assert clean_prompt("tag, (), other") == "tag, other"


def test_comma_only_parentheses():
    # (,) is removed, leaving a double comma cleaned up
    assert clean_prompt("tag, (,), other") == "tag, other"


def test_empty_brackets():
    # [] is removed, leaving a double comma cleaned up
    assert clean_prompt("tag, [], other") == "tag, other"


def test_comma_only_brackets():
    # [,] is removed, leaving a double comma cleaned up
    assert clean_prompt("tag, [,], other") == "tag, other"


def test_comma_after_opening_paren():
    assert clean_prompt("(, tag, other)") == "(tag, other)"


def test_comma_before_closing_paren():
    assert clean_prompt("(tag, other ,)") == "(tag, other)"


def test_leading_comma():
    assert clean_prompt(", tag, other") == "tag, other"


def test_leading_comma_multiline():
    # leading comma on second line
    assert clean_prompt("line1\n, line2") == "line1\nline2"


# --- Combined cases ---


def test_empty_preset_in_parentheses():
    # (tag, <empty>, other) after preset replacement
    assert clean_prompt("(detailed face, , lipstick)") == "(detailed face, lipstick)"


def test_empty_parentheses_from_preset():
    # () removed then leading comma cleaned
    assert clean_prompt("(), detailed") == "detailed"


def test_full_cleanup_chain():
    assert clean_prompt("(, , ), tag,  , other, ()") == "tag, other,"
