import { COLORS } from "./constants.js";
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

    _inHit(x, hit) {
        return x >= hit[0] && x <= hit[0] + hit[1];
    }

    _showLoraMenu(event, node) {
        // Destroy any previous menu
        document.querySelector("._lora_picker_menu")?.remove();
        document.removeEventListener("pointerdown", this._onOutside);

        const wrapper = document.createElement("div");
        wrapper.classList.add("_lora_picker_menu");
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
        input.placeholder = "Search LoRA...";
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
        select.size = 15;
        select.style.cssText = `
            background: #1a1a1a;
            color: #e0e0e0;
            border: none;
            font-family: monospace;
            font-size: 11px;
            min-width: 250px;
            max-height: 300px;
            outline: none;
            cursor: pointer;
        `;

        const populate = (filter = "") => {
            select.innerHTML = "";
            const filtered = filter
                ? this.loras.filter((l) =>
                      l.toLowerCase().includes(filter.toLowerCase()),
                  )
                : this.loras;
            for (const lora of filtered) {
                const opt = document.createElement("option");
                opt.value = lora;
                opt.textContent = lora;
                if (lora === this.value.lora) opt.selected = true;
                select.appendChild(opt);
            }

            // Adapt length to item count
            select.size = Math.min(filtered.length, 15);
            // If empty, display at least one line
            if (select.size === 0) select.size = 1;
        };

        populate();
        // --- Event listener - Input (Enter): Fill with search ---
        input.addEventListener("input", () => populate(input.value));

        const cleanup = () => {
            document.querySelector("._lora_picker_menu")?.remove();
            document.removeEventListener("pointerdown", this._onOutside);
        };

        this._onOutside = (e) => {
            if (!wrapper.contains(e.target)) cleanup();
        };

        // --- Event listener - Keydown (Change): Select value ---
        select.addEventListener("change", () => {
            this.value.lora = select.value;
            this.onChange("lora");
            if (node.graph) node.graph.setDirtyCanvas(true, true);
            cleanup();
        });

        input.addEventListener("keydown", (e) => {
            // --- Event listener - Keydown (Arrow Up/Down): Keyboard navigation ---
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const current = select.selectedIndex;
                if (e.key === "ArrowDown") {
                    select.selectedIndex = Math.min(
                        current + 1,
                        select.options.length - 1,
                    );
                } else {
                    select.selectedIndex = Math.max(current - 1, 0);
                }
                return;
            }
            // --- Event listener - Keydown (Enter): Validate search ---
            if (e.key === "Enter" && select.options.length > 0) {
                this.value.lora =
                    select.selectedOptions[0]?.value ?? select.options[0].value;
                this.onChange("lora");
                if (node.graph) node.graph.setDirtyCanvas(true, true);
                cleanup();
            }
            // --- Event listener - Keydown (Escape): Cleanup ---
            if (e.key === "Escape") {
                cleanup();
            }
        });

        wrapper.appendChild(input);
        wrapper.appendChild(select);
        document.body.appendChild(wrapper);

        setTimeout(() => {
            document.addEventListener("pointerdown", this._onOutside);
            input.focus();
        }, 0);
    }
}

// --- Utils---

// Fit string to width (truncate with ellipsis)
const fitString = (ctx, str, maxWidth) => {
    if (ctx.measureText(str).width <= maxWidth) return str;
    while (str.length > 1 && ctx.measureText(str + "…").width > maxWidth) {
        str = str.slice(0, -1);
    }
    return str + "…";
};
