import { COLORS } from "../constants.js";

const ROW_HEIGHT = 36;
const ROW_MARGIN = 10;
const INNER_MARGIN = 4;

export class ButtonRowWidget {
    constructor(name, buttons) {
        // buttons: [{ label, onClick, color? }]
        this.name = name;
        this.type = "custom";
        this.value = null;
        this.buttons = buttons;
        this.last_y = 0;
        this._hitAreas = [];
    }

    computeSize() {
        return [0, ROW_HEIGHT - 4];
    }

    draw(ctx, node, width, posY, height) {
        this.last_y = posY;
        const h = height ?? ROW_HEIGHT;
        const midY = posY + h * 0.5;
        const margin = ROW_MARGIN;
        const n = this.buttons.length;
        const totalWidth = width - margin * 2;
        const btnWidth = (totalWidth - INNER_MARGIN * (n - 1)) / n;

        this._hitAreas = [];

        ctx.save();
        ctx.font = "11px monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        for (let i = 0; i < n; i++) {
            const btn = this.buttons[i];
            const btnX = margin + i * (btnWidth + INNER_MARGIN);

            ctx.fillStyle = btn.color ?? "#2a2a3a";
            ctx.beginPath();
            ctx.roundRect(btnX, posY + 4, btnWidth, h - 8, 4);
            ctx.fill();

            ctx.fillStyle = COLORS.text;
            ctx.fillText(btn.label, btnX + btnWidth / 2, midY);

            this._hitAreas.push([btnX, btnWidth]);
        }

        ctx.restore();
    }

    mouse(event, pos, node) {
        const x = pos[0];
        const type = event.type;

        if (type !== "pointerdown" && type !== "mousedown") return false;

        for (let i = 0; i < this._hitAreas.length; i++) {
            const [bx, bw] = this._hitAreas[i];
            if (x >= bx && x <= bx + bw) {
                this.buttons[i].onClick?.();
                return true;
            }
        }

        return false;
    }
}
