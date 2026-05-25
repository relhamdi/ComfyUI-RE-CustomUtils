import re
from itertools import product


def clean_prompt(text: str) -> str:
    """Clean up residual artifacts from empty presets or slots."""
    text = re.sub(r" +,", ",", text)  # Spaces before commas
    text = re.sub(r" {2,}", " ", text)  # Multiple spaces
    text = re.sub(r"\(\s*[,\s]*\)", "", text)  # Empty or comma-only parentheses
    text = re.sub(r"\[\s*[,\s]*\]", "", text)  # Empty or comma-only brackets
    text = re.sub(r"\(\s*,+\s*", "(", text)  # Comma after opening paren
    text = re.sub(r"\s*,+\s*\)", ")", text)  # Comma before closing paren
    text = re.sub(r",\s*,", ",", text)  # Double or empty commas
    text = re.sub(r"^\s*,\s*", "", text, flags=re.MULTILINE)  # Leading comma
    text = re.sub(r"\n\s*\n", "\n", text)  # Empty lines
    return text.strip()


def parse_options(raw: str) -> list[str]:
    """
    Parse the options field into a flat list of options.

    Supports:
    - Plain lines: direct options
    - @combine / @end blocks: cartesian product of --- separated lists
    - Empty lines: empty option (displayed as --)
    - --- outside a block: treated as a literal option
    """
    lines = raw.split("\n")
    result = []
    in_combine = False
    current_block: list[list[str]] = []
    current_list: list[str] = []

    # Remove trailing empty line from paste artifacts
    if lines and lines[-1].strip() == "" and len(lines) > 1:
        lines = lines[:-1]

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        if stripped == "@combine":
            if in_combine:
                raise ValueError(
                    f"parse_options: @combine at line {i} opened inside an unclosed @combine block."
                )
            in_combine = True
            current_block = []
            current_list = []

        elif stripped == "@end":
            if not in_combine:
                raise ValueError(
                    f"parse_options: @end at line {i} without matching @combine."
                )
            # Save last list
            current_block.append(current_list)
            current_list = []
            in_combine = False

            # Generate cartesian product
            for combo in product(*current_block):
                result.append(", ".join(combo))

        elif stripped == "---":
            if in_combine:
                # Separator between lists in a combine block
                current_block.append(current_list)
                current_list = []
            else:
                # Outside a block, treat as literal option
                result.append("---")

        else:
            if in_combine:
                current_list.append(line)
            else:
                result.append(line)

    if in_combine:
        raise ValueError("parse_options: unclosed @combine block — missing @end.")

    return result
