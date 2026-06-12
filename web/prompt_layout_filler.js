import { COLORS } from "./constants.js";
import { createPresetManager } from "./preset_manager.js";
import {
    createEditor,
    debounce,
    escapeHtml,
    findWidget,
    registerNode,
    updateSlotVisibility,
    waitForWidget,
} from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

export const NODE_NAME = "PromptLayoutFiller";

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

// --- Source node helpers ---

const getSourceNode = (node, slotIndex) => {
    const input = node.inputs?.find((inp) => inp.name === `slot_${slotIndex}`);
    if (!input?.link) return null;
    const link = app.graph.links[input.link];
    if (!link) return null;
    return app.graph.getNodeById(link.origin_id) ?? null;
};

const getSourceLabel = (sourceNode) => {
    const widget = findWidget(sourceNode, "selected");
    if (!widget) return null;

    // Retrieve label from value through inverted _labelMap
    if (sourceNode._labelMap) {
        for (const [label, value] of sourceNode._labelMap.entries()) {
            if (value === widget.value) return label;
        }
    }
    return widget.value || null;
};

const setSourceByLabel = (sourceNode, label) => {
    const widget = findWidget(sourceNode, "selected");
    if (!widget) return false;

    // Check value exists in options
    const options = widget.options?.values ?? [];
    if (!options.includes(label)) return false;

    widget.value = sourceNode._labelMap?.get(label) ?? label;
    widget.callback?.(label);
    return true;
};

// --- Capture / Recall ---

const captureSlots = (node) => {
    const slots = {};
    for (let i = 0; i < NUM_SLOTS; i++) {
        const source = getSourceNode(node, i);
        if (!source) continue;
        const label = getSourceLabel(source);
        if (label !== null) slots[`slot_${i}`] = label;
    }
    return slots;
};

const recallSlots = (node, slots) => {
    const errors = [];

    for (const [slotName, label] of Object.entries(slots)) {
        const idx = parseInt(slotName.replace("slot_", ""));
        const source = getSourceNode(node, idx);

        if (!source) {
            errors.push(`${slotName}: source node is no longer connected.`);
            continue;
        }

        const ok = setSourceByLabel(source, label);
        if (!ok) {
            errors.push(
                `${slotName}: value "${label}" not found in source node options.`,
            );
        }
    }

    return errors;
};

// --- Editor ---

const attachEditor = (node) => {
    const templateWidget = findWidget(node, "template");
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

    // --- Preset manager ---

    const { presetRow, exportImportRow } = createPresetManager(node, {
        nodeLabel: NODE_NAME,
        onCapture: () => {
            const slots = captureSlots(node);
            if (!Object.keys(slots).length) {
                throw new Error("No connected slots to save.");
            }
            return slots;
        },
        onRecall: (state) => {
            const errors = recallSlots(node, state);
            if (errors.length) {
                alert(`[${NODE_NAME}] Recall errors:\n${errors.join("\n")}`);
            }
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },
    });

    // Insert preset widgets after preset_data
    const presetDataWidget = findWidget(node, "preset_data");
    if (presetDataWidget) {
        presetDataWidget.hidden = true;
        const idx = node.widgets.indexOf(presetDataWidget);
        node.widgets.splice(idx + 1, 0, presetRow);
        node.widgets.splice(idx + 2, 0, exportImportRow);
    }

    // --- Connection change ---

    const debouncedUpdate = debounce(() => {
        updateSlotVisibility(node, NUM_SLOTS, "slot");
        renderColored();
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
