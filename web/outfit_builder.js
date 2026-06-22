import { COLORS, DISABLED_OPACITY } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawGroupBorder,
    findWidget,
    hideWidget,
    hookWidget,
    registerNode,
    waitForWidgets,
} from "./utils.js";
import { replaceWithInlineTextToggle } from "./widgets/inline_text_toggle_widget.js";

// --- Constants ---

const NODE_NAME = "OutfitBuilder";

const OVERRIDE_FIELDS = [
    "hat_override",
    "facewear_override",
    "neckwear_override",
    "coat_override",
    "midlayer_override",
    "top_override",
    "armwear_override",
    "accessories_override",
    "bottom_override",
    "legwear_override",
    "footwear_override",
];

const SOURCE_FIELDS = ["facewear_source", "neckwear_source", "armwear_source"];

const BOOL_FIELDS = ["use_bypass", ...OVERRIDE_FIELDS.map((f) => `${f}_mode`)];

const setInlineSelectorDisabled = (selectorInstance, disabled) => {
    if (!selectorInstance?.editor) return;
    selectorInstance.editor.style.opacity = disabled
        ? `${DISABLED_OPACITY}`
        : "1";
    selectorInstance.editor.style.pointerEvents = disabled ? "none" : "auto";
};

const applyQuickOverrideVisibility = (
    node,
    toggleWidgets,
    quickSelectorInstance,
) => {
    const useQuick = findWidget(node, "use_bypass")?.value ?? false;

    for (const field of OVERRIDE_FIELDS) {
        const helper = toggleWidgets[field];
        if (helper) helper.disabled = useQuick;
    }
    for (const field of SOURCE_FIELDS) {
        const w = findWidget(node, field);
        if (w) w.disabled = useQuick;
    }

    setInlineSelectorDisabled(quickSelectorInstance, !useQuick);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of BOOL_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? false;
    }
    for (const field of OVERRIDE_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "";
    }
    for (const field of SOURCE_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "outfit";
    }
    const optionsW = findWidget(node, "bypass_options");
    const selectedW = findWidget(node, "bypass_selected");
    if (optionsW) state.bypass_options = optionsW.value ?? "";
    if (selectedW) state.bypass_selected = selectedW.value ?? "";
    return state;
};

const recallState = (node, state) => {
    const fields = [
        ...BOOL_FIELDS,
        ...OVERRIDE_FIELDS,
        ...SOURCE_FIELDS,
        "bypass_options",
        "bypass_selected",
    ];
    for (const field of fields) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachOutfitBuilder = (node) => {
    const toggleWidgets = {};
    for (const field of OVERRIDE_FIELDS) {
        const textWidget = findWidget(node, field);
        const modeWidget = findWidget(node, `${field}_mode`);
        if (!textWidget || !modeWidget) continue;
        toggleWidgets[field] = replaceWithInlineTextToggle(
            node,
            textWidget,
            modeWidget,
        );
    }

    const quickOptions = findWidget(node, "bypass_options");
    const quickSelected = findWidget(node, "bypass_selected");
    let quickSelectorInstance = null;
    if (quickOptions && quickSelected) {
        hideWidget(quickSelected);
        attachInlineSelector(node, quickOptions, quickSelected, {
            placeholder: "quick override",
        });
    }

    const useQuickWidget = findWidget(node, "use_bypass");
    if (useQuickWidget) {
        hookWidget(useQuickWidget, () =>
            applyQuickOverrideVisibility(
                node,
                toggleWidgets,
                quickSelectorInstance,
            ),
        );
    }
    applyQuickOverrideVisibility(node, toggleWidgets, quickSelectorInstance);

    const groups = [
        { from: "hat_override", to: "hat_override", color: COLORS.blue },
        { from: "facewear_override", to: "facewear_source" },
        { from: "neckwear_override", to: "neckwear_source" },
        { from: "top_override", to: "top_override", color: COLORS.blue },
        { from: "armwear_override", to: "armwear_source" },
        { from: "bottom_override", to: "bottom_override", color: COLORS.blue },
        {
            from: "footwear_override",
            to: "footwear_override",
            color: COLORS.blue,
        },
    ];
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        for (const group of groups) {
            drawGroupBorder(
                ctx,
                node,
                group.from,
                group.to,
                group.color ?? COLORS.highlight,
            );
        }
    };

    // --- Preset manager ---
    const { presetRow, exportImportRow } = createPresetManager(node, {
        nodeLabel: NODE_NAME,
        onCapture: () => captureState(node),
        onRecall: (state) => {
            recallState(node, state);
            applyQuickOverrideVisibility(
                node,
                toggleWidgets,
                quickSelectorInstance,
            );
        },
    });

    node.widgets.push(presetRow);
    node.widgets.push(exportImportRow);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachOutfitBuilder));
