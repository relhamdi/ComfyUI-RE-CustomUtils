import { EMPTY_VALUE } from "./constants.js";
import { NODE_NAME as LAYOUT_FILLER_NODE_NAME } from "./prompt_layout_filler.js";
import { NODE_NAME as OPTION_PICKER_NODE_NAME } from "./prompt_option_picker.js";
import { NODE_NAME as PRESET_SELECTOR_NODE_NAME } from "./prompt_preset_selector.js";
import {
    debounce,
    findWidget,
    hideWidget,
    parseComaString,
    registerNode,
    updateSlotVisibility,
    waitForWidgets,
} from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "PromptRouter";

const NUM_INPUTS = 10;

// --- Helpers ---

const getSourceNode = (node, inputIndex) => {
    const input = node.inputs?.find(
        (inp) => inp.name === `input_${inputIndex}`,
    );
    if (!input?.link) return null;

    const link = app.graph.links[input.link];
    if (!link) return null;

    return app.graph.getNodeById(link.origin_id) ?? null;
};

const getSourceTitle = (sourceNode) => {
    return sourceNode?.title?.trim() || sourceNode?.type || "unknown";
};

const getCurrentSignatures = (node) => {
    const sigs = [];
    for (let i = 0; i < NUM_INPUTS; i++) {
        const source = getSourceNode(node, i);
        if (!source) continue;
        const title = getSourceTitle(source);
        const sig = isSpecialNode(source)
            ? getSpecialNodeSignature(source)
            : isRouter(source)
              ? getCurrentSignatures(source).join("|")
              : "";
        sigs.push(`${i}:${title}:${sig}`);
    }
    return sigs;
};

const isRouter = (sourceNode) => sourceNode?.type === NODE_NAME;
const isOptionPicker = (node) => node?.type === OPTION_PICKER_NODE_NAME;
const isLayoutFiller = (node) => node?.type === LAYOUT_FILLER_NODE_NAME;
const isPresetSelector = (node) => node?.type === PRESET_SELECTOR_NODE_NAME;

const isSpecialNode = (node) =>
    isOptionPicker(node) || isLayoutFiller(node) || isPresetSelector(node);

const getSpecialNodeOptions = (sourceNode) => {
    if (isOptionPicker(sourceNode)) {
        return sourceNode._labelMap ? [...sourceNode._labelMap.keys()] : [];
    }
    if (isLayoutFiller(sourceNode)) {
        try {
            const w = findWidget(sourceNode, "preset_data");
            const data = JSON.parse(w?.value ?? "{}");
            return Object.keys(data).sort();
        } catch {
            return [];
        }
    }
    if (isPresetSelector(sourceNode)) {
        const namesWidget = findWidget(sourceNode, "preset_names");
        const names = parseComaString(namesWidget?.value);
        if (names.length) return names;
        // Fallback sur indices
        const presetWidget = findWidget(sourceNode, "preset_index");
        const count = sourceNode._presetCount ?? 1;
        return Array.from({ length: count }, (_, i) => `preset_${i}`);
    }
    return [];
};

const getSpecialNodeSignature = (sourceNode) => {
    if (isOptionPicker(sourceNode)) {
        return [...(sourceNode._labelMap?.keys() ?? [])].join(",");
    }
    if (isLayoutFiller(sourceNode)) {
        return findWidget(sourceNode, "preset_data")?.value ?? "";
    }
    if (isPresetSelector(sourceNode)) {
        return findWidget(sourceNode, "preset_names")?.value ?? "";
    }
    return "";
};

const getRouterOptions = (routerNode) => {
    const options = [];
    for (let i = 0; i < NUM_INPUTS; i++) {
        const source = getSourceNode(routerNode, i);
        if (!source) continue;
        const title = getSourceTitle(source);
        const indicator = isRouter(source)
            ? " ▶"
            : isSpecialNode(source)
              ? " ◆"
              : "";
        options.push({ label: `${i}: ${title}${indicator}`, index: i, source });
    }
    return options;
};

const setSpecialNodeValue = (sourceNode, value) => {
    if (isOptionPicker(sourceNode)) {
        const widget = findWidget(sourceNode, "selected");
        if (!widget) return;
        const options = widget.options?.values ?? [];
        if (!options.includes(value)) return;
        widget.value = sourceNode._labelMap?.get(value) ?? value;
        widget.callback?.(value);
    }
    if (isLayoutFiller(sourceNode)) {
        // Recall preset via presetRow
        const presetRow = findWidget(sourceNode, "preset_row");
        if (!presetRow) return;
        presetRow.value = value;
        presetRow.onSelect?.(value);
    }
    if (isPresetSelector(sourceNode)) {
        const namesWidget = findWidget(sourceNode, "preset_names");
        const names = parseComaString(namesWidget?.value);
        const idx = names.indexOf(value);
        const presetWidget = findWidget(sourceNode, "preset_index");
        if (!presetWidget) return;
        presetWidget.value =
            idx >= 0 ? idx : parseInt(value.replace("preset_", "")) || 0;
        presetWidget.callback?.(presetWidget.value);
    }
};

// --- Sub-dropdown ---

const destroySubDropdown = (node) => {
    if (!node._subComboWidget) return;

    // Remove this parent's connection change listener from child router
    if (node._hookedChildRouter) {
        node._hookedChildRouter._parentConnectionListeners?.delete(node);
        node._hookedChildRouter = null;
    }

    // Remove this parent's combo listener from child router
    if (node._hookedChildCombo) {
        const { widget, listener } = node._hookedChildCombo;
        widget._parentListeners?.delete(listener);
        node._hookedChildCombo = null;
    }

    const idx = node.widgets.indexOf(node._subComboWidget);
    if (idx !== -1) node.widgets.splice(idx, 1);
    node._subComboWidget = null;
    node._subSelectedWidget = null;
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const buildSubDropdown = (node, routerNode, selectedWidget) => {
    destroySubDropdown(node);

    // --- Connection change hook - Refresh items when child nodes are updated ---
    if (!routerNode._parentConnectionListeners) {
        routerNode._parentConnectionListeners = new Set();
        const originalConnectionChange = routerNode.onConnectionsChange;
        routerNode.onConnectionsChange = function (...args) {
            if (originalConnectionChange)
                originalConnectionChange.call(this, ...args);
            for (const parentNode of routerNode._parentConnectionListeners) {
                // Refresh parent dropdown after debounce
                setTimeout(() => parentNode.refreshDropdown?.(), 100);
            }
        };
    }
    routerNode._parentConnectionListeners.add(node);
    node._hookedChildRouter = routerNode;

    const subOptions = getRouterOptions(routerNode);
    const labels =
        subOptions.length > 0 ? subOptions.map((o) => o.label) : [EMPTY_VALUE];

    // Find Python-backed widget for persistence
    const subSelectedWidget = findWidget(node, "_sub_selected");
    // Read child router's current selection for initial value
    const childSelectedWidget = findWidget(routerNode, "selected");
    const childComboWidget = findWidget(routerNode, "source");

    const checkSubSpecial = (value) => {
        const freshSubOptions = getRouterOptions(routerNode);
        const subOption = freshSubOptions.find((o) => o.label === value);
        if (subOption && isSpecialNode(subOption.source)) {
            buildValueDropdown(node, subOption.source, selectedWidget);
        } else {
            destroyValueDropdown(node);
        }
    };

    if (childComboWidget) {
        // Initialize listener set once on the child widget
        if (!childComboWidget._parentListeners) {
            childComboWidget._parentListeners = new Set();
            const originalCallback = childComboWidget.callback;
            childComboWidget.callback = function (value) {
                if (originalCallback) originalCallback.call(this, value);
                for (const listener of childComboWidget._parentListeners) {
                    listener(value);
                }
            };
        }

        // Add this parent's listener
        const listener = (value) => {
            if (node._subComboWidget?.options.values.includes(value)) {
                node._subComboWidget.value = value;
            }
            checkSubSpecial(value);
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        };
        childComboWidget._parentListeners.add(listener);
        node._hookedChildCombo = { widget: childComboWidget, listener };
    }

    // Restore saved value if still valid, fallback to child's own selection
    const savedValue = subSelectedWidget?.value;
    const childSavedValue = childSelectedWidget?.value;
    const initialValue =
        savedValue && labels.includes(savedValue)
            ? savedValue
            : childSavedValue && labels.includes(childSavedValue)
              ? childSavedValue
              : labels[0];

    // Sync initial value to child router
    if (childSelectedWidget) childSelectedWidget.value = initialValue;

    const subCombo = node.addWidget(
        "combo",
        "_sub_source",
        initialValue,
        (value) => {
            if (childSelectedWidget) childSelectedWidget.value = value;
            if (subSelectedWidget) subSelectedWidget.value = value;

            // Refresh child router's own dropdown to reflect the change visually
            if (routerNode.refreshDropdown) routerNode.refreshDropdown();

            // Notify all other parent listeners manually
            if (childComboWidget?._parentListeners) {
                for (const listener of childComboWidget._parentListeners) {
                    listener(value);
                }
            }

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },
        { values: labels },
    );

    subCombo._isSubCombo = true;

    // Sync initial value to Python widget
    if (subSelectedWidget) subSelectedWidget.value = initialValue;

    node._subComboWidget = subCombo;
    node._subSelectedWidget = subSelectedWidget;

    // Hook subCombo callback to detect special nodes
    const originalSubCallback = subCombo.callback;
    subCombo.callback = function (value) {
        if (originalSubCallback) originalSubCallback.call(this, value);
        checkSubSpecial(value);
    };

    // Initial check
    checkSubSpecial(initialValue);

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const destroyValueDropdown = (node) => {
    if (!node._valueComboWidget) return;

    // Clean source node hook
    if (node._hookedValueSource) {
        const { widget, listener } = node._hookedValueSource;
        widget._routerListeners?.delete(listener);
        node._hookedValueSource = null;
    }

    // Empty _value_selected
    const valueSelectedWidget = findWidget(node, "_value_selected");
    if (valueSelectedWidget) valueSelectedWidget.value = EMPTY_VALUE;

    const idx = node.widgets.indexOf(node._valueComboWidget);
    if (idx !== -1) node.widgets.splice(idx, 1);
    node._valueComboWidget = null;
    node._valueSourceNode = null;

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const getCurrentSpecialValue = (sourceNode, options) => {
    if (isOptionPicker(sourceNode)) {
        const w = findWidget(sourceNode, "selected");
        if (!w) return options[0];
        const label = [...(sourceNode._labelMap?.entries() ?? [])].find(
            ([, v]) => v === w.value,
        )?.[0];
        return options.includes(label) ? label : options[0];
    }
    if (isPresetSelector(sourceNode)) {
        const namesWidget = findWidget(sourceNode, "preset_names");
        const names = parseComaString(namesWidget?.value);
        const idx = findWidget(sourceNode, "preset_index")?.value ?? 0;
        const label = names[idx] ?? `preset_${idx}`;
        return options.includes(label) ? label : options[0];
    }
    if (isLayoutFiller(sourceNode)) {
        const presetRow = findWidget(sourceNode, "preset_row");
        const label = presetRow?.value ?? options[0];
        return options.includes(label) ? label : options[0];
    }
    return options[0];
};

// Hook source node <-> router sync
const hookSourceNode = (
    node,
    sourceNode,
    valueSelectedWidget,
    valueCombo,
    usesValueSelected,
) => {
    if (isOptionPicker(sourceNode)) {
        const widget = findWidget(sourceNode, "selected");
        if (!widget) return;

        if (!widget._routerListeners) {
            widget._routerListeners = new Set();
            const original = widget.callback;
            widget.callback = function (value) {
                if (original) original.call(this, value);
                for (const listener of widget._routerListeners) {
                    listener(value);
                }
            };
        }

        const listener = (labelOrRaw) => {
            const label = sourceNode._labelMap?.has(labelOrRaw)
                ? labelOrRaw
                : ([...(sourceNode._labelMap?.entries() ?? [])].find(
                      ([, v]) => v === labelOrRaw,
                  )?.[0] ?? labelOrRaw);

            if (valueCombo.options.values.includes(label)) {
                valueCombo.value = label;
            }
            if (usesValueSelected && valueSelectedWidget) {
                const rawValue = sourceNode._labelMap?.get(label) ?? label;
                valueSelectedWidget.value = rawValue;
            }
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        };

        widget._routerListeners.add(listener);
        node._hookedValueSource = { widget, listener };
    }

    if (isPresetSelector(sourceNode)) {
        const presetWidget = findWidget(sourceNode, "preset_index");
        const namesWidget = findWidget(sourceNode, "preset_names");
        if (!presetWidget) return;

        if (!presetWidget._routerListeners) {
            presetWidget._routerListeners = new Set();
            const original = presetWidget.callback;
            presetWidget.callback = function (value) {
                if (original) original.call(this, value);
                for (const listener of presetWidget._routerListeners) {
                    listener(value);
                }
            };
        }

        const listener = (idx) => {
            const names = parseComaString(namesWidget?.value);
            const label = names[idx] ?? `preset_${idx}`;
            if (valueCombo.options.values.includes(label)) {
                valueCombo.value = label;
            }
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        };

        presetWidget._routerListeners.add(listener);
        node._hookedValueSource = { widget: presetWidget, listener };
    }

    if (isLayoutFiller(sourceNode)) {
        const presetRow = findWidget(sourceNode, "preset_row");
        if (!presetRow) return;

        if (!presetRow._routerListeners) {
            presetRow._routerListeners = new Set();
            const originalSelect = presetRow.onSelect;
            presetRow.onSelect = function (value) {
                if (originalSelect) originalSelect.call(this, value);
                for (const listener of presetRow._routerListeners) {
                    listener(value);
                }
            };
        }

        const listener = (value) => {
            if (valueCombo.options.values.includes(value)) {
                valueCombo.value = value;
            }
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        };

        presetRow._routerListeners.add(listener);
        node._hookedValueSource = { widget: presetRow, listener };
    }
};

const buildValueDropdown = (node, sourceNode, selectedWidget) => {
    destroyValueDropdown(node);

    const options = getSpecialNodeOptions(sourceNode);
    if (!options.length) return;

    const valueSelectedWidget = findWidget(node, "_value_selected");
    const initialValue = getCurrentSpecialValue(sourceNode, options);
    const usesValueSelected = isOptionPicker(sourceNode);

    const valueCombo = node.addWidget(
        "combo",
        "value_source",
        initialValue,
        (value) => {
            setSpecialNodeValue(sourceNode, value);
            if (usesValueSelected && valueSelectedWidget) {
                // Convert label to real value
                const rawValue = sourceNode._labelMap?.get(value) ?? value;
                valueSelectedWidget.value = rawValue;
            } else if (valueSelectedWidget) {
                valueSelectedWidget.value = EMPTY_VALUE; // Reset value
            }

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },
        { values: options },
    );

    hookSourceNode(
        node,
        sourceNode,
        valueSelectedWidget,
        valueCombo,
        usesValueSelected,
    );

    node._valueComboWidget = valueCombo;
    node._valueSourceNode = sourceNode;

    // Sync initial value
    setSpecialNodeValue(sourceNode, initialValue);
    if (usesValueSelected && valueSelectedWidget) {
        const rawValue =
            sourceNode._labelMap?.get(initialValue) ?? initialValue;
        valueSelectedWidget.value = rawValue;
    } else if (valueSelectedWidget) {
        valueSelectedWidget.value = EMPTY_VALUE;
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const buildSecondaryDropdown = (node, sourceNode, selectedWidget) => {
    if (isRouter(sourceNode)) {
        destroyValueDropdown(node);
        buildSubDropdown(node, sourceNode, selectedWidget);
    } else if (isSpecialNode(sourceNode)) {
        destroySubDropdown(node);
        buildValueDropdown(node, sourceNode, selectedWidget);
    } else {
        destroySubDropdown(node);
        destroyValueDropdown(node);
    }
};

// --- Dropdown refresh ---

const refreshDropdown = (node, selectedWidget, comboWidget) => {
    const options = getRouterOptions(node);

    if (options.length === 0) {
        comboWidget.options.values = [EMPTY_VALUE];
        comboWidget.value = EMPTY_VALUE;
        selectedWidget.value = EMPTY_VALUE;
        destroySubDropdown(node);
        destroyValueDropdown(node);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
        return;
    }

    const labels = options.map((o) => o.label);
    comboWidget.options.values = labels;

    // Restore from saved Python value first, then current combo, then first
    const savedValue = selectedWidget.value;
    if (savedValue && labels.includes(savedValue)) {
        comboWidget.value = savedValue; // Restored from undo/reload
    } else if (labels.includes(comboWidget.value)) {
        comboWidget.value = comboWidget.value; // Keep current
    } else {
        comboWidget.value = labels[0]; // Fallback
    }

    // Sync to backend STRING
    selectedWidget.value = comboWidget.value;

    // Check if selected source is a sub-router
    const selectedOption = options.find((o) => o.label === comboWidget.value);
    if (selectedOption) {
        buildSecondaryDropdown(node, selectedOption.source, selectedWidget);
    } else {
        destroySubDropdown(node);
        destroyValueDropdown(node);
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachRouter = (node) => {
    const selectedWidget = findWidget(node, "selected");
    const subSelectedWidget = findWidget(node, "_sub_selected");
    const valueSelectedWidget = findWidget(node, "_value_selected");
    if (!selectedWidget) return;

    // Hide native Python widgets
    hideWidget(selectedWidget);
    if (subSelectedWidget) hideWidget(subSelectedWidget);
    if (valueSelectedWidget) hideWidget(valueSelectedWidget);

    // Create frontend combo widget
    const comboWidget = node.addWidget(
        "combo",
        "source",
        EMPTY_VALUE,
        (value) => {
            // Sync combo -> backend STRING
            selectedWidget.value = value;

            // Update sub-dropdown if selected source is a router
            const options = getRouterOptions(node);
            const selectedOption = options.find((o) => o.label === value);
            if (selectedOption) {
                buildSecondaryDropdown(
                    node,
                    selectedOption.source,
                    selectedWidget,
                );
            } else {
                destroySubDropdown(node);
                destroyValueDropdown(node);
            }

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },

        { values: [EMPTY_VALUE] },
    );

    node.refreshDropdown = () =>
        refreshDropdown(node, selectedWidget, comboWidget);

    // --- Draw Foreground hook - Title change detection ---
    let lastSignatures = [];
    const originalDrawForeground = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (originalDrawForeground) originalDrawForeground.call(this, ctx);

        const currentSignatures = getCurrentSignatures(node);
        if (
            JSON.stringify(currentSignatures) !== JSON.stringify(lastSignatures)
        ) {
            lastSignatures = currentSignatures;
            node.refreshDropdown();
        }
    };

    const debouncedUpdate = debounce(() => {
        updateSlotVisibility(node, NUM_INPUTS, "input");
        refreshDropdown(node, selectedWidget, comboWidget);
    }, 64);

    // --- Connection change hook - Re-render when nodes are connected or disconnected ---
    const originalConnectionChange = node.onConnectionsChange;
    node.onConnectionsChange = function (...args) {
        if (originalConnectionChange)
            originalConnectionChange.call(this, ...args);
        debouncedUpdate();
    };

    // Initial render
    updateSlotVisibility(node, NUM_INPUTS, "input");
    node.refreshDropdown();
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachRouter));
