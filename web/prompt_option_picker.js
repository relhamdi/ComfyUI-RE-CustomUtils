import { createEditor, escapeHtml, hookWidget } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const COLORS = {
    tag: "#ff9800",
    default: "#e0e0e0",
};

// --- Highlight ---

const buildHighlightedHtml = (raw) => {
    const lines = raw.split("\n");
    let inCombine = false;
    let result = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trim();
        const isLast = i === lines.length - 1;

        let color = COLORS.default;

        if (stripped === "@combine") {
            inCombine = true;
            color = COLORS.tag;
        } else if (stripped === "@end") {
            inCombine = false;
            color = COLORS.tag;
        } else if (stripped === "---" && inCombine) {
            color = COLORS.tag;
        }

        result += `<span style="color:${color}">${escapeHtml(line)}</span>`;
        if (!isLast) result += "\n";
    }

    return result;
};

// --- Option Parser (mirrors Python logic) ---

const parseOptions = (raw) => {
    const lines = raw.split("\n");
    const result = [];
    let inCombine = false;
    let currentBlock = [];
    let currentList = [];

    for (const line of lines) {
        const stripped = line.trim();

        if (stripped === "@combine") {
            if (inCombine) return null; // Invalid, let Python handle error
            inCombine = true;
            currentBlock = [];
            currentList = [];
        } else if (stripped === "@end") {
            if (!inCombine) return null;
            currentBlock.push(currentList);
            currentList = [];
            inCombine = false;

            // Cartesian product
            const combos = currentBlock.reduce(
                (acc, list) => {
                    const next = [];
                    for (const a of acc) {
                        for (const b of list) {
                            next.push(a ? `${a}, ${b}` : b);
                        }
                    }
                    return next;
                },
                [""],
            );

            for (const combo of combos) {
                result.push(combo || "--");
            }
        } else if (stripped === "---") {
            if (inCombine) {
                currentBlock.push(currentList);
                currentList = [];
            } else {
                result.push("---");
            }
        } else {
            if (inCombine) {
                currentList.push(line);
            } else {
                result.push(line === "" ? "--" : line);
            }
        }
    }

    // Unclosed block, let Python handle error
    if (inCombine) return null;

    return result.length > 0 ? result : null;
};

// --- Editor ---

const attachEditor = (node) => {
    if (node.type !== "PromptOptionPicker") return;

    const optionsWidget = node.widgets?.find((w) => w.name === "options");
    const selectedWidget = node.widgets?.find((w) => w.name === "selected");

    if (!optionsWidget || !selectedWidget) return;
    if (optionsWidget._editorAttached) return;
    optionsWidget._editorAttached = true;

    const textarea = optionsWidget.inputEl || optionsWidget.element;
    if (!textarea?.parentNode) return;

    // Create contentEditable div
    const editor = createEditor(textarea, {
        onInput: () => {
            refreshDropdown();
            renderColored();
        },
    });

    // Render modes
    const renderColored = () => {
        editor.innerHTML = buildHighlightedHtml(textarea.value);
    };

    const refreshDropdown = () => {
        const options = parseOptions(textarea.value);

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

    hookWidget(optionsWidget, () => {
        refreshDropdown();
        renderColored();
    });

    // Initial refresh
    refreshDropdown();
    renderColored();
};

// --- Registration ---

app.registerExtension({
    name: "PromptOptionPicker",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PromptOptionPicker") return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);

            const node = this;
            const tryAttach = () => {
                const optionsWidget = node.widgets?.find(
                    (w) => w.name === "options",
                );
                if (optionsWidget?.inputEl?.parentNode) {
                    attachEditor(node);
                } else {
                    requestAnimationFrame(tryAttach);
                }
            };
            requestAnimationFrame(tryAttach);
        };
    },
});
