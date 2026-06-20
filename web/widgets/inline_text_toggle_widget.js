import { COLORS } from "../constants.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const ROW_HEIGHT = 20;
const ROW_MARGIN = 10;
const ICON_WIDTH = 28;
const INNER_MARGIN = 4;

// --- InlineTextToggleWidget ---

export class InlineTextToggleWidget {
    constructor(name, textWidget, modeWidget) {
        this.name = name;
        this.type = "custom";
        this.textWidget = textWidget;
        this.modeWidget = modeWidget;
        this.last_y = 0;

        this._hitText = [0, 0];
        this._hitIcon = [0, 0];
    }

    computeSize() {
        return [0, ROW_HEIGHT];
    }

    // --- Draw ---

    draw(ctx, node, width, posY, height) {
        this.last_y = posY;
        const h = height ?? ROW_HEIGHT;
        const midY = posY + h * 0.5;
        const margin = ROW_MARGIN;

        const textWidth = width - margin * 2 - ICON_WIDTH - INNER_MARGIN;
        const textX = margin;
        const iconX = textX + textWidth + INNER_MARGIN;

        const isDisabled = this.disabled;

        ctx.save();
        if (isDisabled) ctx.globalAlpha = 0.4;

        ctx.font = "11px monospace";
        ctx.textBaseline = "middle";

        // Text field background
        ctx.fillStyle = "#222233";
        ctx.beginPath();
        ctx.roundRect(textX, posY + 2, textWidth, h - 4, 4);
        ctx.fill();

        const value = this.textWidget.value ?? "";
        ctx.fillStyle = value ? COLORS.text : COLORS.inactive;
        ctx.textAlign = "left";
        const label = value || this.textWidget.label || this.name;
        ctx.fillText(fitString(ctx, label, textWidth - 12), textX + 6, midY);
        this._hitText = [textX, textWidth];

        // Toggle icon
        const isReplace = this.modeWidget.value;
        ctx.fillStyle = isReplace ? COLORS.toggle_off : COLORS.toggle_on;
        ctx.beginPath();
        ctx.roundRect(iconX, posY + 2, ICON_WIDTH, h - 4, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isReplace ? "🔄" : "➕", iconX + ICON_WIDTH / 2, midY);
        this._hitIcon = [iconX, ICON_WIDTH];

        ctx.restore();
    }

    // --- Mouse ---

    mouse(event, pos, node) {
        if (this.disabled) return false;

        const type = event.type;
        if (type !== "pointerdown" && type !== "mousedown") return false;

        const x = pos[0];

        // Toggle icon click
        if (this._inHit(x, this._hitIcon)) {
            this.modeWidget.value = !this.modeWidget.value;
            this.modeWidget.callback?.(this.modeWidget.value);
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            return true;
        }

        // Text field click -> prompt
        if (this._inHit(x, this._hitText)) {
            app.canvas.prompt(
                this.textWidget.label || this.name,
                this.textWidget.value ?? "",
                (v) => {
                    this.textWidget.value = v;
                    this.textWidget.callback?.(v);
                    if (node.graph) node.graph.setDirtyCanvas(true, true);
                },
                event,
            );
            return true;
        }
        return false;
    }

    // --- Utils ---

    _inHit(x, hit) {
        return x >= hit[0] && x <= hit[0] + hit[1];
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
