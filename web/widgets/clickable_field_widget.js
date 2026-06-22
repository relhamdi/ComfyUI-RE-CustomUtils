import { COLORS } from "../constants.js";
import { fitString } from "../utils.js";

const ROW_HEIGHT = 20;
const ROW_MARGIN = 10;

export const replaceWithClickableField = (
    node,
    textWidget,
    { getLabel, onClick },
) => {
    const widget = {
        name: textWidget.name,
        type: "custom",
        get value() {
            return textWidget.value;
        },
        set value(v) {
            textWidget.value = v;
        },
        last_y: 0,
        _hit: [0, 0],
        computeSize: () => [0, ROW_HEIGHT],
        serializeValue: textWidget.serializeValue,
        draw(ctx, n, width, posY, height) {
            this.last_y = posY;
            const h = height ?? ROW_HEIGHT;
            const midY = posY + h * 0.5;
            const margin = ROW_MARGIN;
            const w = width - margin * 2;

            ctx.save();
            ctx.fillStyle = "#222233";
            ctx.beginPath();
            ctx.roundRect(margin, posY + 2, w, h - 4, 4);
            ctx.fill();

            const value = textWidget.value || "";
            const label = getLabel ? getLabel(value) : value || "...";
            ctx.fillStyle = value ? COLORS.text : COLORS.inactive;
            ctx.font = "11px monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(fitString(ctx, label, w - 12), margin + 6, midY);
            ctx.restore();
            this._hit = [margin, w];
        },
        mouse(event, pos, n) {
            const type = event.type;
            if (type !== "pointerdown" && type !== "mousedown") return false;
            if (pos[0] < this._hit[0] || pos[0] > this._hit[0] + this._hit[1])
                return false;
            onClick(event, n);
            return true;
        },
    };

    const idx = node.widgets.indexOf(textWidget);
    if (idx !== -1) node.widgets[idx] = widget;

    return widget;
};
