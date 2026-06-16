interface GaugeSettings {
	fillColor?: string;
	bgColor?: string;
	vertical?: boolean;
}

/** CSS color to PIXI hex number; empty or invalid yields 0. */
function toHex(color?: string): number {
	if (!color) return 0;
	try {
		return Number((foundry.utils.Color.from(color) as unknown as { valueOf: () => number }).valueOf());
	} catch {
		return 0;
	}
}

/** Redraws on resize or value change rather than scaling, so the fill tracks the fraction precisely. */
export default class GaugeGraphics extends PIXI.Graphics {
	#settings: GaugeSettings;
	#w = 300;
	#h = 40;
	#fraction = 0;

	constructor(settings: GaugeSettings) {
		super();
		this.#settings = settings;
		this.#redraw();
	}

	resize(width: number, height: number): void {
		this.#w = width;
		this.#h = height;
		this.#redraw();
	}

	setFraction(fraction: number): void {
		this.#fraction = fraction;
		this.#redraw();
	}

	#redraw(): void {
		const { fillColor, bgColor, vertical = false } = this.#settings;
		const f = Math.min(Math.max(this.#fraction, 0), 1);
		this.clear();
		if (bgColor) {
			this.beginFill(toHex(bgColor), 1);
			this.drawRect(0, 0, this.#w, this.#h);
			this.endFill();
		}
		this.beginFill(toHex(fillColor), fillColor ? 1 : 0);
		if (vertical) {
			const fh = this.#h * f;
			this.drawRect(0, this.#h - fh, this.#w, fh);
		} else {
			this.drawRect(0, 0, this.#w * f, this.#h);
		}
		this.endFill();
	}
}
