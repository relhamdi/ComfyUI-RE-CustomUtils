import { COLORS } from "../constants.js";
import { fitString } from "../utils.js";
import { showSearchOverlay } from "./search_overlay.js";
import { app } from "/scripts/app.js";

// --- Constants ---

const ROW_HEIGHT = 20;
const ROW_MARGIN = 10;
const WEIGHT_WIDTH = 90;
const REMOVE_WIDTH = 24;
const INNER_MARGIN = 4;
const ARROW_WIDTH = 18;

// --- LoraRowWidget ---

export class LoraRowWidget {
    constructor(name, loras, defaultWeight, onChange) {
        this.name = name;
        this.type = "custom";
        this.value = { lora: loras[0] ?? "", weight: defaultWeight };
        this.loras = loras;
        this.onChange = onChange;
        this.last_y = 0;

        // Hit areas: [x, width]
        this._hitLora = [0, 0];
        this._hitWeightDec = [0, 0];
        this._hitWeightVal = [0, 0];
        this._hitWeightInc = [0, 0];
        this._hitRemove = [0, 0];

        // Drag state
        this._dragging = false;
        this._dragStartX = 0;
        this._dragStartWeight = 0;
        this._hasDragged = false;
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

        ctx.save();

        // Background
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.roundRect(margin, posY + 2, width - margin * 2, h - 4, 4);
        ctx.fill();

        // Remove button zone
        const removeX = width - margin - REMOVE_WIDTH;
        ctx.fillStyle = "#442222";
        ctx.beginPath();
        ctx.roundRect(removeX, posY + 4, REMOVE_WIDTH - 2, h - 8, 3);
        ctx.fill();
        ctx.fillStyle = "#ff6666";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✕", removeX + (REMOVE_WIDTH - 2) / 2, midY);
        this._hitRemove = [removeX, REMOVE_WIDTH - 2];

        // Weight zone
        const weightX = removeX - INNER_MARGIN - WEIGHT_WIDTH;
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Weight - Left arrow
        ctx.fillStyle = "#2a2a3a";
        ctx.beginPath();
        ctx.roundRect(weightX, posY + 4, ARROW_WIDTH, h - 8, 3);
        ctx.fill();
        ctx.fillStyle = COLORS.text;
        ctx.fillText("◀", weightX + ARROW_WIDTH / 2, midY);
        this._hitWeightDec = [weightX, ARROW_WIDTH];

        // Weight - Central value
        ctx.fillStyle = "#222233";
        ctx.beginPath();
        ctx.roundRect(
            weightX + ARROW_WIDTH + 2,
            posY + 4,
            WEIGHT_WIDTH - ARROW_WIDTH * 2 - 4,
            h - 8,
            3,
        );
        ctx.fill();
        ctx.fillStyle = COLORS.text;
        ctx.fillText(
            this.value.weight.toFixed(2),
            weightX + WEIGHT_WIDTH / 2,
            midY,
        );
        this._hitWeightVal = [
            weightX + ARROW_WIDTH + 2,
            WEIGHT_WIDTH - ARROW_WIDTH * 2 - 4,
        ];

        // Weight - Right arrow
        ctx.fillStyle = "#2a2a3a";
        ctx.beginPath();
        ctx.roundRect(
            weightX + WEIGHT_WIDTH - ARROW_WIDTH,
            posY + 4,
            ARROW_WIDTH,
            h - 8,
            3,
        );
        ctx.fill();
        ctx.fillStyle = COLORS.text;
        ctx.fillText("▶", weightX + WEIGHT_WIDTH - ARROW_WIDTH / 2, midY);
        this._hitWeightInc = [
            weightX + WEIGHT_WIDTH - ARROW_WIDTH,
            ARROW_WIDTH,
        ];

        // LoRA name zone
        const loraX = margin + INNER_MARGIN;
        const loraWidth = weightX - loraX - INNER_MARGIN;
        ctx.fillStyle = COLORS.text;
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const label = this.value.lora || "None";
        ctx.fillText(fitString(ctx, label, loraWidth), loraX, midY);
        this._hitLora = [loraX, loraWidth];

        ctx.restore();
    }

    // --- Events ---

    mouse(event, pos, node) {
        const x = pos[0];
        const type = event.type;

        // Remove
        if (this._inHit(x, this._hitRemove)) {
            if (type === "pointerdown" || type === "mousedown") {
                this.onChange("remove");
                return true;
            }
        }

        // Weight drag - Left arrow
        if (this._inHit(x, this._hitWeightDec)) {
            if (type === "pointerdown" || type === "mousedown") {
                this.value.weight =
                    Math.round((this.value.weight - 0.05) * 100) / 100;
                this.onChange("weight");
                return true;
            }
        }

        // Weight drag - Right arrow
        if (this._inHit(x, this._hitWeightInc)) {
            if (type === "pointerdown" || type === "mousedown") {
                this.value.weight =
                    Math.round((this.value.weight + 0.05) * 100) / 100;
                this.onChange("weight");
                return true;
            }
        }

        // Weight drag - Central value: drag + prompt click
        if (this._inHit(x, this._hitWeightVal)) {
            if (type === "pointerdown" || type === "mousedown") {
                this._dragging = true;
                this._dragStartX = event.clientX ?? event.x ?? 0;
                this._dragStartWeight = this.value.weight;
                this._hasDragged = false;
                return true;
            }
            if (
                (type === "pointerup" || type === "mouseup") &&
                !this._hasDragged
            ) {
                app.canvas.prompt(
                    "Weight",
                    this.value.weight,
                    (v) => {
                        const parsed = parseFloat(v);
                        if (!isNaN(parsed)) {
                            this.value.weight = Math.round(parsed * 100) / 100;
                            this.onChange("weight");
                        }
                    },
                    event,
                );
                this._dragging = false;
                return true;
            }
        }

        if (type === "pointermove" || type === "mousemove") {
            if (this._dragging) {
                const clientX = event.clientX ?? event.x ?? 0;
                const delta = (clientX - this._dragStartX) * 0.01;
                if (Math.abs(delta) > 0.005) this._hasDragged = true;
                this.value.weight =
                    Math.round((this._dragStartWeight + delta) * 100) / 100;
                this.onChange("weight");
                return true;
            }
        }

        if (type === "pointerup" || type === "mouseup") {
            this._dragging = false;
        }

        // LoRA name click -> ContextMenu
        if (this._inHit(x, this._hitLora)) {
            if (type === "pointerdown" || type === "mousedown") {
                this._showLoraMenu(event, node);
                return true;
            }
        }

        return false;
    }

    // --- Utils ---

    _inHit(x, hit) {
        return x >= hit[0] && x <= hit[0] + hit[1];
    }

    // --- Menu ---

    _showLoraMenu(event, node) {
        showSearchOverlay(event, {
            items: this.loras.map((l) => ({ label: l, value: l })),
            placeholder: "Search LoRA...",
            initialValue: this.value.lora,
            maxVisible: 15,
            onFilter: (query, items) =>
                query
                    ? items.filter((i) =>
                          i.label.toLowerCase().includes(query.toLowerCase()),
                      )
                    : items,
            onSelect: (value) => {
                this.value.lora = value;
                this.onChange("lora");
                if (node.graph) node.graph.setDirtyCanvas(true, true);
            },
        });
    }
}
