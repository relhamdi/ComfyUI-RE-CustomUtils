import { COLORS } from "./constants.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawWidgetBorder,
    findWidget,
    registerNode,
    waitForWidgets,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptFaceBuilder";

const COMBO_FIELDS = [
    "pupils",
    "eye_details",
    "eye_state",
    "gaze",
    "blush",
    "mouth_state",
    "mouth_action",
    "expression",
    "head_angle",
];

const EYE_FIELDS = ["pupils", "eye_details", "gaze"];
const BOOL_FIELDS = ["show_eyes", "show_eyewear"];

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of COMBO_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "";
    }

    for (const field of BOOL_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? false;
    }
    return state;
};

const recallState = (node, state) => {
    for (const field of [...COMBO_FIELDS, ...BOOL_FIELDS]) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }

    updateEyeVisibility(node, findWidget(node, "show_eyes")?.value ?? true);
    updateEyewearVisibility(
        node,
        findWidget(node, "show_eyewear")?.value ?? false,
    );
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Visibility helpers ---

const updateEyeVisibility = (node, value) => {
    for (const field of EYE_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = !value;
    }
    // Color input dot
    const eyesInput = node.inputs?.find((inp) => inp.name === "eyes");
    if (eyesInput) {
        eyesInput.color_on = value ? undefined : COLORS.inactive;
        eyesInput.color_off = eyesInput.color_on;
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateEyewearVisibility = (node, value) => {
    // Color input dot
    const eyewearInput = node.inputs?.find((inp) => inp.name === "eyewear");
    if (eyewearInput) {
        eyewearInput.color_on = value ? undefined : COLORS.inactive;
        eyewearInput.color_off = eyewearInput.color_on;
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachFaceBuilder = (node) => {
    // --- show_eyes toggle ---
    const showEyesWidget = findWidget(node, "show_eyes");
    if (showEyesWidget) {
        const original = showEyesWidget.callback;
        showEyesWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateEyeVisibility(node, value);
        };
        updateEyeVisibility(node, showEyesWidget.value ?? true);
    }

    // --- show_eyewear toggle ---
    const showEyewearWidget = findWidget(node, "show_eyewear");
    if (showEyewearWidget) {
        const original = showEyewearWidget.callback;
        showEyewearWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateEyewearVisibility(node, value);
        };
        updateEyewearVisibility(node, showEyewearWidget.value ?? false);
    }

    // Draw border on toggles for visibility
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);
        drawWidgetBorder(
            ctx,
            node,
            "show_eyes",
            COLORS.toggle_on,
            COLORS.toggle_off,
        );
        drawWidgetBorder(
            ctx,
            node,
            "show_eyewear",
            COLORS.toggle_on,
            COLORS.toggle_off,
        );
    };

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

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachFaceBuilder));
