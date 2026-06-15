import { COLORS } from "./constants.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawGroupBorder,
    findWidget,
    registerNode,
    setInputDotColor,
    waitForWidgets,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptFaceBuilder";

const COMBO_FIELDS = [
    "pupils",
    "eye_state",
    "gaze",
    "blush",
    "mouth_state",
    "mouth_expression",
    "emotion",
    "head_angle",
];

const EYE_FIELDS = ["pupils", "gaze"];
const EYEWEAR_FIELDS = ["eyewear_override"];
const NAIL_COLOR_FIELDS = ["nail_color_override"];
const BOOL_FIELDS = [
    "show_eyes",
    "show_eyewear",
    "show_piercings",
    "show_nails",
    "show_makeup",
];

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
        findWidget(node, "show_eyewear")?.value ?? true,
    );
    updatePiercingsVisibility(
        node,
        findWidget(node, "show_piercings")?.value ?? true,
    );

    const showNails = findWidget(node, "show_nails")?.value ?? true;
    const showMakeup = findWidget(node, "show_makeup")?.value ?? true;
    updateNailsVisibility(node, showNails, showMakeup);
    updateMakeupVisibility(node, showNails, showMakeup);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Visibility helpers ---

const updateEyeVisibility = (node, value) => {
    for (const field of EYE_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = !value;
    }
    setInputDotColor(node, "eyes", value);
    setInputDotColor(node, "eye_type", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateEyewearVisibility = (node, value) => {
    for (const field of EYEWEAR_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = !value;
    }
    setInputDotColor(node, "eyewear", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updatePiercingsVisibility = (node, value) => {
    setInputDotColor(node, "facial_piercings", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateNailsVisibility = (node, showNails, showMakeup) => {
    for (const field of NAIL_COLOR_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = !showNails || !showMakeup;
    }
    setInputDotColor(node, "nail_type", showNails);
    setInputDotColor(node, "nail_color", showNails && showMakeup);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateMakeupVisibility = (node, showNails, showMakeup) => {
    for (const field of NAIL_COLOR_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = !showNails || !showMakeup;
    }
    setInputDotColor(node, "makeup", showMakeup);
    setInputDotColor(node, "makeup_modifiers", showMakeup);
    setInputDotColor(node, "nail_color", showNails && showMakeup);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachFaceBuilder = (node) => {
    // --- Toggles ---

    const showEyesWidget = findWidget(node, "show_eyes");
    if (showEyesWidget) {
        const original = showEyesWidget.callback;
        showEyesWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateEyeVisibility(node, value);
        };
        updateEyeVisibility(node, showEyesWidget.value ?? true);
    }

    const showEyewearWidget = findWidget(node, "show_eyewear");
    if (showEyewearWidget) {
        const original = showEyewearWidget.callback;
        showEyewearWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateEyewearVisibility(node, value);
        };
        updateEyewearVisibility(node, showEyewearWidget.value ?? true);
    }

    const showPiercingsWidget = findWidget(node, "show_piercings");
    if (showPiercingsWidget) {
        const original = showPiercingsWidget.callback;
        showPiercingsWidget.callback = function (value) {
            if (original) original.call(this, value);
            updatePiercingsVisibility(node, value);
        };
        updatePiercingsVisibility(node, showPiercingsWidget.value ?? true);
    }

    const showNailsWidget = findWidget(node, "show_nails");
    const showMakeupWidget = findWidget(node, "show_makeup");
    if (showNailsWidget) {
        const original = showNailsWidget.callback;
        showNailsWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateNailsVisibility(node, value, showMakeupWidget.value ?? true);
        };
        updateNailsVisibility(
            node,
            showNailsWidget.value ?? true,
            showMakeupWidget.value ?? true,
        );
    }
    if (showMakeupWidget) {
        const original = showMakeupWidget.callback;
        showMakeupWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateMakeupVisibility(node, showNailsWidget.value ?? true, value);
        };
        updateMakeupVisibility(
            node,
            showNailsWidget.value ?? true,
            showMakeupWidget.value ?? true,
        );
    }

    // --- Borders ---

    const groups = [
        { start: "show_eyes", end: "gaze" },
        { start: "show_eyewear", end: "eyewear_override" },
        { start: "show_piercings", end: "show_piercings" },
        { start: "show_nails", end: "nail_color_override" },
        { start: "show_makeup", end: "show_makeup" },
    ];
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        for (const group of groups) {
            drawGroupBorder(
                ctx,
                node,
                group.start,
                group.end,
                COLORS.toggle_on,
                COLORS.toggle_off,
            );
        }
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
