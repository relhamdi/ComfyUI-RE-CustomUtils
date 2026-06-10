import { EMPTY_VALUE } from "./constants.js";
import {
    findWidget,
    hideWidget,
    hookWidget,
    parseComaString,
    registerNode,
    waitForWidgets,
} from "./utils.js";

// --- Constants ---

const NODE_NAME = "QuickCombo";

// --- Attach ---

const attachQuickCombo = (node) => {
    const optionsWidget = findWidget(node, "options");
    const selectedWidget = findWidget(node, "selected");
    if (!optionsWidget || !selectedWidget) return;

    // Hide native STRING widget
    hideWidget(selectedWidget);

    // Create frontend combo
    const comboWidget = node.addWidget(
        "combo",
        "combo",
        EMPTY_VALUE,
        (value) => {
            selectedWidget.value = value;
        },
        { values: [EMPTY_VALUE] },
    );

    const refreshDropdown = () => {
        const options = parseComaString(optionsWidget.value);

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

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachQuickCombo));
