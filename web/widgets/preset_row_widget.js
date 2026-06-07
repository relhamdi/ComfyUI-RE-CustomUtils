import { COLORS, EMPTY_VALUE } from "../constants.js";

// --- Constants ---

const ROW_HEIGHT = 20;
const ROW_MARGIN = 10;
const INNER_MARGIN = 4;
const BTN_WIDTH = 36;

const EMPTY_PRESET = "";

// --- PresetRowWidget ---

export class PresetRowWidget {
    constructor(name, onNew, onSave, onDelete, onSelect) {
        this.name = name;
        this.type = "custom";
        this.value = EMPTY_PRESET;
        this.presets = [];
        this.last_y = 0;

        this.onNew = onNew;
        this.onSave = onSave;
        this.onDelete = onDelete;
        this.onSelect = onSelect;

        // Hit areas [x, width]
        this._hitDropdown = [0, 0];
        this._hitNew = [0, 0];
        this._hitSave = [0, 0];
        this._hitDelete = [0, 0];
    }

    computeSize() {
        return [0, ROW_HEIGHT];
    }

    // --- Public API ---

    setPresets(presets) {
        this.presets = presets;
        if (!presets.length) {
            this.value = EMPTY_PRESET;
        } else if (!presets.includes(this.value)) {
            this.value = presets[0];
        }
    }

    isEmpty() {
        return !this.presets.length;
    }

    flashSave(node, label = "✅", duration = 1500) {
        if (this._flashTimer) clearTimeout(this._flashTimer);
        this._saveFlash = label;
        if (node.graph) node.graph.setDirtyCanvas(true, true);
        this._flashTimer = setTimeout(() => {
            this._saveFlash = null;
            this._flashTimer = null;
            if (node.graph) node.graph.setDirtyCanvas(true, true);
        }, duration);
    }

    // --- Draw ---

    draw(ctx, node, width, posY, height) {
        this.last_y = posY;
        const h = height ?? ROW_HEIGHT;
        const midY = posY + h * 0.5;
        const margin = ROW_MARGIN;

        ctx.save();
        ctx.font = "11px monospace";
        ctx.textBaseline = "middle";

        const totalWidth = width - margin * 2;
        const btnsWidth = BTN_WIDTH * 3 + INNER_MARGIN * 2;
        const dropdownWidth = totalWidth - btnsWidth - INNER_MARGIN;

        const dropdownX = margin;
        const newX = margin + dropdownWidth + INNER_MARGIN;
        const saveX = newX + BTN_WIDTH + INNER_MARGIN;
        const deleteX = saveX + BTN_WIDTH + INNER_MARGIN;

        // Dropdown
        ctx.fillStyle = "#222233";
        ctx.beginPath();
        ctx.roundRect(dropdownX, posY + 4, dropdownWidth, h - 8, 4);
        ctx.fill();
        ctx.fillStyle = this.isEmpty() ? COLORS.inactive : COLORS.text;
        ctx.textAlign = "left";
        ctx.fillText(
            this.isEmpty()
                ? EMPTY_VALUE
                : fitString(ctx, this.value, dropdownWidth - 16),
            dropdownX + 8,
            midY,
        );
        // Dropdown arrow
        ctx.fillStyle = COLORS.inactive;
        ctx.textAlign = "center";
        ctx.fillText("▾", dropdownX + dropdownWidth - 10, midY);
        this._hitDropdown = [dropdownX, dropdownWidth];

        // New button
        ctx.fillStyle = "#223322";
        ctx.beginPath();
        ctx.roundRect(newX, posY + 4, BTN_WIDTH, h - 8, 4);
        ctx.fill();
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = "center";
        ctx.fillText("➕", newX + BTN_WIDTH / 2, midY);
        this._hitNew = [newX, BTN_WIDTH];

        // Save button (disabled if empty)
        ctx.fillStyle = this.isEmpty() ? "#1a1a1a" : "#222233";
        ctx.beginPath();
        ctx.roundRect(saveX, posY + 4, BTN_WIDTH, h - 8, 4);
        ctx.fill();
        ctx.fillStyle = this.isEmpty() ? COLORS.inactive : COLORS.text;
        ctx.fillText(this._saveFlash ?? "💾", saveX + BTN_WIDTH / 2, midY);
        this._hitSave = [saveX, BTN_WIDTH];

        // Delete button (disabled if empty)
        ctx.fillStyle = this.isEmpty() ? "#1a1a1a" : "#4a1a1a";
        ctx.beginPath();
        ctx.roundRect(deleteX, posY + 4, BTN_WIDTH, h - 8, 4);
        ctx.fill();
        ctx.fillStyle = this.isEmpty() ? COLORS.inactive : "#ff6666";
        ctx.fillText("🗑️", deleteX + BTN_WIDTH / 2, midY);
        this._hitDelete = [deleteX, BTN_WIDTH];

        ctx.restore();
    }

    // --- Mouse ---

    mouse(event, pos, node) {
        const x = pos[0];
        const type = event.type;
        if (type !== "pointerdown" && type !== "mousedown") return false;

        if (this._inHit(x, this._hitNew)) {
            this.onNew?.();
            return true;
        }

        if (this._inHit(x, this._hitSave)) {
            if (!this.isEmpty()) this.onSave?.();
            return true;
        }

        if (this._inHit(x, this._hitDelete)) {
            if (!this.isEmpty()) this.onDelete?.();
            return true;
        }

        if (this._inHit(x, this._hitDropdown)) {
            this._showDropdown(event, node);
            return true;
        }

        return false;
    }

    // --- Utils ---

    _inHit(x, hit) {
        return x >= hit[0] && x <= hit[0] + hit[1];
    }

    // --- Dropdown ---

    _showDropdown(event, node) {
        if (!this.presets.length) return;

        const items = this.presets.map((name) => ({
            content: name,
            callback: () => {
                this.value = name;
                this.onSelect?.(name);
                node.setDirtyCanvas(true, true);
            },
        }));

        new LiteGraph.ContextMenu(items, {
            event,
            title: "Select Preset",
        });
    }
}

// --- Helpers ---

const fitString = (ctx, str, maxWidth) => {
    if (ctx.measureText(str).width <= maxWidth) return str;
    while (str.length > 1 && ctx.measureText(str + "…").width > maxWidth) {
        str = str.slice(0, -1);
    }
    return str + "…";
};
