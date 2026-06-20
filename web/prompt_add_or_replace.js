import { COLORS } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import {
    drawWidgetOutline,
    findWidget,
    hideWidget,
    hideWidgetInput,
    registerNode,
    waitForWidget,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptAddOrReplace";

// --- Attach ---

const attachAddOrReplace = (node) => {
    const optionsWidget = findWidget(node, "options");
    const selectedWidget = findWidget(node, "selected");
    const modeToggleWidget = findWidget(node, "mode_toggle");

    if (!optionsWidget || !selectedWidget || !modeToggleWidget) return;

    hideWidget(selectedWidget, true);
    hideWidgetInput(node, selectedWidget);

    // Inline selector
    attachInlineSelector(node, optionsWidget, selectedWidget, {
        placeholder: "options",
    });

    // Border around toggle
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);
        drawWidgetOutline(ctx, node, "mode_toggle", COLORS.toggle_on, COLORS.toggle_off);
    };
};

// --- Registration ---

registerNode(NODE_NAME, (node) =>
    waitForWidget(node, "options", attachAddOrReplace),
);
