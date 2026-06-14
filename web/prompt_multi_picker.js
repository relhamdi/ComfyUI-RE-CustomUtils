import { COLORS, EMPTY_VALUE } from "./constants.js";
import {
    createEditor,
    escapeHtml,
    findWidget,
    hideWidget,
    hookWidget,
    registerNode,
    restoreCaretPosition,
    saveCaretPosition,
    waitForWidget,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptMultiPicker";

// Alternating colors for consecutive selected lines
const SELECTED_COLORS = [COLORS.cyan, COLORS.blue];
const EMPTY_LINE_COLOR = COLORS.inactive;

// --- Helpers ---

const getNonEmptyLines = (text) =>
    text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && l !== EMPTY_VALUE);

const parseSelected = (raw) => {
    try {
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const serializeSelected = (selected) => JSON.stringify(selected);

// --- Highlight ---

const buildHighlightedHtml = (raw, selectedSet) => {
    const lines = raw.split("\n");
    let selectedColorIndex = 0;

    return lines
        .map((line) => {
            const trimmed = line.trim();

            // Empty or separator line
            if (!trimmed || trimmed === EMPTY_VALUE) {
                return `<span style="color:${EMPTY_LINE_COLOR}"></span>`;
            }

            if (selectedSet.has(trimmed)) {
                const color =
                    SELECTED_COLORS[
                        selectedColorIndex % SELECTED_COLORS.length
                    ];
                selectedColorIndex++;
                return `<span style="color:${color}">${escapeHtml(line)}</span>`;
            }

            selectedColorIndex = 0; // Reset alternation on unselected line
            return `<span style="color:${COLORS.text}">${escapeHtml(line)}</span>`;
        })
        .join("\n");
};

// --- Line detection ---

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

// --- Attach ---

const attachMultiPicker = (node) => {
    const optionsWidget = findWidget(node, "options");
    const selectedWidget = findWidget(node, "selected");
    if (!optionsWidget || !selectedWidget) return;

    hideWidget(selectedWidget);

    const textarea = optionsWidget.inputEl || optionsWidget.element;
    if (!textarea?.parentNode) return;

    let clearBtn = null;

    // State
    let selectedSet = new Set(parseSelected(selectedWidget.value));

    const syncSelected = () => {
        // Preserve appearance order
        const lines = getNonEmptyLines(textarea.value);
        const ordered = lines.filter((l) => selectedSet.has(l));
        selectedWidget.value = serializeSelected(ordered);

        if (clearBtn) {
            clearBtn.name =
                selectedSet.size > 0
                    ? `✕ Clear All (${selectedSet.size})`
                    : "✕ Clear All";
        }
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const renderColored = () => {
        const pos = saveCaretPosition(editor);
        editor.innerHTML = buildHighlightedHtml(textarea.value, selectedSet);
        restoreCaretPosition(editor, pos);
    };

    // Clear All button
    clearBtn = node.addWidget("button", "✕ Clear All", null, () => {
        selectedSet.clear();
        syncSelected();
        renderColored();
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    });

    // Move Clear All after selected widget
    const selectedIdx = node.widgets.indexOf(selectedWidget);
    node.widgets.splice(selectedIdx + 1, 0, clearBtn);

    // Create editor
    const editor = createEditor(textarea, {
        normalize: true,
        onInput: () => {
            // Remove selected values that no longer exist
            const lines = new Set(getNonEmptyLines(textarea.value));
            for (const v of selectedSet) {
                if (!lines.has(v)) selectedSet.delete(v);
            }
            syncSelected();
            renderColored();
        },
    });

    // --- Event listener - MouseDown: Click to toggle line ---
    editor.addEventListener("mousedown", (e) => {
        if (!textarea.value.trim()) return;

        requestAnimationFrame(() => {
            const line = getLineAtY(editor, e.clientY);
            if (!line || line === EMPTY_VALUE) return;

            const lines = getNonEmptyLines(textarea.value);
            if (!lines.includes(line)) return;

            if (selectedSet.has(line)) {
                selectedSet.delete(line);
            } else {
                selectedSet.add(line);
            }

            syncSelected();
            renderColored();
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        });
    });

    // React to external changes
    hookWidget(selectedWidget, (raw) => {
        selectedSet = new Set(parseSelected(raw));
        renderColored();
    });

    // Initial render
    selectedSet = new Set(parseSelected(selectedWidget.value));
    renderColored();
    syncSelected();
};

// --- Registration ---

registerNode(NODE_NAME, (node) =>
    waitForWidget(node, "options", attachMultiPicker),
);
