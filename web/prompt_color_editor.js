import { app } from "/scripts/app.js";

// Escape HTML to prevent injections
const escapeHtml = (str) =>
    str.replace(/[&<>"]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c]));

// Hook into ComfyUI widget callback (reliable change detection)
const hookWidget = (widget, onChange) => {
    if (!widget) return;

    const originalCallback = widget.callback;
    widget.callback = function (value) {
        if (originalCallback) {
            originalCallback.call(this, value);
        }
        onChange(value);
    };
};

// Main function to attach the custom editor to the node
function attachEditor(node) {
    // Only apply to PromptPresetSelector custom node
    if (node.type !== "PromptPresetSelector") return;

    const textWidget = node.widgets?.find(w => w.name === "text");
    const separatorWidget = node.widgets?.find(w => w.name === "separator");
    const presetWidget = node.widgets?.find(w => w.name === "preset_index");
    if (!textWidget) return;

    const textarea = textWidget.inputEl || textWidget.element;
    if (!textarea || !textarea.parentNode) return;

    // Prevent double initialization
    if (textarea._presetEditorAttached) return;
    textarea._presetEditorAttached = true;

    // Hide the original textarea
    textarea.style.display = "none";

    // Create a contentEditable div for rich coloring
    const editor = document.createElement("div");
    editor.contentEditable = true;
    editor.style.cssText = `
        height: 100%;
        padding: 6px;
        border: 1px solid #444;
        background: #111;
        color: #eee;
        font-family: monospace;
        font-size: 10px;
        white-space: pre-wrap;
        overflow-y: auto;
        outline: none;
        box-sizing: border-box;
    `;
    textarea.parentNode.appendChild(editor);
    editor.innerText = textarea.value;

    // Used colors
    const tagColor = "#ff9800";
    const inactiveColor = "#777";

    let lastRawText = textarea.value;

    // Text recolor function
    const recolor = (force = false) => {
        const raw = editor.innerText;
        // Skip if no tags found
        if (!raw.includes("{%")) return;

        // Prevent caret jump while typing
        if (!force && document.activeElement === editor) return;
        if (!force && raw !== lastRawText) return;

        const separator = separatorWidget?.value || "|";
        const presetIndex = Math.max(1, presetWidget?.value || 1) - 1;

        const safe = escapeHtml(raw);

        editor.innerHTML = safe.replace(/\{%(.*?)%\}/gs, (_, content) => {
            const rawParts = content.split(separator);

            const coloredParts = rawParts.map((part, i) => {
                const color = i === presetIndex ? "inherit" : inactiveColor;
                return `<span style="color:${color}">${escapeHtml(part)}</span>`;
            });

            const sepHtml = `<span style="color:${tagColor}">${escapeHtml(separator)}</span>`;

            return `<span style="color:${tagColor}">{%</span>`
                + coloredParts.join(sepHtml)
                + `<span style="color:${tagColor}">%}</span>`
                ;
        });
    };

    // Sync editor with textarea
    editor.addEventListener("input", () => {
        const raw = editor.innerText;
        textarea.value = raw;
        lastRawText = raw;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Raw text while editing
    editor.addEventListener("focus", () => {
        editor.innerText = textarea.value;
    });

    // Colored mode when leaving editor
    editor.addEventListener("blur", () => recolor(true));

    // React instantly to widget changes
    hookWidget(separatorWidget, () => recolor(true));
    hookWidget(presetWidget, () => recolor(true));

    // Initial render
    recolor(true);
}


// Register the extension
app.registerExtension({
    name: "PromptColorEditor",
    beforeRegisterNodeDef(nodeType) {
        nodeType.prototype.onNodeCreated = function () {
            const node = this;

            const tryAttach = () => {
                attachEditor(node);

                // Retry until widgets DOM is ready
                if (!node.widgets?.find(w => w.name === "text")?.inputEl?.parentNode) {
                    requestAnimationFrame(tryAttach);
                }
            };

            requestAnimationFrame(tryAttach);
        };
    }
});
