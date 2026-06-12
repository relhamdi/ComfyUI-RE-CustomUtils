import { findWidget, hideWidget } from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";
import { PresetRowWidget } from "./widgets/preset_row_widget.js";

// --- Helpers ---

const loadPresets = (node, key) => {
    const w = findWidget(node, key);
    if (!w?.value) return {};
    try {
        return JSON.parse(w.value);
    } catch {
        return {};
    }
};

const savePresets = (node, key, data) => {
    const w = findWidget(node, key);
    const sorted = Object.fromEntries(
        Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
    );
    if (w) w.value = JSON.stringify(sorted);
};

const getPresetNames = (data) => Object.keys(data).sort();

// --- Factory ---

export const createPresetManager = (
    node,
    {
        presetDataKey = "preset_data",
        onCapture,
        onRecall,
        nodeLabel = "Node",
    } = {},
) => {
    const presetDataWidget = findWidget(node, presetDataKey);

    let presetRow = null;

    const handleNew = () => {
        const name = prompt("New preset name:");
        if (!name?.trim()) return;

        const data = loadPresets(node, presetDataKey);
        if (data[name.trim()]) {
            alert(`[${nodeLabel}] Preset "${name.trim()}" already exists.`);
            return;
        }
        try {
            data[name.trim()] = onCapture();
        } catch (e) {
            alert(`[${nodeLabel}] ${e.message}`);
            return;
        }

        savePresets(node, presetDataKey, data);
        presetRow.setPresets(getPresetNames(data));
        presetRow.value = name.trim();
        presetRow.flashSave(node);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleSave = () => {
        if (!presetRow || presetRow.isEmpty()) return;

        const data = loadPresets(node, presetDataKey);
        data[presetRow.value] = onCapture();
        savePresets(node, presetDataKey, data);
        presetRow.flashSave(node);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleDelete = () => {
        if (!presetRow || presetRow.isEmpty()) return;
        if (!confirm(`Delete preset "${presetRow.value}"?`)) return;

        const data = loadPresets(node, presetDataKey);
        delete data[presetRow.value];
        savePresets(node, presetDataKey, data);
        presetRow.setPresets(getPresetNames(data));
        if (!presetRow.isEmpty()) handleSelect(presetRow.value);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const handleSelect = (name) => {
        const data = loadPresets(node, presetDataKey);
        const state = data[name];
        if (!state) return;
        onRecall(state);
    };

    const handleExport = () => {
        const data = loadPresets(node, presetDataKey);
        if (!Object.keys(data).length) {
            alert(`[${nodeLabel}] No presets to export.`);
            return;
        }

        const json = JSON.stringify(data, null, 2);
        navigator.clipboard
            .writeText(json)
            .then(() => {
                alert(`[${nodeLabel}] Presets copied to clipboard.`);
            })
            // Fallback if clipboard unavailable
            .catch(() => prompt("Copy this JSON:", json));
    };

    const handleImport = () => {
        const json = prompt("Paste preset JSON:");
        if (!json?.trim()) return;
        try {
            const data = JSON.parse(json);
            if (typeof data !== "object" || Array.isArray(data)) {
                alert(`[${nodeLabel}] Invalid format.`);
                return;
            }

            savePresets(node, presetDataKey, data);
            presetRow.setPresets(getPresetNames(data));
            if (!presetRow.isEmpty()) handleSelect(presetRow.value);

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } catch (e) {
            alert(`[${nodeLabel}] Invalid JSON.`);
            console.warn(`[${nodeLabel}] Error during import`, e);
        }
    };

    presetRow = new PresetRowWidget(
        "preset_row",
        handleNew,
        handleSave,
        handleDelete,
        handleSelect,
    );

    const exportImportRow = new ButtonRowWidget("preset_actions", [
        { label: "📋 Export", onClick: handleExport },
        { label: "📥 Import", onClick: handleImport },
    ]);

    // Initialize presets from stored data
    if (presetDataWidget) {
        hideWidget(presetDataWidget);
        const data = loadPresets(node, presetDataKey);
        presetRow.setPresets(getPresetNames(data));
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    }

    return { presetRow, exportImportRow };
};
