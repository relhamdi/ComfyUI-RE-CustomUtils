import { API_ROOT, COLORS, EMPTY_VALUE } from "./constants.js";
import { createLoaderCrud } from "./loader_crud.js";
import {
    drawGroupBorder,
    drawWidgetOutline,
    findWidget,
    hookWidget,
    parseComaString,
    registerNode,
    setWidgetValue,
    waitForWidgets,
} from "./utils.js";
import { ButtonRowWidget } from "./widgets/button_row_widget.js";
import { replaceWithClickableField } from "./widgets/clickable_field_widget.js";
import { showSearchOverlay } from "./widgets/search_overlay.js";

// --- Constants ---

const NODE_NAME = "OutfitLoader";
const BASE_ENDPOINT = `${API_ROOT}/outfits`;

const OUTFIT_PARTS = [
    "hat",
    "facewear",
    "neckwear",
    "coat",
    "midlayer",
    "top",
    "armwear",
    "accessories",
    "bottom",
    "legwear",
    "footwear",
];

const OUTFIT_TEMPLATE = {
    name: "",
    ...Object.fromEntries(OUTFIT_PARTS.map((p) => [p, [EMPTY_VALUE]])),
    tags: [],
};

// --- Search index (shared across instances) ---

let outfitIndex = [];

const refreshSearchIndex = async () => {
    try {
        const res = await fetch(`${BASE_ENDPOINT}/search_index`);
        const data = await res.json();
        outfitIndex = data.index ?? [];
    } catch (e) {
        console.warn(`[${NODE_NAME}] Failed to fetch search index:`, e);
    }
};

refreshSearchIndex();

// --- Combo helper (full options replace) ---

const setComboOptions = (widget, values, selected) => {
    const safeValues = values.length ? values : [EMPTY_VALUE];
    widget.options.values = safeValues;
    widget.value = selected ?? safeValues[0];
};

// --- JSON <-> Widgets sync ---

const buildJsonFromWidgets = (node) => {
    const tagsRaw = findWidget(node, "tags")?.value ?? "";
    const tags = (parseComaString(tagsRaw) ?? []).sort((a, b) =>
        a.localeCompare(b),
    );

    const data = {
        name: findWidget(node, "name")?.value ?? "",
        tags,
    };
    for (const part of OUTFIT_PARTS) {
        data[part] = findWidget(node, part)?.options?.values ?? [EMPTY_VALUE];
    }
    return JSON.stringify(data, null, 2);
};

const pushJsonToWidgets = (node, data) => {
    setWidgetValue(findWidget(node, "name"), data.name ?? "");
    setWidgetValue(findWidget(node, "tags"), (data.tags ?? []).join(", "));

    for (const part of OUTFIT_PARTS) {
        const widget = findWidget(node, part);
        if (!widget) continue;
        const values = data[part]?.length ? data[part] : [EMPTY_VALUE];
        setComboOptions(widget, values);
        widget.callback?.(widget.value);
    }
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Buttons ---

const handleAddVariant = (node, part) => {
    const widget = findWidget(node, part);
    if (!widget) return;

    const value = prompt(`New ${part} variant:`);
    if (!value?.trim()) return;

    const values = widget.options.values.filter((v) => v !== EMPTY_VALUE);
    values.push(value.trim());
    setComboOptions(widget, values, value.trim());
    widget.callback?.(widget.value);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const handleEditVariant = (node, part) => {
    const widget = findWidget(node, part);
    if (!widget) return;

    const values = widget.options.values;
    const currentIdx = values.indexOf(widget.value);
    if (currentIdx === -1) return;

    const edited = prompt(`Edit ${part} variant:`, widget.value);
    if (edited === null) return;
    const trimmed = edited.trim();
    if (!trimmed) return;

    const newValues = [...values];
    newValues[currentIdx] = trimmed;
    setComboOptions(widget, newValues, trimmed);
    widget.callback?.(widget.value);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

const handleDeleteVariant = (node, part) => {
    const widget = findWidget(node, part);
    if (!widget) return;

    const values = widget.options.values;
    if (!values.length) return;

    const listing = values.map((v, i) => `${i}: ${v}`).join("\n");
    const input = prompt(
        `Delete which index(es)? (comma-separated)\n\n${listing}`,
    );
    const indices = parseComaString(input);
    if (!indices) return;

    const parsed = indices.map((s) => parseInt(s, 10));
    if (parsed.some((n) => Number.isNaN(n) || n < 0 || n >= values.length)) {
        alert(`[${NODE_NAME}] Invalid index.`);
        return;
    }

    const toDelete = [...new Set(parsed)].sort((a, b) => b - a);
    const remaining = [...values];
    for (const idx of toDelete) remaining.splice(idx, 1);

    const finalValues = remaining.length ? remaining : [EMPTY_VALUE];
    const keepSelected = finalValues.includes(widget.value)
        ? widget.value
        : finalValues[0];

    setComboOptions(widget, finalValues, keepSelected);
    widget.callback?.(widget.value);
    if (node.graph) node.graph.setDirtyCanvas(true, true);
};

// --- Tag search overlay ---

const attachTagSearch = (node, searchTextWidget, fileWidget) => {
    replaceWithClickableField(node, searchTextWidget, {
        getLabel: (value) => value || "🔍 search by tags...",
        onClick: (event, n) => {
            showSearchOverlay(event, {
                items: outfitIndex.map((entry) => ({
                    label: entry.name || entry.file,
                    value: entry.file,
                    tags: entry.tags,
                })),
                placeholder: "tag1, tag2...",
                initialQuery: searchTextWidget.value || "",
                onFilter: (query, items) => {
                    const tags = parseComaString(query) ?? [];
                    if (!tags.length) return items;
                    return items.filter((item) =>
                        tags.every((t) =>
                            item.tags.some((et) =>
                                et.toLowerCase().includes(t.toLowerCase()),
                            ),
                        ),
                    );
                },
                onSelect: (file) => {
                    fileWidget.value = file;
                    fileWidget.callback?.(file);
                    searchTextWidget.value = "";
                    if (n.graph) n.graph.setDirtyCanvas(true, true);
                },
            });
        },
    });
};

// --- Attach ---

const attachOutfitLoader = (node) => {
    const outfitFileWidget = findWidget(node, "outfit_file");
    if (!outfitFileWidget) return;

    const { loadFileIntoWidgets } = createLoaderCrud(node, outfitFileWidget, {
        baseEndpoint: BASE_ENDPOINT,
        nodeLabel: NODE_NAME,
        buildJson: buildJsonFromWidgets,
        pushJson: pushJsonToWidgets,
        template: OUTFIT_TEMPLATE,
        newPlaceholder: "New outfit file name (e.g. outfits/casual_01):",
        clonePlaceholder: "Clone to new file (e.g. outfits/casual_02):",
        onChange: refreshSearchIndex,
    });

    const tagsSearchWidget = findWidget(node, "tags_search");
    if (tagsSearchWidget)
        attachTagSearch(node, tagsSearchWidget, outfitFileWidget);

    for (const part of OUTFIT_PARTS) {
        const widget = findWidget(node, part);
        if (!widget) continue;
        const idx = node.widgets.indexOf(widget);
        node.widgets.splice(
            idx + 1,
            0,
            new ButtonRowWidget(`${part}_actions`, [
                { label: "➕", onClick: () => handleAddVariant(node, part) },
                { label: "✏️", onClick: () => handleEditVariant(node, part) },
                { label: "🗑️", onClick: () => handleDeleteVariant(node, part) },
            ]),
        );
    }

    // Reload on file change
    hookWidget(outfitFileWidget, (value) => loadFileIntoWidgets(value, node));

    const outlines = [
        { name: "narrow_waist" },
        { name: "muffin_top" },
        { name: "hip_dips" },
    ];
    const groups = [
        { from: "hat", to: "neckwear" },
        { from: "coat", to: "armwear" },
        { from: "bottom", to: "footwear" },
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
    loadFileIntoWidgets(outfitFileWidget.value, node);
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidgets(node, attachOutfitLoader));
