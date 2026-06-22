export const showSearchOverlay = (
    event,
    {
        items,
        placeholder = "",
        initialQuery = "",
        initialValue,
        maxVisible = 10,
        onFilter,
        onSelect,
        onClose,
    } = {},
) => {
    // Destroy any previous menu
    document.querySelector("._search_overlay")?.remove();

    const wrapper = document.createElement("div");
    wrapper.classList.add("_search_overlay");
    wrapper.style.cssText = `
        position: fixed;
        z-index: 9999;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = initialQuery;
    input.style.cssText = `
        background: #111;
        color: #e0e0e0;
        border: none;
        border-bottom: 1px solid #444;
        padding: 4px 8px;
        font-family: monospace;
        font-size: 11px;
        outline: none;
    `;

    const select = document.createElement("select");
    select.size = maxVisible;
    select.style.cssText = `
        background: #1a1a1a;
        color: #e0e0e0;
        border: none;
        font-family: monospace;
        font-size: 11px;
        min-width: 250px;
        max-height: 250px;
        outline: none;
        cursor: pointer;
    `;

    const populate = (query) => {
        const filtered = onFilter ? onFilter(query, items) : items;
        select.innerHTML = "";
        for (const item of filtered) {
            const opt = document.createElement("option");
            opt.value = item.value;
            opt.textContent = item.label;
            select.appendChild(opt);
        }
        // Adapt length to item count
        select.size = Math.max(1, Math.min(filtered.length, maxVisible));
        const matchIdx = filtered.findIndex((i) => i.value === initialValue);
        // If empty, display at least one line
        select.selectedIndex = matchIdx !== -1 ? matchIdx : 0;
    };

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        wrapper.remove();
        document.removeEventListener("pointerdown", onOutside, true);
        onClose?.();
    };

    const commit = (value) => {
        close();
        onSelect?.(value);
    };

    const onOutside = (e) => {
        if (!wrapper.contains(e.target)) close();
    };

    populate(input.value);
    // --- Event listener - Input (Enter): Fill with search ---
    input.addEventListener("input", () => populate(input.value));
    // --- Event listener - Keydown (Change): Select value ---
    select.addEventListener("change", () => commit(select.value));

    input.addEventListener("keydown", (e) => {
        // --- Event listener - Keydown (Arrow Up/Down): Keyboard navigation ---
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            const cur = select.selectedIndex;
            select.selectedIndex =
                e.key === "ArrowDown"
                    ? Math.min(cur + 1, select.options.length - 1)
                    : Math.max(cur - 1, 0);
            return;
        }
        // --- Event listener - Keydown (Enter): Validate search ---
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            if (select.options.length > 0) {
                commit(
                    select.selectedOptions[0]?.value ?? select.options[0].value,
                );
            }
            return;
        }
        // --- Event listener - Keydown (Escape): Cleanup ---
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);

    setTimeout(() => {
        document.addEventListener("pointerdown", onOutside, true);
        input.focus();
    }, 0);

    return { close };
};
