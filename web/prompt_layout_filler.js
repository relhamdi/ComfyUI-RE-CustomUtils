import { createEditor, escapeHtml } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "PromptLayoutFiller";

const NUM_SLOTS = 10;

const COLORS = {
    connected: "#a5d6a7",
    missing: "#ef9a9a",
};

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
        const color = connectedSlots.has(idx)
            ? COLORS.connected
            : COLORS.missing;
        result += `<span style="color:${color}">${escapeHtml(match[0])}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
};

// --- Slot visibility ---

const updateSlotVisibility = (node) => {
    // Find the highest connected slot index
    let highestConnected = -1;
    for (let i = 0; i < NUM_SLOTS; i++) {
        const input = node.inputs?.find((inp) => inp.name === `slot_${i}`);
        if (input?.link != null) highestConnected = i;
    }

    for (let i = 0; i < NUM_SLOTS; i++) {
        const slotName = `slot_${i}`;
        const existingInput = node.inputs?.find((inp) => inp.name === slotName);
        const shouldBeVisible = i <= highestConnected + 1;
        const isConnected = existingInput?.link != null;

        if (shouldBeVisible && !existingInput) {
            // Add input if it should be visible but doesn't exist
            node.addInput(slotName, "STRING");
        } else if (!shouldBeVisible && existingInput && !isConnected) {
            // Remove input if it should be hidden and is not connected
            const idx = node.inputs.indexOf(existingInput);
            node.removeInput(idx);
        }
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
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
    if (node.type !== NODE_NAME) return;

    const templateWidget = node.widgets?.find((w) => w.name === "template");
    if (!templateWidget) return;

    const textarea = templateWidget.inputEl || templateWidget.element;
    if (!textarea?.parentNode) return;

    // Prevent double initialization
    if (textarea._editorAttached) return;
    textarea._editorAttached = true;

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

    // --- Connection change hook - Re-render when slots are connected or disconnected ---
    const originalConnectionChange = node.onConnectionsChange;
    node.onConnectionsChange = function (...args) {
        if (originalConnectionChange)
            originalConnectionChange.call(this, ...args);
        updateSlotVisibility(node);
        renderColored();
    };

    // --- Initial render ---
    updateSlotVisibility(node);
    renderColored();
};

// --- Registration ---

app.registerExtension({
    name: NODE_NAME,
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);

            const node = this;
            // Retry until widgets DOM is ready
            const tryAttach = () => {
                const templateWidget = node.widgets?.find(
                    (w) => w.name === "template",
                );
                if (templateWidget?.inputEl?.parentNode) {
                    attachEditor(node);
                } else {
                    requestAnimationFrame(tryAttach);
                }
            };
            requestAnimationFrame(tryAttach);
        };
    },
});
