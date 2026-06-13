import { COLORS } from "./constants.js";
import {
    createEditor,
    escapeHtml,
    hookWidget,
    restoreCaretPosition,
    saveCaretPosition,
} from "./utils.js";

// --- Constants ---

const SELECTED_COLOR = COLORS.orange;
const EMPTY_LINE_COLOR = COLORS.inactive;
const PLACEHOLDER_COLOR = COLORS.inactive;

// --- Helpers ---

const getNonEmptyLines = (text) =>
    text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

const buildHighlightedHtml = (raw, selectedValue, placeholder) => {
    const trimmed = raw.trim();

    // Placeholder if empty
    if (!trimmed) {
        return `<span style="color:${PLACEHOLDER_COLOR};pointer-events:none;user-select:none">${placeholder}...</span>`;
    }

    return raw
        .split("\n")
        .map((line) => {
            const t = line.trim();
            if (!t) return `<span style="color:${EMPTY_LINE_COLOR}"></span>`;
            const color = t === selectedValue ? SELECTED_COLOR : COLORS.text;
            return `<span style="color:${color}">${escapeHtml(line)}</span>`;
        })
        .join("\n");
};

const getLineAtY = (editor, clientY) => {
    const range = document.caretRangeFromPoint?.(
        editor.getBoundingClientRect().left + 4,
        clientY,
    );
    if (!range) return null;

    const preRange = document.createRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.startContainer, range.startOffset);
    const offset = preRange.toString().length;

    const text = editor.innerText;
    const lines = text.split("\n");
    let charCount = 0;
    for (const line of lines) {
        charCount += line.length + 1;
        if (charCount > offset) return line.trim();
    }
    return null;
};

// --- Editor ---

export const attachInlineSelector = (
    node,
    optionsWidget,
    selectedWidget,
    { placeholder = "" } = {},
) => {
    const textarea = optionsWidget.inputEl || optionsWidget.element;
    if (!textarea?.parentNode) return null;

    if (textarea._inlineSelectorAttached) return null;
    textarea._inlineSelectorAttached = true;

    // Create editor
    const editor = createEditor(textarea, {
        onInput: () => {
            const lines = getNonEmptyLines(textarea.value);

            // Auto-select first if current selection gone
            if (lines.length && !lines.includes(selectedWidget.value)) {
                selectedWidget.value = lines[0];
            } else if (!lines.length) {
                selectedWidget.value = "";
            }

            renderColored();
        },
    });

    // --- Event listener - Input: Sync widget.value -> textarea ---
    textarea.addEventListener("input", () => {
        optionsWidget.value = textarea.value;
    });

    // Render
    const renderColored = () => {
        // Don't re-render if placeholder is showing and user is typing
        if (document.activeElement === editor && !textarea.value.trim()) return;

        const pos = saveCaretPosition(editor);
        editor.innerHTML = buildHighlightedHtml(
            textarea.value,
            selectedWidget.value,
            placeholder,
        );

        // Only restore caret if not showing placeholder
        if (textarea.value.trim()) {
            restoreCaretPosition(editor, pos);
        }
    };

    // --- Event listener - Focus/Blur: Show placeholder on blur if empty ---
    editor.addEventListener("focus", () => {
        if (!textarea.value.trim()) {
            editor.innerHTML = "";
        }
    });
    editor.addEventListener("blur", () => {
        if (!textarea.value.trim()) {
            renderColored();
        }
    });

    // --- Event listener - MouseDown: Click to select line ---
    editor.addEventListener("mousedown", (e) => {
        // Skip if placeholder is showing
        if (!textarea.value.trim()) return;

        requestAnimationFrame(() => {
            const line = getLineAtY(editor, e.clientY);
            if (!line) return;

            const lines = getNonEmptyLines(textarea.value);
            if (!lines.includes(line)) return;

            selectedWidget.value = line;
            renderColored();
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        });
    });

    // React to external selection changes
    hookWidget(selectedWidget, () => renderColored());

    // Initial render
    const lines = getNonEmptyLines(textarea.value);
    if (lines.length && !selectedWidget.value) {
        selectedWidget.value = lines[0];
    }
    renderColored();

    // Sort
    const sort = () => {
        const lines = getNonEmptyLines(textarea.value);
        const sorted = [...lines].sort((a, b) => a.localeCompare(b));
        const current = selectedWidget.value;
        textarea.value = sorted.join("\n");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        // Preserve selection
        if (sorted.includes(current)) {
            selectedWidget.value = current;
        }
        renderColored();
    };

    return { editor, renderColored, sort };
};
