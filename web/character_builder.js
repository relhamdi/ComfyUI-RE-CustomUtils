import { COLORS } from "./constants.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawGroupBorder,
    drawWidgetOutline,
    findWidget,
    hookWidget,
    registerNode,
    setInputDotColor,
    waitForWidgets,
} from "./utils.js";
import { replaceWithInlineTextToggle } from "./widgets/inline_text_toggle_widget.js";

// --- Constants ---

const NODE_NAME = "CharacterBuilder";

// Override pairs: text widget name -> mode widget name
const OVERRIDE_FIELDS = [
    "eyes_override",
    "eyewear_override",
    "face_details_override",
    "face_piercings_override",
    "nail_color_override",
    "facewear_override",
    "neckwear_override",
    "armwear_override",
    "upper_details_override",
    "mid_details_override",
    "lower_details_override",
];

const BOOL_FIELDS = [
    "show_eyes",
    "show_eyeballs",
    "bald",
    "show_nails",
    "show_makeup",
    "toggle_accessories",
    "show_body",
    "show_body_details",
    "show_upper_body",
    "show_mid_body",
    "show_lower_body",
    "show_butt",
    ...OVERRIDE_FIELDS.map((f) => `${f}_mode`),
];

// --- Replace native widget pairs with InlineTextToggleWidget ---

const replaceWithToggleWidgets = (node) => {
    const toggleWidgets = {};

    for (const field of OVERRIDE_FIELDS) {
        const textWidget = findWidget(node, field);
        const modeWidget = findWidget(node, `${field}_mode`);
        if (!textWidget || !modeWidget) continue;

        toggleWidgets[field] = replaceWithInlineTextToggle(
            node,
            textWidget,
            modeWidget,
        );
    }

    return toggleWidgets;
};

// --- Capture / Recall ---

const captureState = (node) => {
    const state = {};
    for (const field of BOOL_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? false;
    }
    for (const field of OVERRIDE_FIELDS) {
        const w = findWidget(node, field);
        if (w) state[field] = w.value ?? "";
    }
    return state;
};

const recallState = (node, state, toggleWidgets) => {
    for (const field of [...BOOL_FIELDS, ...OVERRIDE_FIELDS]) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }
    applyAllVisibility(node, toggleWidgets);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Visibility cascade ---

const setDisabled = (node, fields, disabled) => {
    for (const field of fields) {
        const w = findWidget(node, field);
        if (w) w.disabled = disabled;
    }
};

const setToggleWidgetDisabled = (node, toggleWidgets, fields, disabled) => {
    for (const field of fields) {
        const helper = toggleWidgets[field];
        if (helper) helper.disabled = disabled;
    }
};

const setDotsDisabled = (node, fields, disabled) => {
    for (const field of fields) {
        setInputDotColor(node, field, !disabled);
    }
};

const applyAllVisibility = (node, toggleWidgets) => {
    const get = (name) => findWidget(node, name)?.value ?? true;

    const showEyes = get("show_eyes");
    const showEyeballs = get("show_eyeballs");
    const isBald = get("bald");
    const showNails = get("show_nails");
    const showMakeup = get("show_makeup");
    const toggleAccessories = get("toggle_accessories");
    const showBody = get("show_body");
    const showBodyDetails = get("show_body_details");
    const showUpperBody = get("show_upper_body");
    const showMidBody = get("show_mid_body");
    const showLowerBody = get("show_lower_body");
    const showButt = get("show_butt");

    // show_eyes -> show_eyeballs + eye_details dot
    setDisabled(node, ["show_eyeballs"], !showEyes);
    setDotsDisabled(node, ["eye_details"], !showEyes);

    // show_eyeballs -> eyes_override + raw dots
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["eyes_override"],
        !(showEyes && showEyeballs),
    );
    setDotsDisabled(
        node,
        ["eye_color", "eye_type", "pupils"],
        !(showEyes && showEyeballs),
    );

    // bald -> hair_color + hair_style dots
    setDotsDisabled(node, ["hair_color", "hair_style"], isBald);

    // show_nails -> nail_color_override toggle widget + nail_type/nail_color dots
    setDotsDisabled(node, ["nail_type"], !showNails);
    setDotsDisabled(node, ["nail_color"], !(showNails && showMakeup));

    // show_makeup -> makeup + makeup_modifiers dots; nail_color_override also gated by show_makeup
    setDotsDisabled(node, ["makeup", "makeup_modifiers"], !showMakeup);
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["nail_color_override"],
        !(showNails && showMakeup),
    );

    // toggle_accessories -> 3 accessory override toggle widgets + raw dots
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["facewear_override", "neckwear_override", "armwear_override"],
        !toggleAccessories,
    );
    setDotsDisabled(
        node,
        ["facewear", "neckwear", "armwear"],
        !toggleAccessories,
    );

    // show_body_details -> 3 body details override toggle widgets + raw dots
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["upper_details_override"],
        !(showBody && showUpperBody && showBodyDetails),
    );
    setDotsDisabled(
        node,
        ["upper_details"],
        !(showBody && showUpperBody && showBodyDetails),
    );

    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["mid_details_override"],
        !(showBody && showMidBody && showBodyDetails),
    );
    setDotsDisabled(
        node,
        ["mid_details"],
        !(showBody && showMidBody && showBodyDetails),
    );

    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["lower_details_override"],
        !(showBody && showLowerBody && showBodyDetails),
    );
    setDotsDisabled(
        node,
        ["lower_details"],
        !(showBody && showLowerBody && showBodyDetails),
    );

    // show_body -> 4 body sub-toggles
    setDisabled(
        node,
        ["show_upper_body", "show_mid_body", "show_lower_body", "show_butt"],
        !showBody,
    );
    setDotsDisabled(node, ["upper_body"], !(showBody && showUpperBody));
    setDotsDisabled(node, ["mid_body"], !(showBody && showMidBody));
    setDotsDisabled(node, ["lower_body"], !(showBody && showLowerBody));
    setDotsDisabled(node, ["butt"], !(showBody && showButt));

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachCharacterBuilder = (node) => {
    // --- Replace override pairs with InlineTextToggleWidget ---
    const toggleWidgets = replaceWithToggleWidgets(node);

    // --- Hook all toggle bools to re-apply visibility cascade ---
    const toggleNames = [
        "show_eyes",
        "show_eyeballs",
        "bald",
        "show_nails",
        "show_makeup",
        "toggle_accessories",
        "show_body",
        "show_body_details",
        "show_upper_body",
        "show_mid_body",
        "show_lower_body",
        "show_butt",
    ];
    for (const name of toggleNames) {
        const w = findWidget(node, name);
        if (w) hookWidget(w, () => applyAllVisibility(node, toggleWidgets));
    }

    // Initial visibility
    applyAllVisibility(node, toggleWidgets);

    // --- Toggle borders ---
    const outlines = [
        { name: "show_eyeballs" },
        { name: "show_makeup" },
        { name: "show_upper_body" },
        { name: "show_mid_body" },
        { name: "show_lower_body" },
        { name: "show_butt" },
    ];
    const groups = [
        { from: "show_eyes", to: "eyewear_override" },
        { from: "bald", to: "bald" },
        { from: "show_nails", to: "show_makeup" },
        { from: "toggle_accessories", to: "armwear_override" },
        { from: "show_body", to: "show_butt" },
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
            drawGroupBorder(
                ctx,
                node,
                group.from,
                group.to,
                COLORS.toggle_on,
                COLORS.toggle_off,
            );
        }
    };

    // --- Preset manager ---
    const { presetRow, exportImportRow } = createPresetManager(node, {
        nodeLabel: NODE_NAME,
        onCapture: () => captureState(node),
        onRecall: (state) => recallState(node, state, toggleWidgets),
    });

    node.widgets.push(presetRow);
    node.widgets.push(exportImportRow);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachCharacterBuilder));
