import { COLORS } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawGroupBorder,
    findWidget,
    hideWidget,
    hideWidgetInput,
    registerNode,
    setInputDotColor,
    waitForWidgets,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptPoseBuilder";

const COMBO_FIELDS = [
    "stance",
    "posture",
    "arms",
    "first_arm",
    "second_arm",
    "hands",
    "first_hand",
    "second_hand",
    "holding",
    "legs",
    "feet",
];

const SPLIT_ARMS_FIELDS = ["first_arm", "second_arm"];
const SINGLE_ARM_FIELDS = ["arms"];
const SPLIT_HANDS_FIELDS = ["first_hand", "second_hand"];
const SINGLE_HAND_FIELDS = ["hands"];
const BOOL_FIELDS = [
    "split_arms",
    "split_hands",
    "show_piercings",
    "show_upper_body",
    "show_lower_body",
];

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of COMBO_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "";
    }

    // Action inline selector
    const actionSelected = findWidget(node, "action_selected");
    if (actionSelected) state["action_selected"] = actionSelected.value ?? "";

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

    // Action
    if ("action_selected" in state) {
        const w = findWidget(node, "action_selected");
        if (w) {
            w.value = state["action_selected"];
            w.callback?.(state["action_selected"]);
        }
        actionSelector?.renderColored();
    }

    updateArmsVisibility(node, findWidget(node, "split_arms")?.value ?? false);
    updateHandsVisibility(
        node,
        findWidget(node, "split_hands")?.value ?? false,
    );
    updatePiercingsVisibility(
        node,
        findWidget(node, "show_piercings")?.value ?? true,
    );
    updateUpperBodyVisibility(
        node,
        findWidget(node, "show_upper_body")?.value ?? true,
    );
    updateLowerBodyVisibility(
        node,
        findWidget(node, "show_lower_body")?.value ?? true,
    );

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Visibility helpers ---

const updateArmsVisibility = (node, splitArms) => {
    for (const field of SPLIT_ARMS_FIELDS) {
        const w = findWidget(node, field);
        if (!w) continue;
        if (splitArms) {
            w.type = "combo";
            w.computeSize = null;
        } else {
            hideWidget(w);
        }
    }
    for (const field of SINGLE_ARM_FIELDS) {
        const w = findWidget(node, field);
        if (!w) continue;
        if (!splitArms) {
            w.type = "combo";
            w.computeSize = null;
        } else {
            hideWidget(w);
        }
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateHandsVisibility = (node, splitHands) => {
    for (const field of SPLIT_HANDS_FIELDS) {
        const w = findWidget(node, field);
        if (!w) continue;
        if (splitHands) {
            w.type = "combo";
            w.computeSize = null;
        } else {
            hideWidget(w);
        }
    }
    for (const field of SINGLE_HAND_FIELDS) {
        const w = findWidget(node, field);
        if (!w) continue;
        if (!splitHands) {
            w.type = "combo";
            w.computeSize = null;
        } else {
            hideWidget(w);
        }
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updatePiercingsVisibility = (node, value) => {
    setInputDotColor(node, "body_piercings", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateUpperBodyVisibility = (node, value) => {
    setInputDotColor(node, "upper_body", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const updateLowerBodyVisibility = (node, value) => {
    setInputDotColor(node, "lower_body", value);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachPoseBuilder = (node) => {
    let actionSelector = null;

    // --- Toggles ---

    const splitArmsWidget = findWidget(node, "split_arms");
    if (splitArmsWidget) {
        const original = splitArmsWidget.callback;
        splitArmsWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateArmsVisibility(node, value);
        };
        updateArmsVisibility(node, splitArmsWidget.value ?? false);
    }

    const splitHandsWidget = findWidget(node, "split_hands");
    if (splitHandsWidget) {
        const original = splitHandsWidget.callback;
        splitHandsWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateHandsVisibility(node, value);
        };
        updateHandsVisibility(node, splitHandsWidget.value ?? false);
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

    const showUpperBodyWidget = findWidget(node, "show_upper_body");
    if (showUpperBodyWidget) {
        const original = showUpperBodyWidget.callback;
        showUpperBodyWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateUpperBodyVisibility(node, value);
        };
        updateUpperBodyVisibility(node, showUpperBodyWidget.value ?? true);
    }

    const showLowerBodyWidget = findWidget(node, "show_lower_body");
    if (showLowerBodyWidget) {
        const original = showLowerBodyWidget.callback;
        showLowerBodyWidget.callback = function (value) {
            if (original) original.call(this, value);
            updateLowerBodyVisibility(node, value);
        };
        updateLowerBodyVisibility(node, showLowerBodyWidget.value ?? true);
    }

    const actionOptionsWidget = findWidget(node, "action_options");
    const actionSelectedWidget = findWidget(node, "action_selected");
    if (actionOptionsWidget && actionSelectedWidget) {
        hideWidget(actionSelectedWidget, true);
        hideWidgetInput(node, actionSelectedWidget);
        actionSelector = attachInlineSelector(
            node,
            actionOptionsWidget,
            actionSelectedWidget,
            {
                placeholder: "action",
            },
        );
    }

    // --- Borders ---

    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        const splitArms = findWidget(node, "split_arms")?.value ?? false;
        const splitHands = findWidget(node, "split_hands")?.value ?? false;
        const groups = [
            { from: "split_arms", to: splitArms ? "second_arm" : "arms" },
            { from: "split_hands", to: splitHands ? "second_hand" : "hands" },
            { from: "show_piercings", to: "show_piercings" },
            { from: "show_upper_body", to: "show_upper_body" },
            { from: "show_lower_body", to: "show_lower_body" },
        ];

        for (const group of groups) {
            drawGroupBorder(
                ctx,
                node,
                group.from,
                group.to,
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

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachPoseBuilder));
