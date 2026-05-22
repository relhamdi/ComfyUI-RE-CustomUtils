import { DEFAULT_TEXT_COLOR } from "./constants.js";

// Hook into ComfyUI widget callback (reliable change detection)
export const hookWidget = (widget, onChange) => {
    if (!widget) return;
    const original = widget.callback;
    widget.callback = function (value) {
        if (original) original.call(this, value);
        onChange(value);
    };
};

// Escape HTML to prevent injections
export const escapeHtml = (str) =>
    str.replace(
        /[&<>"]/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
            })[c],
    );

// Loop over text nodes in the DOM
export const walkTextNodes = (root, callback) => {
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (callback(node) === false) return false;
        } else {
            for (const child of node.childNodes) {
                if (walk(child) === false) return false;
            }
        }
    };
    walk(root);
};

// Build range from offset on text node
export const buildRangeFromOffsets = (root, start, end) => {
    const range = document.createRange();
    let charCount = 0;
    let startFound = false;
    let complete = false;

    walkTextNodes(root, (node) => {
        const next = charCount + node.length;
        if (!startFound && next > start) {
            range.setStart(node, start - charCount);
            startFound = true;
        }
        if (startFound && next >= end) {
            range.setEnd(node, end - charCount);
            complete = true;
            return false;
        }
        charCount = next;
    });

    return complete ? range : null;
};

// Save current caret position in div
export const saveCaretPosition = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

// Restore caret position in div
export const restoreCaretPosition = (el, offset) => {
    const range = document.createRange();
    const sel = window.getSelection();
    let charCount = 0;
    let found = false;

    walkTextNodes(el, (node) => {
        const next = charCount + node.length;
        if (next >= offset) {
            range.setStart(node, offset - charCount);
            range.collapse(true);
            found = true;
            return false;
        }
        charCount = next;
    });

    if (!found) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
};

// Get selected word or at caret position
export const getSelectedOrWordAtCaret = (editor) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;

    const range = sel.getRangeAt(0);

    // First cae: selected text
    if (!range.collapsed) {
        return {
            text: range.toString().trim(),
            range: range.cloneRange(),
        };
    }

    // Second case: no selection
    const fullText = editor.innerText;
    const caretPos = saveCaretPosition(editor);

    // Look for delimiters
    const delimiters = /[,\n{}%()|]/;
    let start = caretPos;
    let end = caretPos;

    while (start > 0 && !delimiters.test(fullText[start - 1])) start--;
    while (end < fullText.length && !delimiters.test(fullText[end])) end++;

    // Trimming spaces
    let word = fullText.slice(start, end);
    const leftTrim = word.length - word.trimStart().length;
    const rightTrim = word.length - word.trimEnd().length;
    start += leftTrim;
    end -= rightTrim;
    word = word.trim();

    // After trimming, check if surrounded by parentheses in the original text
    const rawWord = fullText.slice(start, end);
    if (
        start > 0 &&
        end < fullText.length &&
        fullText[start - 1] === "(" &&
        fullText[end] === ")"
    ) {
        start -= 1;
        end += 1;
        word = fullText.slice(start, end);
    }

    if (!word) return null;

    // Rebuild the range on the word
    const wordRange = buildRangeFromOffsets(editor, start, end);
    if (!wordRange) return null;

    return { text: word, range: wordRange };
};

// Adjust weight on selected word
export const adjustWeight = (text, delta) => {
    const trimmed = text.trim();
    if (!trimmed) return text;

    const weighted = trimmed.match(/^\((.+):(-?\d+(?:\.\d+)?)\)$/s);
    if (weighted) {
        const tag = weighted[1];
        const weight = Math.round((parseFloat(weighted[2]) + delta) * 10) / 10;
        if (weight === 1.0) return text.replace(trimmed, tag);
        return text.replace(trimmed, `(${tag}:${weight.toFixed(1)})`);
    }

    const weight = Math.round((1.0 + delta) * 10) / 10;
    if (weight === 1.0) return text;
    return text.replace(trimmed, `(${trimmed}:${weight.toFixed(1)})`);
};

export const createEditor = (
    textarea,
    { activeColor = DEFAULT_TEXT_COLOR, onInput } = {},
) => {
    // Hide native textarea
    textarea.style.display = "none";

    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.spellcheck = false;
    editor.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 6px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #111;
        color: ${activeColor};
        font-family: monospace;
        font-size: 10px;
        white-space: pre-wrap;
        overflow-y: auto;
        outline: none;
        box-sizing: border-box;
        cursor: text;
        line-height: 1.5;
    `;

    textarea.parentNode.appendChild(editor);

    // --- Event listener - Input: Sync editor -> textarea ---
    editor.addEventListener("input", () => {
        const pos = saveCaretPosition(editor);
        textarea.value = editor.innerText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        if (onInput) onInput();
        restoreCaretPosition(editor, pos);
    });

    // --- Event listener - Paste: Sanitize text pasting to prevent errors with HTML coloration ---
    editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    });

    // --- Event listener - Keydown: Look for keyboard shortcuts ---
    editor.addEventListener("keydown", (e) => {
        // Enter - Add proper line break to track caret
        if (e.key === "Enter") {
            e.preventDefault();
            document.execCommand("insertLineBreak");
            return;
        }

        // Ctrl+Up/Down - Adjust weight on selected text
        if (!e.ctrlKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown"))
            return;
        e.preventDefault();

        const delta = e.key === "ArrowUp" ? 0.1 : -0.1;
        const selection = getSelectedOrWordAtCaret(editor);
        if (!selection) return;

        const adjusted = adjustWeight(selection.text, delta);
        if (adjusted === selection.text) return;

        // Save selected text length
        const adjustedLength = adjusted.length;

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(selection.range);
        document.execCommand("insertText", false, adjusted);

        // Reselect inserted text
        const pos = saveCaretPosition(editor);
        const newRange = buildRangeFromOffsets(
            editor,
            pos - adjustedLength,
            pos,
        );
        if (newRange) {
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    });

    return editor;
};
