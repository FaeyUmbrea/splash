interface PanelSettings {
	fill?: string;
	borderColor?: string;
	borderWidth?: number;
	radius?: number;
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

/** Redraws on resize rather than scaling, which would distort the border and corners. */
export default class PanelGraphics extends PIXI.Graphics {
	#settings: PanelSettings;
	#w = 100;
	#h = 100;

	constructor(settings: PanelSettings) {
		super();
		this.#settings = settings;
		this.#redraw();
	}

	resize(width: number, height: number): void {
		this.#w = width;
		this.#h = height;
		this.#redraw();
	}

	#redraw(): void {
		const { fill, borderColor, borderWidth = 0, radius = 0 } = this.#settings;
		this.clear();
		if (borderWidth > 0 && borderColor) this.lineStyle(borderWidth, toHex(borderColor), 1, 0);
		this.beginFill(toHex(fill), fill ? 1 : 0);
		if (radius > 0) this.drawRoundedRect(0, 0, this.#w, this.#h, radius);
		else this.drawRect(0, 0, this.#w, this.#h);
		this.endFill();
	}
}
