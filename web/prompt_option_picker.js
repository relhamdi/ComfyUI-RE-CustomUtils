import { COLORS, EMPTY_VALUE } from "./constants.js";
import { createEditor, escapeHtml, hookWidget, registerNode, waitForWidget } from "./utils.js";

// --- Constants ---

const NODE_NAME = "PromptOptionPicker";

const EMPTY_SENTINEL = "\u200B";

// --- Highlight ---

const buildHighlightedHtml = (raw) => {
    const lines = raw.split("\n");
    let inCombine = false;
    let result = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trim();
        const isLast = i === lines.length - 1;

        let lineHtml;
        const sep = "$:";

        if (stripped === "@combine") {
            inCombine = true;
            lineHtml = `<span style="color:${COLORS.orange}">${escapeHtml(line)}</span>`;
        } else if (stripped === "@end") {
            inCombine = false;
            lineHtml = `<span style="color:${COLORS.orange}">${escapeHtml(line)}</span>`;
        } else if (stripped === "---" && inCombine) {
            lineHtml = `<span style="color:${COLORS.orange}">${escapeHtml(line)}</span>`;
        } else if (!inCombine && stripped.includes(" $: ")) {
            // "label $: value"
            const sep = " $: ";
            const sepIdx = line.indexOf(sep);
            const label = line.slice(0, sepIdx);
            const value = line.slice(sepIdx + 4);
            lineHtml =
                `<span style="color:${COLORS.cyan}">${escapeHtml(label)}</span>` +
                `<span style="color:${COLORS.inactive}">${escapeHtml(sep)}</span>` +
                `<span style="color:${COLORS.text}">${escapeHtml(value)}</span>`;
        } else if (!inCombine && stripped.startsWith("$: ")) {
            // "$: value", no label
            const sep = "$: ";
            const value = line.slice(line.indexOf(sep) + 3);
            lineHtml =
                `<span style="color:${COLORS.inactive}">${escapeHtml(sep)}</span>` +
                `<span style="color:${COLORS.text}">${escapeHtml(value)}</span>`;
        } else {
            lineHtml = `<span style="color:${COLORS.text}">${escapeHtml(line)}</span>`;
        }

        result += lineHtml;
        if (!isLast) result += "\n";
    }

    return result;
};

// --- Option Parser (mirrors Python logic) ---

const parseOptions = (raw) => {
    const lines = raw.split("\n");

    // Remove trailing empty line from paste artifacts
    if (lines.length > 1 && lines[lines.length - 1].trim() === "") {
        lines.pop();
    }

    const result = []; // { label, value }
    let inCombine = false;
    let currentBlock = [];
    let currentList = [];
    let optionCounter = 0;

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
                            const parts = [a, b].filter((p) => p.trim() !== "");
                            next.push(parts.join(", "));
                        }
                    }
                    return next;
                },
                [""],
            );

            for (const combo of combos) {
                const value = combo || "";
                result.push({ label: value || EMPTY_VALUE, value });
                optionCounter++;
            }
        } else if (stripped === "---") {
            if (inCombine) {
                currentBlock.push(currentList);
                currentList = [];
            } else {
                result.push({ label: "---", value: "---" });
                optionCounter++;
            }
        } else {
            if (inCombine) {
                currentList.push(line);
            } else if (stripped === "") {
                result.push({ label: EMPTY_VALUE, value: EMPTY_SENTINEL });
                optionCounter++;
            } else if (stripped.includes(" $: ")) {
                const idx = stripped.indexOf(" $: ");
                let label = stripped.slice(0, idx).trim();
                const value = stripped.slice(idx + 4).trim();
                if (!label) label = `option_${optionCounter}`;
                result.push({ label, value });
                optionCounter++;
            } else if (stripped.startsWith("$: ")) {
                const value = stripped.slice(3).trim();
                result.push({ label: `option_${optionCounter}`, value });
                optionCounter++;
            } else {
                result.push({ label: stripped, value: stripped });
                optionCounter++;
            }
        }
    }

    // Unclosed block, let Python handle error
    if (inCombine) return null;

    return result.length > 0 ? result : null;
};

// --- Editor ---

const attachEditor = (node) => {
    const optionsWidget = node.widgets?.find((w) => w.name === "options");
    const selectedWidget = node.widgets?.find((w) => w.name === "selected");

    if (!optionsWidget || !selectedWidget) return;

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
            selectedWidget.options.values = [EMPTY_VALUE];
            selectedWidget.value = EMPTY_VALUE;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            return;
        }

        // Build label map, handle duplicate labels
        const labelMap = new Map();
        for (const { label, value } of options) {
            let uniqueLabel = label;
            let suffix = 1;
            while (labelMap.has(uniqueLabel)) {
                uniqueLabel = `${label} (${suffix++})`;
            }
            labelMap.set(uniqueLabel, value);
        }

        node._labelMap = labelMap;
        const labels = [...labelMap.keys()];

        // Preserve selection by raw value
        const currentRaw = selectedWidget.value;
        const currentLabel = currentRaw
            ? [...labelMap.entries()].find(([, v]) => v === currentRaw)?.[0]
            : null;

        selectedWidget.options.values = labels;
        const targetLabel =
            currentLabel && labels.includes(currentLabel)
                ? currentLabel
                : labels[0];

        // Store raw value in selectedWidget
        selectedWidget.value = labelMap.get(targetLabel) ?? targetLabel;

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    hookWidget(selectedWidget, (label) => {
        if (node._labelMap) {
            selectedWidget.value = node._labelMap.get(label) ?? label;
        }
        refreshDropdown();
        renderColored();
    });

    hookWidget(optionsWidget, () => {
        refreshDropdown();
        renderColored();
    });

    // Initial refresh
    refreshDropdown();
    renderColored();
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidget(node, "options", attachEditor));
