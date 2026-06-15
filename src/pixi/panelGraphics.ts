interface PanelSettings {
	fill?: string;
	borderColor?: string;
	borderWidth?: number;
	radius?: number;
}

/** Parse any CSS color (#rgb, #rrggbb, named, rgb()) to a PIXI hex number; empty/invalid → 0. */
function toHex(color?: string): number {
	if (!color) return 0;
	try {
		return Number((foundry.utils.Color.from(color) as unknown as { valueOf: () => number }).valueOf());
	} catch {
		return 0;
	}
}

/**
 * A flat fill/border/radius rectangle for the WebGL renderer — the asset-free analog of the HTML
 * `Panel` div. Redraws on resize (scaling a Graphics would distort the border and corners), mirroring
 * how NineSlicePlaneButton handles sizing.
 */
export default class PanelGraphics extends PIXI.Graphics {
	#settings: PanelSettings;
	#w = 100;
	#h = 100;

	constructor(settings: PanelSettings) {
		super();
		this.#settings = settings;
		this.#redraw();
	}

	/** Redraw at a new size — called from transitionState on initial build and every transition. */
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
