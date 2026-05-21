import re


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
