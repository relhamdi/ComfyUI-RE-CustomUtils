import { hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "PromptSwitch";

const COLORS = {
    true: "#ff9800",
    false: "#64b5f6",
    inactive: "#888888",
};

// --- Highlight ---

const updateInputColors = (node, condition) => {
    const trueInput = node.inputs?.find((inp) => inp.name === "on_true");
    const falseInput = node.inputs?.find((inp) => inp.name === "on_false");
    if (!trueInput || !falseInput) return;

    trueInput.color_on = condition ? COLORS.true : COLORS.inactive;
    trueInput.color_off = condition ? COLORS.true : COLORS.inactive;

    falseInput.color_on = condition ? COLORS.inactive : COLORS.false;
    falseInput.color_off = condition ? COLORS.inactive : COLORS.false;

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachSwitch = (node) => {
    if (node.type !== NODE_NAME) return;
    if (node._switchAttached) return;
    node._switchAttached = true;

    const conditionWidget = node.widgets?.find((w) => w.name === "condition");
    if (!conditionWidget) return;

    // Input port colors
    hookWidget(conditionWidget, (value) => updateInputColors(node, value));

    // Widget border via canvas
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        const trueWidget = node.widgets?.find((w) => w.name === "on_true");
        const falseWidget = node.widgets?.find((w) => w.name === "on_false");
        if (!trueWidget || !falseWidget) return;

        const condition =
            node.widgets?.find((w) => w.name === "condition")?.value ?? true;

        const drawBorder = (widget, color) => {
            const x = 0;
            const y = widget.last_y - 2;
            const w = node.size[0];
            const h = widget.computedHeight ?? 20;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        };

        // Draw inactive first, active on top
        if (condition) {
            drawBorder(falseWidget, COLORS.inactive);
            drawBorder(trueWidget, COLORS.true);
        } else {
            drawBorder(trueWidget, COLORS.inactive);
            drawBorder(falseWidget, COLORS.false);
        }
    };

    // Initial render
    updateInputColors(node, conditionWidget.value ?? true);
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
            requestAnimationFrame(() => attachSwitch(node));
        };
    },
});
