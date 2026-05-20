import { hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Colors ---

const COLORS = {
    tag: "#ff9800",
    sep: "#ff9800",
    active: "#e0e0e0",
    inactive: "#555",
    ref: "#64b5f6",
};

// --- Helpers ---

// Escape HTML to prevent injections
const escapeHtml = (str) =>
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

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse the syntax param to { openTag, separator, closeTag }
const parseSyntax = (syntax) => {
    const parts = (syntax || "{% | %}").split(/\s+/);
    if (parts.length !== 3)
        return { openTag: "{%", separator: "|", closeTag: "%}" };
    return { openTag: parts[0], separator: parts[1], closeTag: parts[2] };
};

// Build preset names, using placeholders if less names than presets are found
const buildNames = (names, presetCount) => {
    const result = [...names];
    while (result.length < presetCount) {
        result.push(`preset_${result.length}`);
    }
    return result.slice(0, presetCount);
};

// Build pattern from syntax
const buildPattern = (syntax) => {
    const { openTag, closeTag } = parseSyntax(syntax);
    return new RegExp(
        escapeRegex(openTag) + "\\s*(.*?)\\s*" + escapeRegex(closeTag),
        "gs",
    );
};

// Get number of presets found
const getPresetCount = (text, syntax) => {
    const { separator } = parseSyntax(syntax);
    const matches = [...text.matchAll(buildPattern(syntax))];
    if (!matches.length) return 0;
    return Math.max(...matches.map((m) => m[1].split(separator).length));
};

// Hide ComfyUI widget component
const hideWidget = (widgetName) => {
    widgetName.type = "hidden";
    widgetName.computeSize = () => [0, -4]; // -4 to cancel ComfyUI padding
};

// Save current caret position in div
const saveCaretPosition = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

// Loop over text nodes in the DOM
const walkTextNodes = (root, callback) => {
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
const buildRangeFromOffsets = (root, start, end) => {
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

// Restore caret position in div
const restoreCaretPosition = (el, offset) => {
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
const getSelectedOrWordAtCaret = (editor) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;

    const range = sel.getRangeAt(0);

    // First cae: Selected text
    if (!range.collapsed) {
        return {
            text: range.toString().trim(),
            range: range.cloneRange(),
        };
    }

    // Second case: No selection
    const fullText = editor.innerText;
    const caretPos = saveCaretPosition(editor);

    // Look for delimiters (commas, to avoid multi word prompts)
    const delimiters = /[,\n]/;
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

    if (!word) return null;

    // Rebuild the range on the word
    const wordRange = buildRangeFromOffsets(editor, start, end);
    if (!wordRange) return null;

    return { text: word, range: wordRange };
};

// Adjust weight on selected word
const adjustWeight = (text, delta) => {
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

// --- Editor ---

function buildHighlightedHtml(raw, syntax, presetIndex) {
    const { openTag, separator, closeTag } = parseSyntax(syntax);
    const pattern = buildPattern(syntax);
    let result = "";
    let lastIndex = 0;

    for (const match of raw.matchAll(pattern)) {
        // Text before the match, escaped
        result += escapeHtml(raw.slice(lastIndex, match.index));

        const parts = match[1].split(separator);

        const coloredParts = parts.map((part, i) => {
            const color = i === presetIndex ? COLORS.active : COLORS.inactive;
            const content =
                i === presetIndex
                    ? escapeHtml(part).replace(
                          /\$(\d+)/g,
                          `<span style="color:${COLORS.ref}">$$$1</span>`,
                      )
                    : escapeHtml(part);
            return `<span style="color:${color}">${content}</span>`;
        });

        const sepHtml = `<span style="color:${COLORS.sep}">${escapeHtml(separator)}</span>`;

        result +=
            `<span style="color:${COLORS.tag}">${escapeHtml(openTag)}</span> ` +
            coloredParts.join(sepHtml) +
            ` <span style="color:${COLORS.tag}">${escapeHtml(closeTag)}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
}

// Main function to attach the custom editor to the node
function attachEditor(node) {
    // Only apply to PromptPresetSelector custom node
    if (node.type !== "PromptPresetSelector") return;

    const textWidget = node.widgets?.find((w) => w.name === "text");
    const syntaxWidget = node.widgets?.find((w) => w.name === "syntax");
    const presetWidget = node.widgets?.find((w) => w.name === "preset_index");
    const comboWidget = node.widgets?.find((w) => w.name === "preset_name");
    const namesWidget = node.widgets?.find((w) => w.name === "preset_names");

    // Saving widget type
    const originalPresetType = presetWidget.type;

    if (!textWidget) return;

    // Hide preset_name
    hideWidget(comboWidget);

    const textarea = textWidget.inputEl || textWidget.element;
    if (!textarea?.parentNode) return;

    // Prevent double initialization
    if (textarea._editorAttached) return;
    textarea._editorAttached = true;

    // Hide native textarea
    textarea.style.display = "none";

    // Create contentEditable div
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
        color: ${COLORS.active};
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

    // State helpers
    const getPresetIndex = () => presetWidget?.value ?? 0;
    const getSyntax = () => syntaxWidget?.value ?? "{% | %}";

    // Render modes
    const renderColored = () => {
        const raw = textarea.value;
        editor.innerHTML = buildHighlightedHtml(
            raw,
            getSyntax(),
            getPresetIndex(),
        );
    };

    // --- Preset names / combo ---

    const destroyCombo = () => {
        // Hide preset_name
        hideWidget(comboWidget);

        presetWidget.type = originalPresetType;
        presetWidget.computeSize = null;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const buildCombo = (names) => {
        // Hide preset_index
        hideWidget(presetWidget);

        const savedIndex = presetWidget.value ?? 0;
        const safeIndex = savedIndex < names.length ? savedIndex : 0;

        comboWidget.options.values = names;
        comboWidget.value = names[safeIndex];
        comboWidget.type = "combo";
        comboWidget.computeSize = null;

        comboWidget.callback = (value) => {
            presetWidget.value = names.indexOf(value);
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            if (document.activeElement !== editor) renderColored();
        };

        presetWidget.value = safeIndex;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const parseNames = () => {
        const raw = namesWidget?.value;
        if (!raw || typeof raw !== "string") return null;
        const names = raw
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
        return names.length >= 1 ? names : null;
    };

    const refreshCombo = () => {
        const names = parseNames();
        if (!names) {
            destroyCombo();
            return;
        }

        const presetCount = getPresetCount(textarea.value, getSyntax());
        if (presetCount === 0) {
            destroyCombo();
            return;
        }

        buildCombo(buildNames(names, presetCount));
    };

    // --- Event listener - Input: Sync editor -> textarea ---
    editor.addEventListener("input", () => {
        const pos = saveCaretPosition(editor);
        textarea.value = editor.innerText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        refreshCombo();
        renderColored();
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

    // --- React to widget changes ---

    hookWidget(presetWidget, (value) => {
        const presetCount = getPresetCount(textarea.value, getSyntax());
        if (presetCount === 0) return;

        // Loop both ways on preset_index
        let newValue = value % presetCount;
        if (newValue < 0) newValue += presetCount;

        if (newValue !== value) {
            presetWidget.value = newValue;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        }

        if (document.activeElement !== editor) renderColored();
    });

    hookWidget(syntaxWidget, () => {
        refreshCombo();
        if (document.activeElement !== editor) renderColored();
    });

    hookWidget(namesWidget, () => {
        refreshCombo();
        if (document.activeElement !== editor) renderColored();
    });

    // Initial render
    refreshCombo();
    renderColored();
}

// --- Registration ---

app.registerExtension({
    name: "PromptPresetSelector",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PromptPresetSelector") return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);

            const node = this;
            // Retry until widgets DOM is ready
            const tryAttach = () => {
                const textWidget = node.widgets?.find((w) => w.name === "text");
                if (textWidget?.inputEl?.parentNode) {
                    attachEditor(node);
                } else {
                    requestAnimationFrame(tryAttach);
                }
            };
            requestAnimationFrame(tryAttach);
        };
    },
});
