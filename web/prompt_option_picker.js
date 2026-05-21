import { hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Node ---

function attachOptionPicker(node) {
    if (node.type !== "PromptOptionPicker") return;

    const optionsWidget = node.widgets?.find((w) => w.name === "options");
    const selectedWidget = node.widgets?.find((w) => w.name === "selected");

    if (!optionsWidget || !selectedWidget) return;
    if (optionsWidget._optionPickerAttached) return;
    optionsWidget._optionPickerAttached = true;

    const parseOptions = () => {
        const raw = optionsWidget.value ?? "";
        if (!raw.trim()) return null;

        const lines = raw.split("\n").map((l) => l.trim());
        const hasContent = lines.some((l) => l !== "");
        if (!hasContent) return null;

        return lines.map((l) => (l === "" ? "--" : l));
    };

    const refreshDropdown = () => {
        const options = parseOptions();
        if (!options) {
            // Reset dropdown to default empty state
            selectedWidget.options.values = ["--"];
            selectedWidget.value = "--";
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            return;
        }

        const current = selectedWidget.value;
        selectedWidget.options.values = options;
        selectedWidget.value = options.includes(current) ? current : options[0];

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    hookWidget(optionsWidget, () => refreshDropdown());

    // Initial refresh
    refreshDropdown();
}

// --- Registration ---

app.registerExtension({
    name: "PromptOptionPicker",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PromptOptionPicker") return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);
            const node = this;
            requestAnimationFrame(() => attachOptionPicker(node));
        };
    },
});
