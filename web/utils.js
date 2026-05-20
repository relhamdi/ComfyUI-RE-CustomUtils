// Hook into ComfyUI widget callback (reliable change detection)
const hookWidget = (widget, onChange) => {
    if (!widget) return;
    const original = widget.callback;
    widget.callback = function (value) {
        if (original) original.call(this, value);
        onChange(value);
    };
};

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

// Loop over text nodes in the DOM
const walkTextNodes = (root, callback) => {
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
const saveCaretPosition = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

// Restore caret position in div
const restoreCaretPosition = (el, offset) => {
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
