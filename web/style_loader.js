import { hideWidget, registerNode, waitForWidgets } from "./utils.js";

// --- Constants ---

const NODE_NAME = "StyleLoader";

const BASE_ENDPOINT = "/re-customutils/styles";
const NO_STYLE = "-- no styles found --";
const NO_VAE = "none";
const MAX_LORAS = 15;

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

// --- LoRA management ---

// Each LoRA slot: { comboWidget, weightWidget, removeWidget, hidden }
const getLoraSlots = (node) => node._loraSlots ?? [];

const serializeLoras = (node) => {
    return getLoraSlots(node)
        .filter((slot) => !slot.hidden && slot.comboWidget.value)
        .map((slot) => ({
            name: slot.comboWidget.value,
            weight: slot.weightWidget.value,
        }));
};

const persistLoras = (node) => {
    const lorasWidget = findWidget(node, "loras_data");
    if (lorasWidget) {
        lorasWidget.value = JSON.stringify(serializeLoras(node));
    }
};

const hideSlot = (node, slot) => {
    slot.hidden = true;
    hideWidget(slot.comboWidget);
    hideWidget(slot.weightWidget);
    hideWidget(slot.removeWidget);
    persistLoras(node);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const addLoraSlot = (node, addButtonWidget, name = "", weight = 0.8) => {
    const slots = node._loraSlots ?? [];

    // Reuse a hidden slot if available
    const reusable = slots.find((s) => s.hidden);
    if (reusable) {
        reusable.hidden = false;
        reusable.comboWidget.value = name;
        reusable.comboWidget.type = "combo";
        reusable.comboWidget.computeSize = null;
        reusable.weightWidget.value = weight;
        reusable.weightWidget.type = "number";
        reusable.weightWidget.computeSize = null;
        reusable.removeWidget.type = "button";
        reusable.removeWidget.computeSize = null;
        persistLoras(node);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
        return;
    }

    if (slots.length >= MAX_LORAS) {
        alert(`[${NODE_NAME}] Maximum ${MAX_LORAS} LoRAs reached.`);
        return;
    }

    // Insert before the Add button
    const addBtnIdx = node.widgets.indexOf(addButtonWidget);

    const comboWidget = node.addWidget(
        "combo",
        `lora_name_${slots.length}`,
        name || ASSETS.loras[0] || "",
        () => persistLoras(node),
        { values: ASSETS.loras },
    );
    if (name) comboWidget.value = name;

    const weightWidget = node.addWidget(
        "number",
        `lora_weight_${slots.length}`,
        weight,
        () => persistLoras(node),
        { min: 0.0, max: 2.0, step: 0.5, precision: 2 },
    );

    const removeWidget = node.addWidget("button", `✕ Remove`, null, () =>
        hideSlot(node, slot),
    );

    // Move the three new widgets before the Add button
    if (addBtnIdx !== -1) {
        const w = node.widgets;
        const combo = w.pop();
        const weight_ = w.pop();
        const remove = w.pop();
        w.splice(addBtnIdx, 0, combo, weight_, remove);
    }

    const slot = { comboWidget, weightWidget, removeWidget, hidden: false };
    slots.push(slot);
    node._loraSlots = slots;

    persistLoras(node);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const rebuildLoraSlots = (node, loras, addButtonWidget) => {
    // Hide all existing slots first
    for (const slot of getLoraSlots(node)) {
        hideSlot(node, slot);
    }
    // Rebuild from data
    for (const { name, weight } of loras) {
        addLoraSlot(node, addButtonWidget, name, weight ?? 0.8);
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

const pushJsonToWidgets = (node, data, addButtonWidget) => {
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

    // Rebuild LoRA slots
    const lorasDataWidget = findWidget(node, "loras_data");
    const hasPersistedLoras =
        lorasDataWidget?.value && JSON.parse(lorasDataWidget.value).length > 0;

    if (!hasPersistedLoras) {
        rebuildLoraSlots(node, safe("loras", []), addButtonWidget);
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- File loading ---

const loadFileIntoWidgets = async (file, node, addButtonWidget) => {
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
        const parsed = JSON.parse(data.content);
        pushJsonToWidgets(node, parsed, addButtonWidget);
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
                styleFileWidget.options.values = values;
            }
            styleFileWidget.value = data.file;

            const parsed = JSON.parse(data.content);
            pushJsonToWidgets(node, parsed, addButtonWidget);

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        } else {
            alert(`[${NODE_NAME}] ${data.error}`);
        }
    });
};

// --- Attach ---

const attachStyleLoader = (node) => {
    const styleFileWidget = findWidget(node, "style_file");
    if (!styleFileWidget) return;

    // Add LoRA button (added before Save/New so slots insert above it)
    const addButtonWidget = node.addWidget(
        "button",
        "➕ Add LoRA",
        null,
        () => {
            addLoraSlot(node, addButtonWidget);
        },
    );

    // Save / New buttons
    addButtons(node, styleFileWidget, addButtonWidget);

    // Restore LoRA slots from persisted loras_data
    const lorasDataWidget = findWidget(node, "loras_data");
    if (lorasDataWidget?.value) {
        try {
            const loras = JSON.parse(lorasDataWidget.value);
            if (loras.length) rebuildLoraSlots(node, loras, addButtonWidget);
        } catch (e) {
            console.warn(`[${NODE_NAME}] Failed to restore LoRA slots:`, e);
        }
    }
    if (lorasDataWidget) {
        lorasDataWidget.hidden = true;
    }

    // Load initial file
    loadFileIntoWidgets(styleFileWidget.value, node, addButtonWidget);

    // Reload on file change
    const originalCallback = styleFileWidget.callback;
    styleFileWidget.callback = function (value) {
        if (originalCallback) originalCallback.call(this, value);
        loadFileIntoWidgets(value, node, addButtonWidget);
    };
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachStyleLoader));
