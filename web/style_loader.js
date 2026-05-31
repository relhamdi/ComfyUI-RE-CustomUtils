import { LoraRowWidget } from "./lora_row_widget.js";
import { registerNode, waitForWidgets } from "./utils.js";

// --- Constants ---

const NODE_NAME = "StyleLoader";

const BASE_ENDPOINT = "/re-customutils/styles";
const NO_STYLE = "-- no styles found --";
const NO_VAE = "none";
const MAX_LORAS = 15;
const DEFAULT_LORA_WEIGHT = 0.8;

// --- Assets ---

const ASSETS = {
    checkpoints: [],
    vae: [],
    loras: [],
    samplers: [],
    schedulers: [],
};

const fetchAssets = async () => {
    try {
        const res = await fetch(`${BASE_ENDPOINT}/assets`);
        const data = await res.json();
        Object.assign(ASSETS, data);
    } catch (e) {
        console.warn(`[${NODE_NAME}] Failed to fetch assets:`, e);
    }
};

fetchAssets();

// --- Widget helpers ---

const findWidget = (node, name) => node.widgets?.find((w) => w.name === name);

const setWidgetValue = (widget, value) => {
    if (!widget) return;
    widget.value = value;
    widget.callback?.(value);
};

// --- LoRA slot management ---

const getLoraRows = (node) => node._loraRows ?? [];

const serializeLoras = (node) =>
    getLoraRows(node)
        .filter((r) => !r._removed)
        .map((r) => ({ name: r.value.lora, weight: r.value.weight }));

const persistLoras = (node) => {
    const w = findWidget(node, "loras_data");
    if (w) w.value = JSON.stringify(serializeLoras(node));
};

const addLoraRow = (
    node,
    addButtonWidget,
    lora = "",
    weight = DEFAULT_LORA_WEIGHT,
) => {
    const rows = node._loraRows ?? [];
    if (rows.filter((r) => !r._removed).length >= MAX_LORAS) {
        alert(`[${NODE_NAME}] Maximum ${MAX_LORAS} LoRAs reached.`);
        return;
    }

    const idx = node.widgets.indexOf(addButtonWidget);
    const name = `lora_row_${rows.length}`;

    const row = new LoraRowWidget(
        name,
        ASSETS.loras,
        DEFAULT_LORA_WEIGHT,
        (action) => {
            if (action === "remove") {
                row._removed = true;
                const wi = node.widgets.indexOf(row);
                if (wi !== -1) node.widgets.splice(wi, 1);
                persistLoras(node);
                if (node.graph) node.graph.setDirtyCanvas(true, true);
            } else {
                persistLoras(node);
                if (node.graph) node.graph.setDirtyCanvas(true, true);
            }
        },
    );

    if (lora) row.value.lora = lora;
    row.value.weight = weight;

    node.widgets.splice(idx, 0, row);
    rows.push(row);
    node._loraRows = rows;

    persistLoras(node);

    // Resize node
    const computed = node.computeSize();
    node.size[1] = Math.max(node.size[1], computed[1]);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const clearLoraRows = (node) => {
    const rows = getLoraRows(node);
    for (const row of rows) {
        row._removed = true;
        const wi = node.widgets.indexOf(row);
        if (wi !== -1) node.widgets.splice(wi, 1);
    }
    node._loraRows = [];
};

const rebuildLoraRows = (node, loras, addButtonWidget) => {
    clearLoraRows(node);
    for (const { name, weight } of loras) {
        addLoraRow(node, addButtonWidget, name, weight ?? DEFAULT_LORA_WEIGHT);
    }
};

// --- JSON <-> Widgets sync ---

const buildJsonFromWidgets = (node) => {
    return JSON.stringify(
        {
            checkpoint: findWidget(node, "checkpoint")?.value ?? "",
            vae: findWidget(node, "vae")?.value ?? NO_VAE,
            clip_skip: findWidget(node, "clip_skip")?.value ?? -2,
            quality_tags: findWidget(node, "quality_tags")?.value ?? "",
            negative_tags: findWidget(node, "negative_tags")?.value ?? "",
            steps: findWidget(node, "steps")?.value ?? 15,
            refiner_step: findWidget(node, "refiner_step")?.value ?? 24,
            cfg: findWidget(node, "cfg")?.value ?? 4.0,
            loras: serializeLoras(node),
        },
        null,
        2,
    );
};

const pushJsonToWidgets = (node, data, addButtonWidget, loadLoras = true) => {
    const safe = (key, fallback) =>
        data[key] !== undefined ? data[key] : fallback;

    setWidgetValue(findWidget(node, "checkpoint"), safe("checkpoint", ""));
    setWidgetValue(findWidget(node, "vae"), safe("vae", NO_VAE));
    setWidgetValue(findWidget(node, "clip_skip"), safe("clip_skip", -2));
    setWidgetValue(findWidget(node, "quality_tags"), safe("quality_tags", ""));
    setWidgetValue(
        findWidget(node, "negative_tags"),
        safe("negative_tags", ""),
    );
    setWidgetValue(findWidget(node, "steps"), safe("steps", 15));
    setWidgetValue(findWidget(node, "refiner_step"), safe("refiner_step", 24));
    setWidgetValue(findWidget(node, "cfg"), safe("cfg", 4.0));

    // Only rebuild LoRAs if loras_data is empty (file load vs workflow restore)
    if (loadLoras) {
        rebuildLoraRows(node, safe("loras", []), addButtonWidget);
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- File loading ---

const loadFileIntoWidgets = async (
    file,
    node,
    addButtonWidget,
    loadLoras = true,
) => {
    if (!file || file === NO_STYLE) return;

    try {
        const res = await fetch(
            `${BASE_ENDPOINT}/load?file=${encodeURIComponent(file)}`,
        );
        const data = await res.json();
        if (data.error) {
            console.warn(`[${NODE_NAME}] Load error:`, data.error);
            return;
        }
        pushJsonToWidgets(
            node,
            JSON.parse(data.content),
            addButtonWidget,
            loadLoras,
        );
    } catch (e) {
        console.warn(`[${NODE_NAME}] Failed to load or parse file:`, e);
    }
};

// --- Buttons ---

const flashButton = (node, buttonName, flashLabel) => {
    const btn = findWidget(node, buttonName);
    if (!btn) return;
    btn.name = flashLabel;
    if (node.graph) node.graph.setDirtyCanvas(true, true);
    setTimeout(() => {
        btn.name = buttonName;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    }, 1500);
};

const addButtons = (node, styleFileWidget, addButtonWidget) => {
    // Save
    node.addWidget("button", "💾 Save", null, async () => {
        const file = styleFileWidget.value;
        if (!file || file === NO_STYLE) {
            alert(`[${NODE_NAME}] No style file selected.`);
            return;
        }

        const content = buildJsonFromWidgets(node);

        const res = await fetch(`${BASE_ENDPOINT}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file, content }),
        });

        const data = await res.json();
        if (data.ok) {
            flashButton(node, "💾 Save", "✅ Saved!");
        } else {
            alert(`[${NODE_NAME}] Save failed: ${data.error}`);
        }
    });

    // New
    node.addWidget("button", "➕ New", null, async () => {
        const name = prompt("New style file name (e.g. anime/illustrious):");
        if (!name?.trim()) return;

        const res = await fetch(`${BASE_ENDPOINT}/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: name.trim() }),
        });

        const data = await res.json();

        if (data.ok) {
            const values = styleFileWidget.options?.values ?? [];
            const placeholderIdx = values.indexOf(NO_STYLE);
            if (placeholderIdx !== -1) values.splice(placeholderIdx, 1);
            if (!values.includes(data.file)) {
                values.push(data.file);
                values.sort();
            }
            styleFileWidget.options.values = values;
            styleFileWidget.value = data.file;
            pushJsonToWidgets(node, JSON.parse(data.content), addButtonWidget);
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } else {
            alert(`[${NODE_NAME}] ${data.error}`);
        }
    });
};

// --- Attach ---

const attachStyleLoader = (node) => {
    const styleFileWidget = findWidget(node, "style_file");
    const lorasDataWidget = findWidget(node, "loras_data");
    if (!styleFileWidget || !lorasDataWidget) return;

    // Add LoRA button
    const addButtonWidget = node.addWidget(
        "button",
        "➕ Add LoRA",
        null,
        () => {
            addLoraRow(node, addButtonWidget);
        },
    );

    // Save / New buttons
    addButtons(node, styleFileWidget, addButtonWidget);

    // Restore loras_data first
    let hasPersistedLoras = false;
    if (lorasDataWidget?.value) {
        try {
            const loras = JSON.parse(lorasDataWidget.value);
            if (loras.length) {
                rebuildLoraRows(node, loras, addButtonWidget);
                hasPersistedLoras = true;
            }
        } catch (e) {
            console.warn(`[${NODE_NAME}] Failed to restore LoRA slots:`, e);
        }
    }
    if (lorasDataWidget) {
        lorasDataWidget.hidden = true;
    }

    // Load initial file
    loadFileIntoWidgets(
        styleFileWidget.value,
        node,
        addButtonWidget,
        !hasPersistedLoras,
    );

    // Reload on file change
    const originalCallback = styleFileWidget.callback;
    styleFileWidget.callback = function (value) {
        if (originalCallback) originalCallback.call(this, value);
        loadFileIntoWidgets(value, node, addButtonWidget);
    };
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachStyleLoader));
