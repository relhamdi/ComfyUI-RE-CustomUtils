import { COLORS, EMPTY_VALUE } from "./constants.js";
import { flashButton, patchFileDropdown } from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";

export const createLoaderCrud = (
    node,
    fileWidget,
    {
        baseEndpoint,
        nodeLabel = "Node",
        buildJson,
        pushJson,
        template,
        newPlaceholder = "New file name:",
        clonePlaceholder = "Clone to new file:",
        onChange,
    },
) => {
    const handleNew = async () => {
        const name = prompt(newPlaceholder);
        if (!name?.trim()) return;

        const res = await fetch(`${baseEndpoint}/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: name.trim() }),
        });
        const data = await res.json();

        if (data.ok) {
            patchFileDropdown(fileWidget, EMPTY_VALUE, data.file);
            pushJson(node, JSON.parse(data.content));
            onChange?.();
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } else {
            alert(`[${nodeLabel}] ${data.error}`);
        }
    };

    const handleSave = async () => {
        const file = fileWidget.value;
        if (!file || file === EMPTY_VALUE) {
            alert(`[${nodeLabel}] No file selected.`);
            return;
        }

        const content = buildJson(node);
        const res = await fetch(`${baseEndpoint}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file, content }),
        });
        const data = await res.json();

        if (data.ok) {
            flashButton(node, 1, "✅ Saved!");
            onChange?.();
        } else {
            alert(`[${nodeLabel}] Save failed: ${data.error}`);
        }
    };

    const handleClone = async () => {
        const name = prompt(clonePlaceholder);
        if (!name?.trim()) return;

        const content = buildJson(node);
        const file = name.trim().endsWith(".json")
            ? name.trim()
            : `${name.trim()}.json`;

        const res = await fetch(`${baseEndpoint}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file, content }),
        });
        const data = await res.json();

        if (data.ok) {
            patchFileDropdown(fileWidget, EMPTY_VALUE, file);
            onChange?.();
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } else {
            alert(`[${nodeLabel}] Clone failed: ${data.error}`);
        }
    };

    const handleDelete = async () => {
        const file = fileWidget.value;
        if (!file || file === EMPTY_VALUE) {
            alert(`[${nodeLabel}] No file selected.`);
            return;
        }
        if (!confirm(`Delete "${file}"? This cannot be undone.`)) return;

        const res = await fetch(`${baseEndpoint}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file }),
        });
        const data = await res.json();

        if (data.ok) {
            const values = fileWidget.options?.values ?? [];
            const idx = values.indexOf(file);
            if (idx !== -1) values.splice(idx, 1);
            if (!values.length) values.push(EMPTY_VALUE);

            fileWidget.options.values = values;
            fileWidget.value = values[0];
            fileWidget.callback?.(values[0]);
            if (values[0] === EMPTY_VALUE) pushJson(node, template);

            onChange?.();
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } else {
            alert(`[${nodeLabel}] Delete failed: ${data.error}`);
        }
    };

    const loadFileIntoWidgets = async (file) => {
        if (!file || file === EMPTY_VALUE) return;
        try {
            const res = await fetch(
                `${baseEndpoint}/load?file=${encodeURIComponent(file)}`,
            );
            const data = await res.json();
            if (data.error) {
                console.warn(`[${nodeLabel}] Load error:`, data.error);
                return;
            }
            pushJson(node, JSON.parse(data.content));
        } catch (e) {
            console.warn(`[${nodeLabel}] Failed to load or parse file:`, e);
        }
    };

    node.widgets.push(
        new ButtonRowWidget("action_buttons", [
            { label: "➕ New", onClick: handleNew },
            { label: "💾 Save", onClick: handleSave },
            { label: "📋 Clone", onClick: handleClone },
            {
                label: "🗑️ Delete",
                color: COLORS.dark_red,
                onClick: handleDelete,
            },
        ]),
    );

    return { loadFileIntoWidgets };
};
