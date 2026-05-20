// Hook into ComfyUI widget callback (reliable change detection)
export const hookWidget = (widget, onChange) => {
    if (!widget) return;
    const original = widget.callback;
    widget.callback = function (value) {
        if (original) original.call(this, value);
        onChange(value);
    };
};

// Escape HTML to prevent injections
export const escapeHtml = (str) =>
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

// Loop over text nodes in the DOM
export const walkTextNodes = (root, callback) => {
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (callback(node) === false) return false;
        } else {
            for (const child of node.childNodes) {
                if (walk(child) === false) return false;
            }
        }
    };
    walk(root);
};

// Save current caret position in div
export const saveCaretPosition = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

// Restore caret position in div
export const restoreCaretPosition = (el, offset) => {
    const range = document.createRange();
    const sel = window.getSelection();
    let charCount = 0;
    let found = false;

    walkTextNodes(el, (node) => {
        const next = charCount + node.length;
        if (next >= offset) {
            range.setStart(node, offset - charCount);
            range.collapse(true);
            found = true;
            return false;
        }
        charCount = next;
    });

    if (!found) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
};

export const createEditor = (textarea, activeColor = "#e0e0e0", onInput) => {
    // Hide native textarea
    textarea.style.display = "none";

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
        color: ${activeColor};
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

    // --- Event listener - Input: Sync editor -> textarea ---
    editor.addEventListener("input", () => {
        const pos = saveCaretPosition(editor);
        textarea.value = editor.innerText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        if (onInput) onInput();
        restoreCaretPosition(editor, pos);
    });

    // --- Event listener - Paste: Sanitize text pasting to prevent errors with HTML coloration ---
    editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    });

    return editor;
};
