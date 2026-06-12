import { attachInlineSelector } from "./inline_selector.js";
import { createPresetManager } from "./preset_manager.js";
import {
    findWidget,
    hideWidget,
    registerNode,
    waitForWidget,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptFaceBuilder";

const SELECT_FIELDS = [
    "eye_details",
    "eye_state",
    "gaze",
    "blush",
    "mouth",
    "mouth_expression",
    "expression",
];
const EYE_FIELDS = ["eye_details", "eye_state", "gaze"];
const BOOL_FIELDS = ["show_eyes", "show_eyewear", "head_tilt"];

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of SELECT_FIELDS) {
        const w = findWidget(node, `${field}_selected`);
        if (w) state[`${field}_selected`] = w.value ?? "";
    }
    for (const field of BOOL_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? false;
    }
    return state;
};

const recallState = (node, state, selectors) => {
    for (const field of SELECT_FIELDS) {
        const key = `${field}_selected`;
        if (!(key in state)) continue;
        const w = findWidget(node, key);
        if (!w) continue;
        w.value = state[key];
        w.callback?.(state[key]);
        selectors[field]?.renderColored();
    }
    for (const field of BOOL_FIELDS) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachFaceBuilder = (node) => {
    const selectors = {};

    // --- Sort All button ---
    const sortAllBtn = node.addWidget("button", "⇅ Sort All", null, () => {
        for (const field of SELECT_FIELDS) selectors[field]?.sort();
    });

    // --- Inline selectors ---
    for (const field of SELECT_FIELDS) {
        const optionsWidget = findWidget(node, `${field}_options`);
        const selectedWidget = findWidget(node, `${field}_selected`);
        if (!optionsWidget || !selectedWidget) continue;
        hideWidget(selectedWidget);
        selectedWidget.hidden = true;

        const selector = attachInlineSelector(
            node,
            optionsWidget,
            selectedWidget,
            {
                placeholder: field.replace(/_/g, " "),
            },
        );
        if (selector) selectors[field] = selector;
    }

    // --- show_eyes → opacity on eye editors ---
    const showEyesWidget = findWidget(node, "show_eyes");
    if (showEyesWidget) {
        const updateEyeVisibility = (value) => {
            for (const field of EYE_FIELDS) {
                const editor = selectors[field]?.editor;
                if (editor) editor.style.opacity = value ? "1" : "0.4";
            }
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        };
        const originalCallback = showEyesWidget.callback;
        showEyesWidget.callback = function (value) {
            if (originalCallback) originalCallback.call(this, value);
            updateEyeVisibility(value);
        };
        updateEyeVisibility(showEyesWidget.value ?? true);
    }

    // --- Preset manager ---
    const { presetRow, exportImportRow } = createPresetManager(node, {
        nodeLabel: NODE_NAME,
        onCapture: () => captureState(node),
        onRecall: (state) => recallState(node, state, selectors),
    });

    const presetDataWidget = findWidget(node, "preset_data");
    if (presetDataWidget) {
        presetDataWidget.hidden = true;
    }
    node.widgets.push(presetRow);
    node.widgets.push(exportImportRow);
};

// --- Registration ---

registerNode(NODE_NAME, (node) =>
    waitForWidget(node, "eye_details_options", attachFaceBuilder),
);
