import { COLORS } from "./constants.js";
import {
    createEditor,
    debounce,
    escapeHtml,
    registerNode,
    updateSlotVisibility,
    waitForWidget,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptLayoutFiller";

const NUM_SLOTS = 10;

// --- Helpers ---

const getPattern = () => /\{(\d+)(?::[^}\n]*)?\}/g;

// --- Highlight ---

const buildHighlightedHtml = (raw, connectedSlots) => {
    let result = "";
    let lastIndex = 0;

    for (const match of raw.matchAll(getPattern())) {
        // Text before the match
        result += escapeHtml(raw.slice(lastIndex, match.index));

        const idx = parseInt(match[1]);
        const color = connectedSlots.has(idx) ? COLORS.green : COLORS.red;
        result += `<span style="color:${color}">${escapeHtml(match[0])}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
};

const getConnectedSlots = (node) => {
    const connected = new Set();
    for (let i = 0; i < NUM_SLOTS; i++) {
        const input = node.inputs?.find((inp) => inp.name === `slot_${i}`);
        if (input?.link !== null && input?.link !== undefined) {
            connected.add(i);
        }
    }
    return connected;
};

// --- Editor ---

const attachEditor = (node) => {
    const templateWidget = node.widgets?.find((w) => w.name === "template");
    if (!templateWidget) return;

    const textarea = templateWidget.inputEl || templateWidget.element;
    if (!textarea?.parentNode) return;

    // Create contentEditable div
    const editor = createEditor(textarea, {
        onInput: () => renderColored(),
    });

    // --- State ---

    // Render modes
    const renderColored = () => {
        const connected = getConnectedSlots(node);
        editor.innerHTML = buildHighlightedHtml(textarea.value, connected);
    };

    const debouncedUpdate = debounce(() => {
        updateSlotVisibility(node, NUM_SLOTS, "slot");
    }, 64);

    // --- Connection change hook - Re-render when slots are connected or disconnected ---
    const originalConnectionChange = node.onConnectionsChange;
    node.onConnectionsChange = function (...args) {
        if (originalConnectionChange)
            originalConnectionChange.call(this, ...args);
        debouncedUpdate();
    };

    // Initial render
    updateSlotVisibility(node, NUM_SLOTS, "slot");
    renderColored();
};

// --- Registration ---

registerNode(NODE_NAME, (node) =>
    waitForWidget(node, "template", attachEditor),
);
