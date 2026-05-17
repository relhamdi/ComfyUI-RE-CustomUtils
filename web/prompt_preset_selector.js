import { app } from "/scripts/app.js";

// --- Helpers ---

// Escape HTML to prevent injections
const escapeHtml = (str) =>
    str.replace(
        /[&<>"]/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
            })[c],
    );

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Hook into ComfyUI widget callback (reliable change detection)
const hookWidget = (widget, onChange) => {
    if (!widget) return;
    const original = widget.callback;
    widget.callback = function (value) {
        if (original) original.call(this, value);
        onChange(value);
    };
};

// Parse the syntax param to { openTag, separator, closeTag }
const parseSyntax = (syntax) => {
    const parts = (syntax || "{% | %}").split(/\s+/);
    if (parts.length !== 3)
        return { openTag: "{%", separator: "|", closeTag: "%}" };
    return { openTag: parts[0], separator: parts[1], closeTag: parts[2] };
};

// --- Colors ---

const COLORS = {
    tag: "#ff9800",
    sep: "#ff9800",
    active: "#e0e0e0",
    inactive: "#555",
};

// --- Editor ---

function buildHighlightedHtml(raw, syntax, presetIndex) {
    const { openTag, separator, closeTag } = parseSyntax(syntax);
    const pattern = new RegExp(
        escapeRegex(openTag) + "\\s*(.*?)\\s*" + escapeRegex(closeTag),
        "gs",
    );

    let result = "";
    let lastIndex = 0;

    for (const match of raw.matchAll(pattern)) {
        // Text before the match, escaped
        result += escapeHtml(raw.slice(lastIndex, match.index));

        const parts = match[1].split(separator);

        const coloredParts = parts.map((part, i) => {
            const color = i === presetIndex ? COLORS.active : COLORS.inactive;
            return `<span style="color:${color}">${escapeHtml(part)}</span>`;
        });

        const sepHtml = `<span style="color:${COLORS.sep}">${escapeHtml(separator)}</span>`;

        result +=
            `<span style="color:${COLORS.tag}">${escapeHtml(openTag)}</span> ` +
            coloredParts.join(sepHtml) +
            ` <span style="color:${COLORS.tag}">${escapeHtml(closeTag)}</span>`;

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    result += escapeHtml(raw.slice(lastIndex));

    return result;
}

// Main function to attach the custom editor to the node
function attachEditor(node) {
    // Only apply to PromptPresetSelector custom node
    if (node.type !== "PromptPresetSelector") return;

    const textWidget = node.widgets?.find((w) => w.name === "text");
    const syntaxWidget = node.widgets?.find((w) => w.name === "syntax");
    const presetWidget = node.widgets?.find((w) => w.name === "preset_index");

    if (!textWidget) return;

    const textarea = textWidget.inputEl || textWidget.element;
    if (!textarea?.parentNode) return;

    // Prevent double initialization
    if (textarea._editorAttached) return;
    textarea._editorAttached = true;

    // Hide native textarea
    textarea.style.display = "none";

    // Create contentEditable div
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.spellcheck = false;
    editor.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 6px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #111;
        color: ${COLORS.active};
        font-family: monospace;
        font-size: 10px;
        white-space: pre-wrap;
        overflow-y: auto;
        outline: none;
        box-sizing: border-box;
        cursor: text;
        line-height: 1.5;
    `;

    textarea.parentNode.appendChild(editor);

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

    const renderRaw = () => {
        editor.innerText = textarea.value;
    };

    // --- Event listener - Input: Sync editor -> textarea ---
    editor.addEventListener("input", () => {
        textarea.value = editor.innerText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // --- Event listener - Focus: Switch to raw text for editing ---
    editor.addEventListener("focus", () => {
        renderRaw();
        // Place caret at end
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    // --- Event listener - Blur: Switch to colored view ---
    editor.addEventListener("blur", () => renderColored());

    //  React to widget changes
    hookWidget(syntaxWidget, () => {
        if (document.activeElement !== editor) renderColored();
    });
    hookWidget(presetWidget, (value) => {
        const { openTag, separator, closeTag } = parseSyntax(getSyntax());
        const pattern = new RegExp(
            escapeRegex(openTag) + "\\s*(.*?)\\s*" + escapeRegex(closeTag),
            "gs",
        );
        const matches = [...textarea.value.matchAll(pattern)];
        if (matches.length === 0) return;

        const presetCount = Math.max(
            ...matches.map((m) => m[1].split(separator).length),
        );
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

    // Initial render
    renderColored();
}

// --- Registration ---

app.registerExtension({
    name: "PromptPresetSelector",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PromptPresetSelector") return;

        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (original) original.call(this);

            const node = this;
            // Retry until widgets DOM is ready
            const tryAttach = () => {
                const textWidget = node.widgets?.find((w) => w.name === "text");
                if (textWidget?.inputEl?.parentNode) {
                    attachEditor(node);
                } else {
                    requestAnimationFrame(tryAttach);
                }
            };
            requestAnimationFrame(tryAttach);
        };
    },
});
