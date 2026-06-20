import { API_ROOT, COLORS, EMPTY_VALUE } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import {
    drawGroupBorder,
    drawWidgetOutline,
    findWidget,
    flashButton,
    hideWidget,
    patchFileDropdown,
    registerNode,
    setWidgetValue,
    waitForWidgets,
} from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";

// --- Constants ---

const NODE_NAME = "CharacterLoader";
const BASE_ENDPOINT = `${API_ROOT}/characters`;

const CHARACTER_TEMPLATE = {
    // Eyes
    eye_type: EMPTY_VALUE,
    eye_color: "",
    pupils: EMPTY_VALUE,
    eye_details: "",
    eyewear: "",
    // Mouth
    mouth_type: EMPTY_VALUE,
    teeth: EMPTY_VALUE,
    // Hair
    hair_color: "",
    hair_style_options: "",
    hair_style_selected: "",
    // Face details
    face_details: "",
    face_piercings: "",
    // Nails / Makeup
    nail_type: EMPTY_VALUE,
    nail_color: "",
    makeup: "",
    // Accessories
    facewear: "",
    neckwear: "",
    armwear: "",
    // Body base
    base_body: EMPTY_VALUE,
    body_type: EMPTY_VALUE,
    skin_color: EMPTY_VALUE,
    body_details: "",
    // Upper body
    upper_body: "",
    chest: EMPTY_VALUE,
    chest_details: EMPTY_VALUE,
    upper_details: "",
    // Mid body
    stomach: EMPTY_VALUE,
    narrow_waist: false,
    muffin_top: false,
    mid_details: "",
    // Lower body
    lower_body: "",
    hips: EMPTY_VALUE,
    hip_dips: false,
    thighs: EMPTY_VALUE,
    lower_details: "",
    // Butt
    butt: EMPTY_VALUE,
};

const FIELDS = Object.keys(CHARACTER_TEMPLATE);

// --- JSON <-> Widgets sync ---

const buildJsonFromWidgets = (node) =>
    JSON.stringify(
        Object.fromEntries(
            FIELDS.map((f) => [f, findWidget(node, f)?.value ?? ""]),
        ),
        null,
        2,
    );

const pushJsonToWidgets = (node, data) => {
    for (const field of FIELDS) {
        setWidgetValue(findWidget(node, field), data[field] ?? "");
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const clearWidgets = (node) => {
    pushJsonToWidgets(node, CHARACTER_TEMPLATE);
};

// --- File loading ---

const loadFileIntoWidgets = async (file, node) => {
    if (!file || file === EMPTY_VALUE) return;
    try {
        const res = await fetch(
            `${BASE_ENDPOINT}/load?file=${encodeURIComponent(file)}`,
        );
        const data = await res.json();
        if (data.error) {
            console.warn(`[${NODE_NAME}] Load error:`, data.error);
            return;
        }
        pushJsonToWidgets(node, JSON.parse(data.content));
    } catch (e) {
        console.warn(`[${NODE_NAME}] Failed to load or parse file:`, e);
    }
};

// --- Buttons ---

const handleNew = async (node, characterFileWidget) => {
    const name = prompt("New character file name (e.g. characters/Alice):");
    if (!name?.trim()) return;

    const res = await fetch(`${BASE_ENDPOINT}/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: name.trim() }),
    });
    const data = await res.json();

    if (data.ok) {
        patchFileDropdown(characterFileWidget, EMPTY_VALUE, data.file);
        pushJsonToWidgets(node, JSON.parse(data.content));
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] ${data.error}`);
    }
};

const handleSave = async (node, characterFileWidget) => {
    const file = characterFileWidget.value;
    if (!file || file === EMPTY_VALUE) {
        alert(`[${NODE_NAME}] No character file selected.`);
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

const handleClone = async (node, characterFileWidget) => {
    const name = prompt("Clone to new file (e.g. characters/Alice_v2):");
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
        patchFileDropdown(characterFileWidget, EMPTY_VALUE, file);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] Clone failed: ${data.error}`);
    }
};

const handleDelete = async (node, characterFileWidget) => {
    const file = characterFileWidget.value;
    if (!file || file === EMPTY_VALUE) {
        alert(`[${NODE_NAME}] No character file selected.`);
        return;
    }
    if (!confirm(`Delete "${file}"? This cannot be undone.`)) return;

    const res = await fetch(`${BASE_ENDPOINT}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file }),
    });
    const data = await res.json();

    if (data.ok) {
        const values = characterFileWidget.options?.values ?? [];
        const idx = values.indexOf(file);
        if (idx !== -1) values.splice(idx, 1);
        if (!values.length) values.push(EMPTY_VALUE);

        characterFileWidget.options.values = values;
        characterFileWidget.value = values[0];
        characterFileWidget.callback?.(values[0]);
        if (values[0] === EMPTY_VALUE) clearWidgets(node);

        if (node.graph) node.graph.setDirtyCanvas(true, true);
    } else {
        alert(`[${NODE_NAME}] Delete failed: ${data.error}`);
    }
};

// --- Attach ---

const attachCharacterLoader = (node) => {
    const characterFileWidget = findWidget(node, "character_file");
    if (!characterFileWidget) return;

    node.widgets.push(
        new ButtonRowWidget("action_buttons", [
            {
                label: "➕ New",
                onClick: () => handleNew(node, characterFileWidget),
            },
            {
                label: "💾 Save",
                onClick: () => handleSave(node, characterFileWidget),
            },
            {
                label: "📋 Clone",
                onClick: () => handleClone(node, characterFileWidget),
            },
            {
                label: "🗑️ Delete",
                color: COLORS.dark_red,
                onClick: () => handleDelete(node, characterFileWidget),
            },
        ]),
    );

    const hairStyleOptions = findWidget(node, "hair_style_options");
    const hairStyleSelected = findWidget(node, "hair_style_selected");
    if (hairStyleOptions && hairStyleSelected) {
        hideWidget(hairStyleSelected);
        attachInlineSelector(node, hairStyleOptions, hairStyleSelected, {
            placeholder: "hair style",
        });
    }

    // Reload on file change
    hookWidget(characterFileWidget, (value) =>
        loadFileIntoWidgets(value, node),
    );

    const outlines = [
        { name: "narrow_waist" },
        { name: "muffin_top" },
        { name: "hip_dips" },
    ];
    const groups = [
        { from: "eye_color", to: "eye_details" },
        { from: "mouth_type", to: "teeth" },
        { from: "face_details", to: "face_piercings" },
        { from: "nail_type", to: "makeup" },
        { from: "facewear", to: "armwear" },
        { from: "base_body", to: "body_details" },
        { from: "upper_body", to: "upper_details" },
        { from: "stomach", to: "mid_details" },
        { from: "lower_body", to: "lower_details" },
    ];
    const original = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (original) original.call(this, ctx);

        for (const widget of outlines) {
            drawWidgetOutline(
                ctx,
                node,
                widget.name,
                COLORS.orange,
                COLORS.blue,
            );
        }
        for (const group of groups) {
            drawGroupBorder(ctx, node, group.from, group.to, COLORS.highlight);
        }
    };

    // Load initial file
    loadFileIntoWidgets(characterFileWidget.value, node);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachCharacterLoader));
