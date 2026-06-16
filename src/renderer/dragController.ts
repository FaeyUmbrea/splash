interface Point { x: number; y: number }

export interface DragConfig {
	/** The piece's tag; a zone accepts it only when the zone's `accepts` is blank or matches. */
	tag: string;
	/** Called on release with the target zone id, or '' for a miss. */
	onDrop: (zoneId: string) => void;
}

function centerOf(r: DOMRect): Point {
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** The topmost compatible drop zone under `point`; later DOM order wins on overlap (drawn on top). */
function zoneAt(host: HTMLElement, point: Point, tag: string): HTMLElement | null {
	const zones = host.querySelectorAll<HTMLElement>('[data-splash-dropzone]');
	for (let i = zones.length - 1; i >= 0; i--) {
		const zone = zones[i];
		const accepts = zone.dataset.accepts ?? '';
		if (accepts && accepts !== tag) continue;
		const r = zone.getBoundingClientRect();
		if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) return zone;
	}
	return null;
}

function zoneById(host: HTMLElement, zoneId: string): HTMLElement | null {
	return host.querySelector<HTMLElement>(`[data-splash-dropzone][data-zone-id="${CSS.escape(zoneId)}"]`);
}

/**
 * Pointer-drag a draggable element and snap it onto drop zones. Zones are discovered purely from the DOM (they mark
 * themselves with data attributes), so the same behaviour drives both the HTML renderer's component and the PIXI DOM
 * overlay. The element's resting position is owned by its host; this only layers a transform on top for drag/snap.
 */
export class DragBehavior {
	#el: HTMLElement;
	#host: HTMLElement;
	#config: DragConfig;
	#tx = 0;
	#ty = 0;
	#startX = 0;
	#startY = 0;
	#baseTx = 0;
	#baseTy = 0;
	#dragging = false;
	#hovered: HTMLElement | null = null;

	constructor(el: HTMLElement, host: HTMLElement, config: DragConfig) {
		this.#el = el;
		this.#host = host;
		this.#config = config;
		el.style.touchAction = 'none';
		el.style.cursor = 'grab';
		el.addEventListener('pointerdown', this.#onDown);
	}

	#setTranslate(x: number, y: number): void {
		this.#tx = x;
		this.#ty = y;
		this.#el.style.transform = (x || y) ? `translate(${x}px, ${y}px)` : '';
	}

	#onDown = (event: PointerEvent): void => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.#dragging = true;
		this.#startX = event.clientX;
		this.#startY = event.clientY;
		this.#baseTx = this.#tx;
		this.#baseTy = this.#ty;
		this.#el.style.cursor = 'grabbing';
		window.addEventListener('pointermove', this.#onMove);
		window.addEventListener('pointerup', this.#onUp);
	};

	#onMove = (event: PointerEvent): void => {
		if (!this.#dragging) return;
		this.#setTranslate(this.#baseTx + (event.clientX - this.#startX), this.#baseTy + (event.clientY - this.#startY));
		this.#hover(zoneAt(this.#host, centerOf(this.#el.getBoundingClientRect()), this.#config.tag));
	};

	#onUp = (): void => {
		window.removeEventListener('pointermove', this.#onMove);
		window.removeEventListener('pointerup', this.#onUp);
		this.#dragging = false;
		this.#el.style.cursor = 'grab';
		const zone = zoneAt(this.#host, centerOf(this.#el.getBoundingClientRect()), this.#config.tag);
		this.#hover(null);
		if (zone) {
			// Snap onto the zone right away; the synced value echoes back through settle() to confirm.
			this.#centerOn(zone);
			this.#config.onDrop(zone.dataset.zoneId ?? '');
		} else {
			this.#setTranslate(0, 0);
			this.#config.onDrop('');
		}
	};

	/** Outline the hovered zone with its own highlight colour, clearing the previous one. */
	#hover(zone: HTMLElement | null): void {
		if (zone === this.#hovered) return;
		if (this.#hovered) this.#hovered.style.boxShadow = '';
		if (zone) zone.style.boxShadow = `0 0 0 3px ${zone.dataset.highlight || '#4caf50'}`;
		this.#hovered = zone;
	}

	/** The element's home centre (its position with the drag transform removed). */
	#homeCenter(): Point {
		const r = this.#el.getBoundingClientRect();
		return { x: r.left + r.width / 2 - this.#tx, y: r.top + r.height / 2 - this.#ty };
	}

	#centerOn(zone: HTMLElement): void {
		const home = this.#homeCenter();
		const zc = centerOf(zone.getBoundingClientRect());
		this.#setTranslate(zc.x - home.x, zc.y - home.y);
	}

	/** Position from the synced occupancy value: onto `zoneId`, or home when blank/unknown. Ignored mid-drag. */
	settle(zoneId: string): void {
		if (this.#dragging) return;
		const zone = zoneId ? zoneById(this.#host, zoneId) : null;
		if (zone) this.#centerOn(zone);
		else this.#setTranslate(0, 0);
	}

	destroy(): void {
		this.#el.removeEventListener('pointerdown', this.#onDown);
		window.removeEventListener('pointermove', this.#onMove);
		window.removeEventListener('pointerup', this.#onUp);
		this.#hover(null);
	}
}
