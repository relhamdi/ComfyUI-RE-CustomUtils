import { hideWidget, hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "QuickCombo";

const EMPTY_VALUE = "--";

// --- Helpers ---

const parseOptions = (raw) => {
    if (!raw?.trim()) return null;
    const options = raw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    return options.length > 0 ? options : null;
};

// --- Attach ---

const attachQuickCombo = (node) => {
    if (node.type !== NODE_NAME) return;
    if (node._quickComboAttached) return;
    node._quickComboAttached = true;

    const optionsWidget = node.widgets?.find((w) => w.name === "options");
    const selectedWidget = node.widgets?.find((w) => w.name === "selected");
    if (!optionsWidget || !selectedWidget) return;

    // Hide native STRING widget
    hideWidget(selectedWidget);
    // selectedWidget.hidden = true;
    // selectedWidget.computeSize = () => [0, -4];

    // Create frontend combo
    const comboWidget = node.addWidget(
        "combo",
        "_combo",
        EMPTY_VALUE,
        (value) => {
            selectedWidget.value = value;
        },
        { values: [EMPTY_VALUE] },
    );

    const refreshDropdown = () => {
        const options = parseOptions(optionsWidget.value);

        if (!options) {
            comboWidget.options.values = [EMPTY_VALUE];
            comboWidget.value = EMPTY_VALUE;
            selectedWidget.value = EMPTY_VALUE;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            return;
        }

        const current = selectedWidget.value;
        comboWidget.options.values = options;
        comboWidget.value = options.includes(current) ? current : options[0];

        selectedWidget.value = comboWidget.value;
        
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    hookWidget(optionsWidget, () => refreshDropdown());

    // Initial render
    refreshDropdown();
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
            requestAnimationFrame(() => attachQuickCombo(node));
        };
    },
});
