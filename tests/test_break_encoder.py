import re
from unittest.mock import MagicMock

import pytest
import torch
from src.nodes.break_encoder import BreakEncoder
from src.utils import clean_prompt


def split_blocks(text, keyword, cleanup=True):
    """Mirror of the encode() split logic."""
    blocks = re.split(rf"\s*{re.escape(keyword)}\s*", text)
    blocks = [b.strip() for b in blocks]
    blocks = [b for b in blocks if b]
    if cleanup:
        blocks = [clean_prompt(b) for b in blocks]
        blocks = [b for b in blocks if b.strip()]
    return blocks


@pytest.fixture
def node():
    return BreakEncoder()


@pytest.fixture
def mock_clip():
    cond = torch.zeros(1, 10, 768)
    pooled = torch.zeros(1, 768)
    clip = MagicMock()
    clip.tokenize.return_value = MagicMock()
    clip.encode_from_tokens_scheduled.return_value = [[cond, {"pooled_output": pooled}]]
    return clip


def run(node, clip, text, keyword="BREAK", cleanup=False):
    return node.encode(clip, keyword, text, cleanup)


# --- Split logic ---


def test_split_basic():
    blocks = split_blocks("tag1\nBREAK\ntag2", "BREAK", cleanup=False)
    assert blocks == ["tag1", "tag2"]


def test_split_multiple_breaks():
    blocks = split_blocks("a\nBREAK\nb\nBREAK\nc", "BREAK", cleanup=False)
    assert blocks == ["a", "b", "c"]


def test_split_break_inline():
    blocks = split_blocks("tag1, BREAK, tag2", "BREAK", cleanup=False)
    assert blocks == ["tag1,", ", tag2"]


def test_split_custom_keyword():
    blocks = split_blocks("a\n---\nb", "---", cleanup=False)
    assert blocks == ["a", "b"]


def test_split_case_sensitive():
    # "break" lowercase should NOT match "BREAK"
    blocks = split_blocks("a\nbreak\nb", "BREAK", cleanup=False)
    assert blocks == ["a\nbreak\nb"]


def test_split_filters_empty_blocks():
    blocks = split_blocks("a\nBREAK\n\nBREAK\nb", "BREAK", cleanup=False)
    assert blocks == ["a", "b"]


def test_split_break_at_start():
    blocks = split_blocks("BREAK\na\nBREAK\nb", "BREAK", cleanup=False)
    assert blocks == ["a", "b"]


def test_split_break_at_end():
    blocks = split_blocks("a\nBREAK\nb\nBREAK", "BREAK", cleanup=False)
    assert blocks == ["a", "b"]


def test_split_whitespace_around_break():
    blocks = split_blocks("a  \n  BREAK  \n  b", "BREAK", cleanup=False)
    assert blocks == ["a", "b"]


# --- Cleanup integration ---


def test_split_cleanup_removes_double_commas():
    blocks = split_blocks("a,,b\nBREAK\nc", "BREAK", cleanup=True)
    assert ",," not in blocks[0]


def test_split_cleanup_empty_after_clean():
    # A block that becomes empty after cleanup should be filtered
    blocks = split_blocks("valid\nBREAK\n,,\nBREAK\nalso valid", "BREAK", cleanup=True)
    assert all(b.strip() for b in blocks)


# --- Validation ---


def test_empty_text_raises(node, mock_clip):
    with pytest.raises(ValueError, match="empty"):
        run(node, mock_clip, "   ")


def test_none_clip_raises(node):
    with pytest.raises(ValueError, match="CLIP"):
        run(node, None, "some text")


def test_empty_keyword_raises(node, mock_clip):
    with pytest.raises(ValueError, match="keyword"):
        run(node, mock_clip, "some text", keyword="  ")


def test_all_blocks_empty_after_cleanup_raises(node, mock_clip):
    with pytest.raises(ValueError, match="empty after cleanup"):
        run(node, mock_clip, ",, BREAK ,,", cleanup=True)


# --- Encoding ---


def test_encode_single_block(node, mock_clip):
    conditioning, text = run(node, mock_clip, "character, solo")
    assert conditioning is not None
    assert text == "character, solo"


def test_encode_two_blocks_concat(node):
    cond1 = MagicMock()
    cond1.shape = (1, 10, 768)
    cond2 = MagicMock()
    cond2.shape = (1, 5, 768)
    pooled = MagicMock()

    # Configure torch.cat
    concat_result = MagicMock()
    concat_result.shape = [1, 15, 768]
    torch.cat.return_value = concat_result

    clip = MagicMock()
    clip.tokenize.return_value = MagicMock()
    clip.encode_from_tokens_scheduled.side_effect = [
        [[cond1, {"pooled_output": pooled}]],
        [[cond2, {"pooled_output": pooled}]],
    ]
    conditioning, text = run(node, clip, "block1\nBREAK\nblock2")

    # Concatenated tensor should have seq_len = 10 + 5 = 15
    assert conditioning[0][0].shape[1] == 15
    assert text == "block1\n---\nblock2"


def test_encode_output_text_format(node, mock_clip):
    mock_clip.encode_from_tokens_scheduled.side_effect = [
        [[torch.zeros(1, 10, 768), {"pooled_output": torch.zeros(1, 768)}]],
        [[torch.zeros(1, 5, 768), {"pooled_output": torch.zeros(1, 768)}]],
        [[torch.zeros(1, 8, 768), {"pooled_output": torch.zeros(1, 768)}]],
    ]
    _, text = run(node, mock_clip, "a\nBREAK\nb\nBREAK\nc")
    assert text == "a\n---\nb\n---\nc"
