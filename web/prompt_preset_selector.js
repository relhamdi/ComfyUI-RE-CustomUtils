import { COLORS } from "./constants.js";
import {
    createEditor,
    escapeHtml,
    findWidget,
    hideWidget,
    hookWidget,
    parseComaString,
    registerNode,
    waitForWidget,
} from "./utils.js";

// --- Constants ---

export const NODE_NAME = "PromptPresetSelector";

// --- Helpers ---

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse the syntax param to { openTag, separator, closeTag }
const parseSyntax = (syntax) => {
    const parts = (syntax || "{% | %}").split(/\s+/);
    if (parts.length !== 3)
        return { openTag: "{%", separator: "|", closeTag: "%}" };
    return { openTag: parts[0], separator: parts[1], closeTag: parts[2] };
};

// Build preset names, using placeholders if less names than presets are found
const buildNames = (names, presetCount) => {
    const result = [...names];
    while (result.length < presetCount) {
        result.push(`preset_${result.length}`);
    }
    return result.slice(0, presetCount);
};

// Build pattern from syntax
const buildPattern = (syntax) => {
    const { openTag, closeTag } = parseSyntax(syntax);
    return new RegExp(
        escapeRegex(openTag) + "\\s*(.*?)\\s*" + escapeRegex(closeTag),
        "gs",
    );
};

// Get number of presets found
const getPresetCount = (text, syntax) => {
    const { separator } = parseSyntax(syntax);
    const matches = [...text.matchAll(buildPattern(syntax))];
    if (!matches.length) return 0;
    return Math.max(...matches.map((m) => m[1].split(separator).length));
};

// --- Highlight ---

const buildHighlightedHtml = (raw, syntax, presetIndex) => {
    const { openTag, separator, closeTag } = parseSyntax(syntax);
    const pattern = buildPattern(syntax);
    let result = "";
    let lastIndex = 0;

    for (const match of raw.matchAll(pattern)) {
        // Text before the match, escaped
        result += escapeHtml(raw.slice(lastIndex, match.index));

        const parts = match[1].split(separator);

        const coloredParts = parts.map((part, i) => {
            const color = i === presetIndex ? COLORS.text : COLORS.inactive;
            const content =
                i === presetIndex
                    ? escapeHtml(part).replace(
                          /\$(\d+)/g,
                          `<span style="color:${COLORS.blue}">$$$1</span>`,
                      )
                    : escapeHtml(part);
            return `<span style="color:${color}">${content}</span>`;
        });

        const sepHtml = `<span style="color:${COLORS.orange}">${escapeHtml(separator)}</span>`;

        result +=
            `<span style="color:${COLORS.orange}">${escapeHtml(openTag)}</span> ` +
            coloredParts.join(sepHtml) +
            ` <span style="color:${COLORS.orange}">${escapeHtml(closeTag)}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
};

// --- Editor ---

const attachEditor = (node) => {
    const textWidget = findWidget(node, "text");
    const syntaxWidget = findWidget(node, "syntax");
    const presetWidget = findWidget(node, "preset_index");
    const comboWidget = findWidget(node, "preset_name");
    const namesWidget = findWidget(node, "preset_names");

    // Saving widget type
    const originalPresetType = presetWidget.type;

    if (!textWidget) return;

    // Hide preset_name
    hideWidget(comboWidget);

    const textarea = textWidget.inputEl || textWidget.element;
    if (!textarea?.parentNode) return;

    // Create contentEditable div
    const editor = createEditor(textarea, {
        onInput: () => {
            refreshCombo();
            renderColored();
        },
    });

    // State helpers
    const getPresetIndex = () => presetWidget?.value ?? 0;
    const getSyntax = () => syntaxWidget?.value ?? "{% | %}";

    // Render modes
    const renderColored = () => {
        const raw = textarea.value;
        editor.innerHTML = buildHighlightedHtml(
            raw,
            getSyntax(),
            getPresetIndex(),
        );
    };

    // --- Preset names / combo ---

    const destroyCombo = () => {
        // Hide preset_name
        hideWidget(comboWidget);

        presetWidget.type = originalPresetType;
        presetWidget.computeSize = null;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const buildCombo = (names) => {
        // Hide preset_index
        hideWidget(presetWidget);

        const savedIndex = presetWidget.value ?? 0;
        const safeIndex = savedIndex < names.length ? savedIndex : 0;

        comboWidget.options.values = names;
        comboWidget.value = names[safeIndex];
        comboWidget.type = "combo";
        comboWidget.computeSize = null;

        comboWidget.callback = (value) => {
            presetWidget.value = names.indexOf(value);
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            if (document.activeElement !== editor) renderColored();
        };

        presetWidget.value = safeIndex;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
    };

    const refreshCombo = () => {
        const names = parseComaString(namesWidget?.value);
        if (!names) {
            destroyCombo();
            return;
        }

        const presetCount = getPresetCount(textarea.value, getSyntax());
        if (presetCount === 0) {
            destroyCombo();
            return;
        }

        buildCombo(buildNames(names, presetCount));
    };

    // --- React to widget changes ---

    hookWidget(presetWidget, (value) => {
        const presetCount = getPresetCount(textarea.value, getSyntax());
        if (presetCount === 0) return;

        // Loop both ways on preset_index
        let newValue = value % presetCount;
        if (newValue < 0) newValue += presetCount;

        if (newValue !== value) {
            presetWidget.value = newValue;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        }

        if (document.activeElement !== editor) renderColored();
    });

    hookWidget(syntaxWidget, () => {
        refreshCombo();
        if (document.activeElement !== editor) renderColored();
    });

    hookWidget(namesWidget, () => {
        refreshCombo();
        if (document.activeElement !== editor) renderColored();
    });

    // Initial render
    refreshCombo();
    renderColored();
};

// --- Registration ---

registerNode(NODE_NAME, (node) => waitForWidget(node, "text", attachEditor));
