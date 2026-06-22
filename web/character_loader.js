import { API_ROOT, COLORS, EMPTY_VALUE } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import { createLoaderCrud } from "./loader_crud.js";
import {
    drawGroupBorder,
    drawWidgetOutline,
    findWidget,
    hideWidget,
    hookWidget,
    registerNode,
    setWidgetValue,
    waitForWidgets,
} from "./utils.js";

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

// --- Attach ---

const attachCharacterLoader = (node) => {
    const characterFileWidget = findWidget(node, "character_file");
    if (!characterFileWidget) return;

    const { loadFileIntoWidgets } = createLoaderCrud(
        node,
        characterFileWidget,
        {
            baseEndpoint: BASE_ENDPOINT,
            nodeLabel: NODE_NAME,
            buildJson: buildJsonFromWidgets,
            pushJson: pushJsonToWidgets,
            template: CHARACTER_TEMPLATE,
            newPlaceholder: "New character file name (e.g. characters/Alice):",
            clonePlaceholder: "Clone to new file (e.g. characters/Alice_v2):",
        },
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
