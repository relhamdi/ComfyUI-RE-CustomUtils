import pytest
from src.utils import parse_options

# --- Plain options ---


def test_plain_options():
    result = parse_options("from front\nfrom behind")
    assert result == ["from front", "from behind"]


def test_empty_line():
    result = parse_options("from front\n\nfrom behind")
    assert result == ["from front", "", "from behind"]


def test_separator_outside_block():
    result = parse_options("from front\n---\nfrom behind")
    assert result == ["from front", "---", "from behind"]


# --- Combine blocks ---


def test_combine_two_lists():
    raw = "before\n@combine\na\nb\n---\nc\nd\n@end\nafter"
    result = parse_options(raw)
    assert "before" in result
    assert "after" in result
    assert "a, c" in result
    assert "a, d" in result
    assert "b, c" in result
    assert "b, d" in result
    assert len(result) == 6  # before + 4 combos + after


def test_combine_three_lists():
    raw = "@combine\na\n---\nb\n---\nc\n@end"
    result = parse_options(raw)
    assert result == ["a, b, c"]


def test_combine_empty_line_in_list():
    raw = "@combine\na\n\n---\nb\n@end"
    result = parse_options(raw)
    assert ", b" in result  # empty + b
    assert "a, b" in result


def test_multiple_combine_blocks():
    raw = "@combine\na\n---\nb\n@end\n@combine\nc\n---\nd\n@end"
    result = parse_options(raw)
    assert "a, b" in result
    assert "c, d" in result


# --- Validation errors ---


def test_combine_without_end():
    with pytest.raises(ValueError, match="unclosed @combine"):
        parse_options("@combine\na\n---\nb")


def test_end_without_combine():
    with pytest.raises(ValueError, match="without matching @combine"):
        parse_options("@end")


def test_nested_combine():
    with pytest.raises(ValueError, match="opened inside an unclosed"):
        parse_options("@combine\na\n@combine\nb\n@end\n@end")
