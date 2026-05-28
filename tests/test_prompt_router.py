import pytest
from src.nodes.prompt_router import PromptRouter


@pytest.fixture
def node():
    return PromptRouter()


def make_prompt(unique_id, slot_titles):
    """
    Build a minimal prompt dict for testing.
    slot_titles: {input_name: title}
    """
    source_nodes = {}
    inputs = {}

    for i, (input_name, title) in enumerate(slot_titles.items()):
        source_id = str(100 + i)
        inputs[input_name] = [source_id, 0]
        source_nodes[source_id] = {
            "_meta": {"title": title},
            "class_type": "MockNode",
        }

    return {
        str(unique_id): {"inputs": inputs},
        **source_nodes,
    }


def run(node, selected, prompt=None, unique_id=None, **inputs):
    return node.process(
        selected=selected,
        _sub_selected="--",
        prompt=prompt,
        unique_id=unique_id,
        **inputs,
    )


# --- Base cases ---


def test_select_first(node):
    prompt = make_prompt(1, {"input_0": "position", "input_1": "background"})
    text, index = run(
        node,
        "0: position",
        prompt=prompt,
        unique_id=1,
        input_0="sitting down",
        input_1="field",
    )
    assert text == "sitting down"
    assert index == 0


def test_select_second(node):
    prompt = make_prompt(1, {"input_0": "position", "input_1": "background"})
    text, index = run(
        node,
        "1: background",
        prompt=prompt,
        unique_id=1,
        input_0="sitting down",
        input_1="field",
    )
    assert text == "field"
    assert index == 1


def test_router_indicator_in_label(node):
    # Label with ▶ indicator should also match
    prompt = make_prompt(1, {"input_0": "Router B"})
    text, index = run(
        node,
        "0: Router B ▶",
        prompt=prompt,
        unique_id=1,
        input_0="resolved value",
    )
    assert text == "resolved value"
    assert index == 0


def test_no_input_connected(node):
    text, index = run(node, "--")
    assert text == ""
    assert index == 0


def test_selected_dash(node):
    text, index = run(node, "--", prompt={}, unique_id=1)
    assert text == ""
    assert index == 0


def test_selected_not_found(node):
    # Selected references a title not in the mapping
    prompt = make_prompt(1, {"input_0": "position"})
    text, index = run(
        node,
        "1: background",
        prompt=prompt,
        unique_id=1,
        input_0="sitting down",
    )
    assert text == ""
    assert index == 0


def test_empty_value(node):
    # Connected input with empty string value
    prompt = make_prompt(1, {"input_0": "empty"})
    text, index = run(
        node,
        "0: empty",
        prompt=prompt,
        unique_id=1,
        input_0="",
    )
    assert text == ""
    assert index == 0


def test_bypassed_node_returns_empty(node):
    # Bypassed node passes empty string
    prompt = make_prompt(1, {"input_0": "bypassed"})
    text, index = run(
        node,
        "0: bypassed",
        prompt=prompt,
        unique_id=1,
        input_0="",
    )
    assert text == ""
    assert index == 0


def test_no_prompt(node):
    text, index = run(
        node,
        "0: position",
        prompt=None,
        unique_id=None,
        input_0="sitting down",
    )
    assert text == ""
    assert index == 0


def test_same_title_uses_index(node):
    # Two inputs with same title, index prefix disambiguates
    prompt = make_prompt(1, {"input_0": "option", "input_1": "option"})
    text, index = run(
        node,
        "1: option",
        prompt=prompt,
        unique_id=1,
        input_0="value_a",
        input_1="value_b",
    )
    assert text == "value_b"
    assert index == 1
