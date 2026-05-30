import { COLORS } from "./constants.js";
import { hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "PromptSwitch";

// --- Highlight ---

const updateInputColors = (node, condition) => {
    const trueInput = node.inputs?.find((inp) => inp.name === "on_true");
    const falseInput = node.inputs?.find((inp) => inp.name === "on_false");
    const trueWidget = node.widgets?.find((w) => w.name === "on_true");
    const falseWidget = node.widgets?.find((w) => w.name === "on_false");
    if (!trueInput || !falseInput) return;

    const trueActive =
        trueInput.link != null || (trueWidget?.value ?? "").trim() !== "";
    const falseActive =
        falseInput.link != null || (falseWidget?.value ?? "").trim() !== "";

    trueInput.color_on = trueActive
        ? condition
            ? COLORS.orange
            : COLORS.inactive
        : undefined;
    trueInput.color_off = trueInput.color_on;

    falseInput.color_on = falseActive
        ? condition
            ? COLORS.inactive
            : COLORS.blue
        : undefined;
    falseInput.color_off = falseInput.color_on;

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachSwitch = (node) => {
    if (node.type !== NODE_NAME) return;
    if (node._switchAttached) return;
    node._switchAttached = true;

    const trueWidget = node.widgets?.find((w) => w.name === "on_true");
    const falseWidget = node.widgets?.find((w) => w.name === "on_false");
    const conditionWidget = node.widgets?.find((w) => w.name === "condition");
    if (!conditionWidget) return;

    const refresh = () => {
        const condition = conditionWidget.value ?? true;
        updateInputColors(node, condition);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    // Input port colors
    hookWidget(conditionWidget, refresh);
    hookWidget(trueWidget, refresh);
    hookWidget(falseWidget, refresh);

    // Widget border via canvas
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        const trueWidget = node.widgets?.find((w) => w.name === "on_true");
        const falseWidget = node.widgets?.find((w) => w.name === "on_false");
        const trueInput = node.inputs?.find((inp) => inp.name === "on_true");
        const falseInput = node.inputs?.find((inp) => inp.name === "on_false");
        if (!trueWidget || !falseWidget) return;

        const condition =
            node.widgets?.find((w) => w.name === "condition")?.value ?? true;

        const drawBorder = (widget, color, input) => {
            // Skip if not connected AND widget value is empty
            const isConnected = input?.link != null;
            const hasValue = widget.value != null && widget.value.trim() !== "";
            if (!isConnected && !hasValue) return;

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
            drawBorder(falseWidget, COLORS.inactive, falseInput);
            drawBorder(trueWidget, COLORS.orange, trueInput);
        } else {
            drawBorder(trueWidget, COLORS.inactive, trueInput);
            drawBorder(falseWidget, COLORS.blue, falseInput);
        }
    };

    // Initial render
    refresh();
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
