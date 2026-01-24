import { app } from "/scripts/app.js";

// Escape HTML to prevent injections
const escapeHtml = (str) =>
    str.replace(/[&<>"]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c]));

// Main function to attach the custom editor to the node
function attachEditor(node) {
    // Only apply to PromptPresetSelector custom node
    if (node.type !== "PromptPresetSelector") return;

    // Find the main text widget
    const widget = node.widgets?.find(w => w.name === "text");
    if (!widget) return;

    const textarea = widget.inputEl || widget.element;
    if (!textarea || !textarea.parentNode) return;

    // Prevent double initialization
    if (textarea._colorEditorAttached) return;
    textarea._colorEditorAttached = true;

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

    // Single color for tags and separators
    const tagColor = "#ff9800";

    // Function to recolor the content
    const recolor = () => {
        const raw = editor.innerText;
        // Skip if no tags found
        if (!raw.includes("{%")) return;

        const safe = escapeHtml(raw);

        editor.innerHTML = safe.replace(
            /\{%(.*?)%\}/gs,
            `<span style="color:${tagColor}">{%</span>$1<span style="color:${tagColor}">%}</span>`
        );
    };

    // Update the hidden textarea as the user types
    editor.addEventListener("input", () => {
        const raw = editor.innerText;
        textarea.value = raw;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Recolor only when textarea is not focused
    editor.addEventListener("blur", recolor);

    // Show plain text on focus for easy editing
    editor.addEventListener("focus", () => {
        editor.innerText = textarea.value;
    });
}

// Register the extension
app.registerExtension({
    name: "PromptColorEditor",
    beforeRegisterNodeDef(nodeType) {
        nodeType.prototype.onNodeCreated = function () {
            const node = this;

            const tryAttach = () => {
                attachEditor(node);
                // Retry until the DOM of the widget is available
                if (!node.widgets?.find(w => w.name === "text")?.inputEl?.parentNode) {
                    requestAnimationFrame(tryAttach);
                }
            };

            requestAnimationFrame(tryAttach);
        };
    }
});
