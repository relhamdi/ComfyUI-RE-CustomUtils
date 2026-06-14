import { createPresetManager } from "./preset_manager.js";
import { findWidget, registerNode, waitForWidgets } from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptSceneBuilder";

const COMBO_FIELDS = [
    "view",
    "angle",
    "framing",
    "time",
    "sky",
    "location",
    "effect",
];

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of COMBO_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "";
    }
    return state;
};

const recallState = (node, state) => {
    for (const field of COMBO_FIELDS) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachSceneBuilder = (node) => {
    // --- Preset manager ---

    const { presetRow, exportImportRow } = createPresetManager(node, {
        nodeLabel: NODE_NAME,
        onCapture: () => captureState(node),
        onRecall: (state) => recallState(node, state),
    });

    node.widgets.push(presetRow);
    node.widgets.push(exportImportRow);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachSceneBuilder));
