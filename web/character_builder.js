import { COLORS } from "./constants.js";
import { attachInlineSelector } from "./inline_selector.js";
import { createPresetManager } from "./preset_manager.js";
import {
    drawGroupBorder,
    drawWidgetOutline,
    findWidget,
    hideWidget,
    hideWidgetInput,
    registerNode,
    setInputDotColor,
    waitForWidgets,
} from "./utils.js";
import { InlineTextToggleWidget } from "./widgets/inline_text_toggle_widget.js";

// --- Constants ---

const NODE_NAME = "CharacterBuilder";

// Override pairs: text widget name -> mode widget name
const OVERRIDE_FIELDS = [
    "eyes_override",
    "pupils_override",
    "eyewear_override",
    "teeth_override",
    "face_details_override",
    "face_piercings_override",
    "upper_piercings_override",
    "mid_piercings_override",
    "lower_piercings_override",
    "nail_color_override",
    "face_accessories_override",
    "neck_details_override",
    "hand_details_override",
];

const BOOL_FIELDS = [
    "show_eyes",
    "show_eyeballs",
    "show_piercings",
    "show_nails",
    "show_makeup",
    "toggle_accessories",
    "show_body",
    "show_upper_body",
    "show_mid_body",
    "show_lower_body",
    "show_butt",
    ...OVERRIDE_FIELDS.map((f) => `${f}_mode`),
];

// --- Replace native widget pairs with InlineTextToggleWidget ---

const convertToInlineTextToggle = (node, textWidget, modeWidget) => {
    const helper = new InlineTextToggleWidget(
        textWidget.name,
        textWidget,
        modeWidget,
    );

    // Build a brand new custom widget object
    const newWidget = {
        name: textWidget.name,
        type: "custom",
        value: textWidget.value, // Kept for compatibility, not used for render
        get value() {
            return textWidget.value;
        },
        set value(v) {
            textWidget.value = v;
        },
        draw: (ctx, n, width, posY, height) =>
            helper.draw(ctx, n, width, posY, height),
        mouse: (event, pos, n) => helper.mouse(event, pos, n),
        computeSize: () => helper.computeSize(),
        serializeValue: textWidget.serializeValue,
    };

    const idx = node.widgets.indexOf(textWidget);
    node.widgets[idx] = newWidget;

    hideWidget(modeWidget, true);
    hideWidgetInput(node, modeWidget);

    return helper;
};

const replaceWithToggleWidgets = (node) => {
    const toggleWidgets = {};

    for (const field of OVERRIDE_FIELDS) {
        const textWidget = findWidget(node, field);
        const modeWidget = findWidget(node, `${field}_mode`);
        if (!textWidget || !modeWidget) continue;

        toggleWidgets[field] = convertToInlineTextToggle(
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
    const hairSelected = findWidget(node, "hair_style_override_selected");
    if (hairSelected)
        state["hair_style_override_selected"] = hairSelected.value ?? "";
    return state;
};

const recallState = (node, state, hairSelector) => {
    for (const field of [
        ...BOOL_FIELDS,
        ...OVERRIDE_FIELDS,
        "hair_style_override_selected",
    ]) {
        if (!(field in state)) continue;
        const w = findWidget(node, field);
        if (!w) continue;
        w.value = state[field];
        w.callback?.(state[field]);
    }
    hairSelector?.renderColored();
    applyAllVisibility(node);
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
    const showPiercings = get("show_piercings");
    const showNails = get("show_nails");
    const showMakeup = get("show_makeup");
    const toggleAccessories = get("toggle_accessories");
    const showBody = get("show_body");
    const showUpperBody = get("show_upper_body");
    const showMidBody = get("show_mid_body");
    const showLowerBody = get("show_lower_body");
    const showButt = get("show_butt");

    // show_eyes -> show_eyeballs + eye_details dot
    setDisabled(node, ["show_eyeballs"], !showEyes);
    setDotsDisabled(node, ["eye_details"], !showEyes);

    // show_eyeballs -> eyes_override + pupils_override toggle widgets, + raw dots
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["eyes_override", "pupils_override"],
        !(showEyes && showEyeballs),
    );
    setDotsDisabled(
        node,
        ["eye_color", "eye_type", "pupils"],
        !(showEyes && showEyeballs),
    );

    // show_piercings -> 4 piercing override toggle widgets + raw dots
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["face_piercings_override"],
        !showPiercings,
    );
    setDotsDisabled(node, ["face_piercings"], !showPiercings);
    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["upper_piercings_override"],
        !(showBody && showUpperBody && showPiercings),
    );

    setDotsDisabled(
        node,
        ["upper_piercings"],
        !(showBody && showUpperBody && showPiercings),
    );

    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["mid_piercings_override"],
        !(showBody && showMidBody && showPiercings),
    );
    setDotsDisabled(
        node,
        ["mid_piercings"],
        !(showBody && showMidBody && showPiercings),
    );

    setToggleWidgetDisabled(
        node,
        toggleWidgets,
        ["lower_piercings_override"],
        !(showBody && showLowerBody && showPiercings),
    );
    setDotsDisabled(
        node,
        ["lower_piercings"],
        !(showBody && showLowerBody && showPiercings),
    );

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
        [
            "face_accessories_override",
            "neck_details_override",
            "hand_details_override",
        ],
        !toggleAccessories,
    );
    setDotsDisabled(
        node,
        ["face_accessories", "neck_details", "hand_details"],
        !toggleAccessories,
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

    // --- Hair style override inline selector ---
    const hairOptionsWidget = findWidget(node, "hair_style_override_options");
    const hairSelectedWidget = findWidget(node, "hair_style_override_selected");
    let hairSelector = null;
    if (hairOptionsWidget && hairSelectedWidget) {
        hideWidget(hairSelectedWidget, true);
        hideWidgetInput(node, hairSelectedWidget);
        hairSelector = attachInlineSelector(
            node,
            hairOptionsWidget,
            hairSelectedWidget,
            {
                placeholder: "hair style override",
            },
        );
    }

    // --- Hook all toggle bools to re-apply visibility cascade ---
    const toggleNames = [
        "show_eyes",
        "show_eyeballs",
        "show_piercings",
        "show_nails",
        "show_makeup",
        "toggle_accessories",
        "show_body",
        "show_upper_body",
        "show_mid_body",
        "show_lower_body",
        "show_butt",
    ];
    for (const name of toggleNames) {
        const w = findWidget(node, name);
        if (!w) continue;
        const original = w.callback;
        w.callback = function (value) {
            if (original) original.call(this, value);
            applyAllVisibility(node, toggleWidgets);
        };
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
        { from: "show_eyes", to: "face_details_override" },
        { from: "show_piercings", to: "lower_piercings_override" },
        { from: "show_nails", to: "show_makeup" },
        { from: "toggle_accessories", to: "hand_details_override" },
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
        onRecall: (state) => recallState(node, state, hairSelector),
    });

    node.widgets.push(presetRow);
    node.widgets.push(exportImportRow);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachCharacterBuilder));
