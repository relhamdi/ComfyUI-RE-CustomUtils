import { COLORS } from "./constants.js";
import {
    createEditor,
    debounce,
    escapeHtml,
    findWidget,
    registerNode,
    updateSlotVisibility,
    waitForWidget,
} from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";
import { PresetRowWidget } from "./widgets/preset_row_widget.js";

// --- Constants ---

const NODE_NAME = "PromptLayoutFiller";

const NUM_SLOTS = 10;

// --- Helpers ---

const getPattern = () => /\{(\d+)(?::[^}\n]*)?\}/g;

// --- Highlight ---

const buildHighlightedHtml = (raw, connectedSlots) => {
    let result = "";
    let lastIndex = 0;

    for (const match of raw.matchAll(getPattern())) {
        // Text before the match
        result += escapeHtml(raw.slice(lastIndex, match.index));

        const idx = parseInt(match[1]);
        const color = connectedSlots.has(idx) ? COLORS.green : COLORS.red;
        result += `<span style="color:${color}">${escapeHtml(match[0])}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
};

const getConnectedSlots = (node) => {
    const connected = new Set();
    for (let i = 0; i < NUM_SLOTS; i++) {
        const input = node.inputs?.find((inp) => inp.name === `slot_${i}`);
        if (input?.link !== null && input?.link !== undefined) {
            connected.add(i);
        }
    }
    return connected;
};

// --- Source node helpers ---

const getSourceNode = (node, slotIndex) => {
    const input = node.inputs?.find((inp) => inp.name === `slot_${slotIndex}`);
    if (!input?.link) return null;
    const link = app.graph.links[input.link];
    if (!link) return null;
    return app.graph.getNodeById(link.origin_id) ?? null;
};

const getSourceLabel = (sourceNode) => {
    const widget = findWidget(sourceNode, "selected");
    if (!widget) return null;

    // Retrieve label from value through inverted _labelMap
    if (sourceNode._labelMap) {
        for (const [label, value] of sourceNode._labelMap.entries()) {
            if (value === widget.value) return label;
        }
    }
    return widget.value || null;
};

const setSourceByLabel = (sourceNode, label) => {
    const widget = findWidget(sourceNode, "selected");
    if (!widget) return false;

    // Check value exists in options
    const options = widget.options?.values ?? [];
    if (!options.includes(label)) return false;

    widget.value = sourceNode._labelMap?.get(label) ?? label;
    widget.callback?.(label);
    return true;
};

// --- Preset management ---

const loadPresets = (node) => {
    const w = findWidget(node, "preset_data");
    if (!w?.value) return {};
    try {
        return JSON.parse(w.value);
    } catch {
        return {};
    }
};

const savePresets = (node, data) => {
    const w = findWidget(node, "preset_data");
    const sorted = Object.fromEntries(
        Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
    );
    if (w) w.value = JSON.stringify(sorted);
};

const getPresetNames = (data) => Object.keys(data).sort();

const captureSlots = (node) => {
    const slots = {};
    for (let i = 0; i < NUM_SLOTS; i++) {
        const source = getSourceNode(node, i);
        if (!source) continue;
        const label = getSourceLabel(source);
        if (label !== null) slots[`slot_${i}`] = label;
    }
    return slots;
};

const recallSlots = (node, slots) => {
    const errors = [];

    for (const [slotName, label] of Object.entries(slots)) {
        const idx = parseInt(slotName.replace("slot_", ""));
        const source = getSourceNode(node, idx);

        if (!source) {
            errors.push(`${slotName}: source node is no longer connected.`);
            continue;
        }

        const ok = setSourceByLabel(source, label);
        if (!ok) {
            errors.push(
                `${slotName}: value "${label}" not found in source node options.`,
            );
        }
    }

    return errors;
};

// --- Editor ---

const attachEditor = (node) => {
    const templateWidget = findWidget(node, "template");
    if (!templateWidget) return;

    const textarea = templateWidget.inputEl || templateWidget.element;
    if (!textarea?.parentNode) return;

    // Create contentEditable div
    const editor = createEditor(textarea, {
        onInput: () => renderColored(),
    });

    // --- State ---

    // Render modes
    const renderColored = () => {
        const connected = getConnectedSlots(node);
        editor.innerHTML = buildHighlightedHtml(textarea.value, connected);
    };

    // --- Preset row widget ---

    let presetRow = null;

    const refreshPresetRow = () => {
        if (!presetRow) return;
        const data = loadPresets(node);
        presetRow.setPresets(getPresetNames(data));
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleNew = () => {
        const name = prompt("New preset name:");
        if (!name?.trim()) return;

        const data = loadPresets(node);
        const slots = captureSlots(node);

        // No connected slots
        if (!Object.keys(slots).length) {
            alert(`[${NODE_NAME}] No connected slots to save.`);
            return;
        }

        // Already existing
        if (data[name.trim()]) {
            alert(
                `[${NODE_NAME}] Preset "${name.trim()}" already exists. Use Save to overwrite.`,
            );
            return;
        }

        data[name.trim()] = slots;
        savePresets(node, data);
        presetRow.setPresets(getPresetNames(data));
        presetRow.value = name.trim();
        presetRow.flashSave(node);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleSave = () => {
        const name = presetRow.value;
        if (!name || presetRow.isEmpty()) return;

        const data = loadPresets(node);
        const slots = captureSlots(node);

        if (!Object.keys(slots).length) {
            alert(`[${NODE_NAME}] No connected slots to save.`);
            return;
        }

        data[name] = slots;
        savePresets(node, data);
        presetRow.flashSave(node);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleDelete = () => {
        const name = presetRow.value;
        if (!name || presetRow.isEmpty()) return;
        if (!confirm(`Delete preset "${name}"?`)) return;

        const data = loadPresets(node);
        delete data[name];
        savePresets(node, data);
        presetRow.setPresets(getPresetNames(data));
        if (!presetRow.isEmpty()) handleSelect(presetRow.value);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleSelect = (name) => {
        const data = loadPresets(node);
        const slots = data[name];
        if (!slots) return;

        const errors = recallSlots(node, slots);
        if (errors.length) {
            alert(`[${NODE_NAME}] Recall errors:\n${errors.join("\n")}`);
        }
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleExport = () => {
        const data = loadPresets(node);
        if (!Object.keys(data).length) {
            alert(`[${NODE_NAME}] No presets to export.`);
            return;
        }
        const json = JSON.stringify(data, null, 2);
        navigator.clipboard
            .writeText(json)
            .then(() => {
                alert(`[${NODE_NAME}] Presets copied to clipboard.`);
            })
            .catch(() => {
                // Fallback if clipboard unavailable
                prompt("Copy this JSON:", json);
            });
    };

    const handleImport = () => {
        const json = prompt("Paste preset JSON:");
        if (!json?.trim()) return;
        try {
            const data = JSON.parse(json);
            if (typeof data !== "object" || Array.isArray(data)) {
                alert(`[${NODE_NAME}] Invalid format — JSON object expected.`);
                return;
            }
            savePresets(node, data);
            presetRow.setPresets(getPresetNames(data));
            if (!presetRow.isEmpty()) handleSelect(presetRow.value);

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } catch (e) {
            alert(`[${NODE_NAME}] Invalid JSON.`);
            console.warn(`[${NODE_NAME}] Error during import`, e);
        }
    };

    presetRow = new PresetRowWidget(
        "preset_row",
        handleNew,
        handleSave,
        handleDelete,
        handleSelect,
    );

    // Initialize presets from stored data
    refreshPresetRow();

    // Hide preset_data widget and insert presetRow right before
    const presetDataWidget = findWidget(node, "preset_data");
    if (presetDataWidget) {
        presetDataWidget.hidden = true;
        const idx = node.widgets.indexOf(presetDataWidget);
        node.widgets.splice(idx + 1, 0, presetRow);
    }

    const exportImportRow = new ButtonRowWidget("preset_actions", [
        { label: "📋 Export", onClick: () => handleExport() },
        { label: "📥 Import", onClick: () => handleImport() },
    ]);

    // Insert right after presetRow
    const presetRowIdx = node.widgets.indexOf(presetRow);
    node.widgets.splice(presetRowIdx + 1, 0, exportImportRow);

    // --- Connection change ---

    const debouncedUpdate = debounce(() => {
        updateSlotVisibility(node, NUM_SLOTS, "slot");
        renderColored();
    }, 64);

    // --- Connection change hook - Re-render when slots are connected or disconnected ---
    const originalConnectionChange = node.onConnectionsChange;
    node.onConnectionsChange = function (...args) {
        if (originalConnectionChange)
            originalConnectionChange.call(this, ...args);
        debouncedUpdate();
    };

    // Initial render
    updateSlotVisibility(node, NUM_SLOTS, "slot");
    renderColored();
};

// --- Registration ---

registerNode(NODE_NAME, (node) =>
    waitForWidget(node, "template", attachEditor),
);
