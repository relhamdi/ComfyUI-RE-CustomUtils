import { debounce, hideWidget, updateSlotVisibility } from "./utils.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const NODE_NAME = "PromptRouter";

const NUM_INPUTS = 10;
const EMPTY_VALUE = "--";

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

const getCurrentTitles = (node) => {
    const titles = [];
    for (let i = 0; i < NUM_INPUTS; i++) {
        const source = getSourceNode(node, i);
        if (source) titles.push(`${i}:${getSourceTitle(source)}`);
    }
    return titles;
};

const isRouter = (sourceNode) => sourceNode?.type === NODE_NAME;

const getRouterOptions = (routerNode) => {
    const options = [];
    for (let i = 0; i < NUM_INPUTS; i++) {
        const source = getSourceNode(routerNode, i);
        if (!source) continue;
        const title = getSourceTitle(source);
        const indicator = isRouter(source) ? " ▶" : "";
        options.push({
            label: `${i}: ${title}${indicator}`,
            index: i,
            source,
        });
    }
    return options;
};

// --- Sub-dropdown ---

const destroySubDropdown = (node) => {
    if (!node._subComboWidget) return;

    // Restore child router's original onConnectionsChange
    if (node._hookedChildRouter?._parentRouterHook) {
        delete node._hookedChildRouter._parentRouterHook;
        node._hookedChildRouter.onConnectionsChange =
            node._hookedChildRouter._originalConnectionChange;
    }
    node._hookedChildRouter = null;

    const idx = node.widgets.indexOf(node._subComboWidget);
    if (idx !== -1) node.widgets.splice(idx, 1);
    node._subComboWidget = null;
    node._subSelectedWidget = null;
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const buildSubDropdown = (node, routerNode, selectedWidget) => {
    destroySubDropdown(node);

    // --- Connection change hook - Refresh items when child nodes are updated ---
    const originalChildConnectionChange = routerNode.onConnectionsChange;
    routerNode._parentRouterHook = function (...args) {
        if (originalChildConnectionChange)
            originalChildConnectionChange.call(this, ...args);
        // Refresh parent dropdown after debounce
        setTimeout(() => node.refreshDropdown(), 100);
    };
    routerNode.onConnectionsChange = routerNode._parentRouterHook;
    node._hookedChildRouter = routerNode;

    const subOptions = getRouterOptions(routerNode);
    const labels =
        subOptions.length > 0 ? subOptions.map((o) => o.label) : [EMPTY_VALUE];

    // Find Python-backed widget for persistence
    const subSelectedWidget = node.widgets?.find(
        (w) => w.name === "_sub_selected",
    );

    // Restore saved value if still valid
    const savedValue = subSelectedWidget?.value;
    const initialValue =
        savedValue && labels.includes(savedValue) ? savedValue : labels[0];

    const subCombo = node.addWidget(
        "combo",
        "_sub_source",
        initialValue,
        (value) => {
            // Store sub-selection in hidden widget
            if (subSelectedWidget) subSelectedWidget.value = value;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },
        { values: labels },
    );

    subCombo._isSubCombo = true;

    // Sync initial value to Python widget
    if (subSelectedWidget) subSelectedWidget.value = initialValue;

    node._subComboWidget = subCombo;
    node._subSelectedWidget = subSelectedWidget;

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Dropdown refresh ---

const refreshDropdown = (node, selectedWidget, comboWidget) => {
    const options = getRouterOptions(node);

    if (options.length === 0) {
        comboWidget.options.values = [EMPTY_VALUE];
        comboWidget.value = EMPTY_VALUE;
        selectedWidget.value = EMPTY_VALUE;
        destroySubDropdown(node);
        if (node.graph) node.graph.setDirtyCanvas(true, true);
        return;
    }

    const labels = options.map((o) => o.label);
    const current = comboWidget.value;

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
    if (selectedOption && isRouter(selectedOption.source)) {
        buildSubDropdown(node, selectedOption.source, selectedWidget);
    } else {
        destroySubDropdown(node);
    }

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachRouter = (node) => {
    if (node.type !== NODE_NAME) return;
    if (node._routerAttached) return;
    node._routerAttached = true;

    const selectedWidget = node.widgets?.find((w) => w.name === "selected");
    const subSelectedWidget = node.widgets?.find(
        (w) => w.name === "_sub_selected",
    );
    if (!selectedWidget) return;

    // Hide native Python widgets
    hideWidget(selectedWidget);
    if (subSelectedWidget) hideWidget(subSelectedWidget);

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
            if (selectedOption && isRouter(selectedOption.source)) {
                buildSubDropdown(node, selectedOption.source, selectedWidget);
            } else {
                destroySubDropdown(node);
            }

            if (node.graph) node.graph.setDirtyCanvas(true, true);
        },

        { values: [EMPTY_VALUE] },
    );

    node.refreshDropdown = () =>
        refreshDropdown(node, selectedWidget, comboWidget);

    // --- Draw Foreground hook - Title change detection ---
    let lastTitles = [];
    const originalDrawForeground = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        if (originalDrawForeground) originalDrawForeground.call(this, ctx);

        const currentTitles = getCurrentTitles(node);
        if (JSON.stringify(currentTitles) !== JSON.stringify(lastTitles)) {
            lastTitles = currentTitles;
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

app.registerExtension({
    name: NODE_NAME,
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);

            const node = this;
            requestAnimationFrame(() => attachRouter(node));
        };
    },
});
