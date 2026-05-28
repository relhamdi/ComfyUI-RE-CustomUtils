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

// --- Dropdown refresh ---

const refreshDropdown = (node, selectedWidget, comboWidget) => {
    const options = [];

    for (let i = 0; i < NUM_INPUTS; i++) {
        const input = node.inputs?.find((inp) => inp.name === `input_${i}`);
        if (!input?.link) continue;

        const link = app.graph.links[input.link];
        if (!link) continue;

        const sourceNode = app.graph.getNodeById(link.origin_id);
        if (!sourceNode) continue;

        const title =
            sourceNode.title?.trim() ||
            sourceNode.type ||
            `node_${link.origin_id}`;
        options.push(`${i}: ${title}`);
    }

    if (options.length === 0) {
        options.push(EMPTY_VALUE);
    }

    comboWidget.options.values = options;

    // Preserve selection if still valid
    if (!options.includes(comboWidget.value)) {
        comboWidget.value = options[0];
    }

    // Sync to backend STRING
    selectedWidget.value = comboWidget.value;

    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Attach ---

const attachRouter = (node) => {
    if (node.type !== NODE_NAME) return;
    if (node._routerAttached) return;
    node._routerAttached = true;

    const selectedWidget = node.widgets?.find((w) => w.name === "selected");
    if (!selectedWidget) return;

    // Hide native STRING widget
    hideWidget(selectedWidget);

    // Create frontend combo widget
    const comboWidget = node.addWidget(
        "combo",
        "source",
        EMPTY_VALUE,
        (value) => {
            // Sync combo -> backend STRING
            selectedWidget.value = value;
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
