import { API_ROOT, COLORS, EMPTY_VALUE } from "./constants.js";
import {
    findWidget,
    flashButton,
    hideWidget,
    patchFileDropdown,
    registerNode,
    setWidgetValue,
    waitForWidgets,
} from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";
import { LoraRowWidget } from "./widgets/lora_row_widget.js";

// --- Constants ---

const NODE_NAME = "StyleLoader";

const BASE_ENDPOINT = `${API_ROOT}/styles`;
const NO_VAE = "none";
const MAX_LORAS = 15;
const DEFAULT_LORA_WEIGHT = 0.8;

const STYLE_TEMPLATE = {
    checkpoint: "",
    vae: NO_VAE,
    clip_skip: -2,
    quality_tags: "",
    extra_quality_tags: "",
    negative_tags: "",
    steps: 15,
    refiner_step: 24,
    cfg: 4.0,
    sampler: "euler_ancestral",
    scheduler: "normal",
    loras: [],
};

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
            checkpoint:
                findWidget(node, "checkpoint")?.value ??
                STYLE_TEMPLATE.checkpoint,
            vae: findWidget(node, "vae")?.value ?? STYLE_TEMPLATE.vae,
            clip_skip:
                findWidget(node, "clip_skip")?.value ??
                STYLE_TEMPLATE.clip_skip,
            quality_tags:
                findWidget(node, "quality_tags")?.value ??
                STYLE_TEMPLATE.quality_tags,
            extra_quality_tags:
                findWidget(node, "extra_quality_tags")?.value ??
                STYLE_TEMPLATE.extra_quality_tags,
            negative_tags:
                findWidget(node, "negative_tags")?.value ??
                STYLE_TEMPLATE.negative_tags,
            steps: findWidget(node, "steps")?.value ?? STYLE_TEMPLATE.steps,
            refiner_step:
                findWidget(node, "refiner_step")?.value ??
                STYLE_TEMPLATE.refiner_step,
            cfg: findWidget(node, "cfg")?.value ?? STYLE_TEMPLATE.cfg,
            sampler:
                findWidget(node, "sampler")?.value ?? STYLE_TEMPLATE.sampler,
            scheduler:
                findWidget(node, "scheduler")?.value ??
                STYLE_TEMPLATE.scheduler,
            loras: serializeLoras(node),
        },
        null,
        2,
    );
};

const pushJsonToWidgets = (node, data, addButtonWidget, loadLoras = true) => {
    const safe = (key, fallback) =>
        data[key] !== undefined ? data[key] : fallback;

    setWidgetValue(
        findWidget(node, "checkpoint"),
        safe("checkpoint", STYLE_TEMPLATE.checkpoint),
    );
    setWidgetValue(
        findWidget(node, "vae"),
        safe("vae", STYLE_TEMPLATE.vae) || STYLE_TEMPLATE.vae,
    );
    setWidgetValue(
        findWidget(node, "clip_skip"),
        safe("clip_skip", STYLE_TEMPLATE.clip_skip),
    );
    setWidgetValue(
        findWidget(node, "quality_tags"),
        safe("quality_tags", STYLE_TEMPLATE.quality_tags),
    );
    setWidgetValue(
        findWidget(node, "extra_quality_tags"),
        safe("extra_quality_tags", STYLE_TEMPLATE.extra_quality_tags),
    );
    setWidgetValue(
        findWidget(node, "negative_tags"),
        safe("negative_tags", STYLE_TEMPLATE.negative_tags),
    );
    setWidgetValue(
        findWidget(node, "steps"),
        safe("steps", STYLE_TEMPLATE.steps),
    );
    setWidgetValue(
        findWidget(node, "refiner_step"),
        safe("refiner_step", STYLE_TEMPLATE.refiner_step),
    );
    setWidgetValue(findWidget(node, "cfg"), safe("cfg", STYLE_TEMPLATE.cfg));
    setWidgetValue(
        findWidget(node, "sampler"),
        safe("sampler", STYLE_TEMPLATE.sampler),
    );
    setWidgetValue(
        findWidget(node, "scheduler"),
        safe("scheduler", STYLE_TEMPLATE.scheduler),
    );

    // Only rebuild LoRAs if loras_data is empty (file load vs workflow restore)
    if (loadLoras) {
        rebuildLoraRows(
            node,
            safe("loras", STYLE_TEMPLATE.loras),
            addButtonWidget,
        );
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const clearWidgets = (node, addButtonWidget) => {
    pushJsonToWidgets(node, STYLE_TEMPLATE, addButtonWidget, true);
};

// --- File loading ---

const loadFileIntoWidgets = async (
    file,
    node,
    addButtonWidget,
    loadLoras = true,
) => {
    if (!file || file === EMPTY_VALUE) return;

    // Empty loras_data before loading
    const lorasDataWidget = findWidget(node, "loras_data");
    if (lorasDataWidget) lorasDataWidget.value = "[]";

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

const handleNew = async (node, styleFileWidget, addButtonWidget) => {
    const name = prompt("New style file name (e.g. anime/illustrious):");
    if (!name?.trim()) return;

    const res = await fetch(`${BASE_ENDPOINT}/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: name.trim() }),
    });
    const data = await res.json();

    if (data.ok) {
        patchFileDropdown(styleFileWidget, EMPTY_VALUE, data.file);
        pushJsonToWidgets(
            node,
            JSON.parse(data.content),
            addButtonWidget,
            true,
        );
        loadPreviewImage(data.file, node);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] ${data.error}`);
    }
};

const handleSave = async (node, styleFileWidget) => {
    const file = styleFileWidget.value;
    if (!file || file === EMPTY_VALUE) {
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
        flashButton(node, 1, "✅ Saved!");
    } else {
        alert(`[${NODE_NAME}] Save failed: ${data.error}`);
    }
};

const handleClone = async (node, styleFileWidget) => {
    const name = prompt("Clone to new file (e.g. anime/illustrious_v2):");
    if (!name?.trim()) return;

    const content = buildJsonFromWidgets(node);
    const file = name.trim().endsWith(".json")
        ? name.trim()
        : `${name.trim()}.json`;

    const res = await fetch(`${BASE_ENDPOINT}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, content }),
    });
    const data = await res.json();

    if (data.ok) {
        patchFileDropdown(styleFileWidget, EMPTY_VALUE, file);
        loadPreviewImage(file, node);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] Clone failed: ${data.error}`);
    }
};

const handleDelete = async (node, styleFileWidget, addButtonWidget) => {
    const file = styleFileWidget.value;
    if (!file || file === EMPTY_VALUE) {
        alert(`[${NODE_NAME}] No style file selected.`);
        return;
    }
    if (!confirm(`Delete "${file}" ? This cannot be undone.`)) return;

    const res = await fetch(`${BASE_ENDPOINT}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file }),
    });
    const data = await res.json();

    if (data.ok) {
        const values = styleFileWidget.options?.values ?? [];
        const idx = values.indexOf(file);
        if (idx !== -1) values.splice(idx, 1);
        if (!values.length) values.push(EMPTY_VALUE);

        styleFileWidget.options.values = values;
        styleFileWidget.value = values[0];
        styleFileWidget.callback?.(values[0]);
        if (values[0] === EMPTY_VALUE) clearWidgets(node, addButtonWidget);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] Delete failed: ${data.error}`);
    }
};

const addButtons = (node, styleFileWidget, addButtonWidget) => {
    const buttonRowWidget = new ButtonRowWidget("action_buttons", [
        {
            label: "➕ New",
            onClick: () => handleNew(node, styleFileWidget, addButtonWidget),
        },
        {
            label: "💾 Save",
            onClick: () => handleSave(node, styleFileWidget),
        },
        {
            label: "📋 Clone",
            onClick: () => handleClone(node, styleFileWidget),
        },
        {
            label: "🗑️ Delete",
            color: COLORS.dark_red,
            onClick: () => handleDelete(node, styleFileWidget, addButtonWidget),
        },
    ]);
    node.widgets.push(buttonRowWidget);
};

// --- Preview ---

const loadPreviewImage = async (file, node) => {
    if (!file || file === EMPTY_VALUE) {
        node._previewImage = null;
        return;
    }
    try {
        const res = await fetch(
            `${BASE_ENDPOINT}/preview?file=${encodeURIComponent(file)}`,
        );
        const data = await res.json();
        if (data.image) {
            const img = new Image();
            img.onload = () => {
                node._previewImage = img;
                if (node.graph) node.graph.setDirtyCanvas(true, true);
            };
            img.src = data.image;
        } else {
            node._previewImage = null;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        }
    } catch (e) {
        console.warn(`[${NODE_NAME}] Failed to load preview:`, e);
        node._previewImage = null;
    }
};

const attachPreview = (node) => {
    const original = node.onDrawBackground;
    node.onDrawBackground = function (ctx) {
        if (original) original.call(this, ctx);
        if (!node._previewImage) return;

        const img = node._previewImage;
        const margin = 10;
        const maxH = 200;
        const maxW = node.size[0] - margin * 2;

        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;

        // Position: top center
        const x = (node.size[0] - w) / 2;
        const y = margin;

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
    };
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

    // Action buttons
    addButtons(node, styleFileWidget, addButtonWidget);

    const init = async () => {
        // Ensure assets are loaded
        if (!ASSETS.loras.length) {
            await fetchAssets();
        }

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
            hideWidget(lorasDataWidget, true);
        }

        // Load initial file + preview
        loadFileIntoWidgets(
            styleFileWidget.value,
            node,
            addButtonWidget,
            !hasPersistedLoras,
        );
        loadPreviewImage(styleFileWidget.value, node);
    };

    // Attach preview
    attachPreview(node);
    init();

    // Reload on file change
    const originalCallback = styleFileWidget.callback;
    styleFileWidget.callback = function (value) {
        if (originalCallback) originalCallback.call(this, value);
        loadFileIntoWidgets(value, node, addButtonWidget);
        loadPreviewImage(value, node);
    };
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachStyleLoader));
