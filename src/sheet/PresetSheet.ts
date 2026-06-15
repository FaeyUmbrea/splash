import type { ButtonImageCreate, SpriteCreate } from '../datamodel/SplashModel.ts';
import type { PresetPayload } from '../utils/presets.ts';

const HandlebarsSheet = foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet;

const KIND_META: Record<string, { label: string; icon: string }> = {
	nineslice: { label: 'Nine-slice', icon: 'fa-solid fa-border-all' },
	button: { label: 'Button', icon: 'fa-solid fa-hand-pointer' },
	animation: { label: 'Animation', icon: 'fa-solid fa-wand-magic-sparkles' },
	sprite: { label: 'Sprite', icon: 'fa-solid fa-image' },
	spriteGroup: { label: 'Sprite group', icon: 'fa-solid fa-layer-group' },
};

const SPRITE_GLYPH: Record<string, string> = {
	image: 'fa-solid fa-image',
	text: 'fa-solid fa-font',
	button: 'fa-solid fa-hand-pointer',
};

/** CSS border-image declaration for a nine-slice image (HTML-only frame preview; no canvas). */
function borderImageCss(img: ButtonImageCreate | undefined | null): string | null {
	const url = (img as { url?: string } | null)?.url;
	if (!url) return null;
	const safe = url.replace(/["\\]/g, ''); // keep the url() declaration intact
	const i = img as Record<string, number>;
	const l = i.leftWidth ?? 0;
	const t = i.topHeight ?? 0;
	const r = i.rightWidth ?? 0;
	const b = i.bottomHeight ?? 0;
	return `border-image: url(${safe}) ${t} ${r} ${b} ${l} fill / ${t}px ${r}px ${b}px ${l}px stretch; border-style: solid; border-width: ${t}px ${r}px ${b}px ${l}px;`;
}

function baseName(url: string | undefined): string {
	return url ? url.split('/').pop() ?? url : '—';
}

interface PresetView {
	kind: string;
	kindLabel: string;
	icon: string;
	rows: { label: string; value: string }[];
	demo: boolean; // a nine-slice frame
	demoLabel: string;
	text: string | null; // a text-sprite preview
	image: string | null; // a plain image preview
	swatch: boolean; // a colour swatch (animation tint)
	members: { name: string; glyph: string; image: string | null }[];
}

/**
 * Read-only preview sheet for `splash.preset` journal pages. Renders an HTML summary of the preset —
 * nine-slice frames via CSS `border-image`, text/images, and parameter tables — so opening a preset in
 * the journal shows what it is. Strictly HTML/CSS, never a canvas. Presets are authored from the splash
 * editor, so edit mode only carries the core header (rename) + a note.
 */
export class PresetSheet extends HandlebarsSheet {
	static VIEW_PARTS = {
		content: { template: 'modules/splash/templates/preset-view.hbs', root: true },
	};

	static EDIT_PARTS = {
		header: HandlebarsSheet.EDIT_PARTS.header,
		content: { template: 'modules/splash/templates/preset-edit.hbs' },
		footer: HandlebarsSheet.EDIT_PARTS.footer,
	};

	#payload(): PresetPayload | null {
		return (this.document.system as { toObject?: () => { payload?: PresetPayload } }).toObject?.().payload ?? null;
	}

	#describe(payload: PresetPayload | null): PresetView {
		const kind = payload?.type ?? 'unknown';
		const meta = KIND_META[kind] ?? { label: kind, icon: 'fa-solid fa-question' };
		const view: PresetView = { kind, kindLabel: meta.label, icon: meta.icon, rows: [], demo: false, demoLabel: '', text: null, image: null, swatch: false, members: [] };
		if (!payload) return view;

		if (payload.type === 'nineslice') {
			view.demo = true;
			view.demoLabel = 'Preview';
			view.rows.push({ label: 'Image', value: baseName(payload.url) });
			view.rows.push({ label: 'Insets', value: `L ${payload.leftWidth ?? 0} · T ${payload.topHeight ?? 0} · R ${payload.rightWidth ?? 0} · B ${payload.bottomHeight ?? 0}` });
		} else if (payload.type === 'button') {
			const b = payload as Record<string, unknown>;
			view.demo = true;
			view.demoLabel = (b.label as { text?: string })?.text || 'Button';
			view.rows.push({ label: 'Label', value: (b.label as { text?: string })?.text || '—' });
			const variants = ['hoverImage', 'clickImage', 'hoverLabel', 'clickLabel'].filter(k => b[k]);
			if (variants.length) view.rows.push({ label: 'Variants', value: variants.join(', ') });
		} else if (payload.type === 'animation') {
			const v = payload.value as Record<string, unknown>;
			const props = (v.props ?? {}) as Record<string, unknown>;
			view.swatch = v.type === 'glitch';
			view.rows.push({ label: 'Effect', value: String(v.type ?? '—') });
			view.rows.push({ label: 'Duration', value: `${v.duration ?? 0} ms` });
			view.rows.push({ label: 'Delay', value: `${v.delay ?? 0} ms` });
			const origins = (v.type === 'dissolve' ? props : (props.origins ?? {})) as Record<string, unknown>;
			view.rows.push({ label: 'Origins', value: origins.type === 'fixedOrigins' ? `fixed (${((origins.origins as unknown[]) ?? []).length})` : `random (${origins.numOrigins ?? 0})` });
			if (v.type === 'glitch') {
				view.rows.push({ label: 'Bands', value: String(props.bands ?? '—') });
				view.rows.push({ label: 'Intensity', value: String(props.intensity ?? '—') });
				view.rows.push({ label: 'Invert', value: props.invert ? 'yes' : 'no' });
			}
		} else if (payload.type === 'sprite') {
			this.#describeSpriteInto(view, payload.value);
		} else if (payload.type === 'spriteGroup') {
			view.rows.push({ label: 'Members', value: String(payload.value?.length ?? 0) });
			view.members = (payload.value ?? []).map((s) => {
				const r = s as Record<string, unknown>;
				return {
					name: (r.name as string) || (KIND_META[String(r.type)]?.label ?? String(r.type)),
					glyph: SPRITE_GLYPH[String(r.type)] ?? 'fa-solid fa-shapes',
					image: r.type === 'image' && r.img ? String(r.img) : null,
				};
			});
		}
		return view;
	}

	/** Describe a single sprite into the view (shared by the `sprite` kind). */
	#describeSpriteInto(view: PresetView, sprite: SpriteCreate): void {
		const s = sprite as Record<string, unknown>;
		view.rows.push({ label: 'Sprite', value: KIND_META[String(s.type)]?.label ?? String(s.type) });
		if (s.type === 'image') {
			view.image = (s.img as string) || null;
		} else if (s.type === 'text') {
			view.text = (s.text as string) || '';
		} else if (s.type === 'button') {
			view.demo = true;
			view.demoLabel = (s.label as { text?: string })?.text || 'Button';
		}
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.preset = this.#describe(this.#payload());
		return context;
	}

	/** Apply the dynamic CSS that can't live safely in an HTML attribute (border-image, fonts, colours). */
	async _onRender(context, options) {
		await super._onRender(context, options);
		const payload = this.#payload();
		if (!payload) return;

		// Nine-slice frame demo (nineslice / button / sprite-button).
		const demo = this.element.querySelector<HTMLElement>('[data-preset-demo]');
		if (demo) {
			const img = payload.type === 'nineslice'
				? (payload as unknown as ButtonImageCreate)
				: payload.type === 'button'
					? (payload as Record<string, unknown>).image as ButtonImageCreate
					: payload.type === 'sprite' && (payload.value as Record<string, unknown>).type === 'button'
						? (payload.value as Record<string, unknown>).image as ButtonImageCreate
						: null;
			const css = borderImageCss(img);
			if (css) demo.style.cssText += css;
			// Colour the demo label with the button's label fill, if any.
			const fill = (payload.type === 'button' ? (payload as Record<string, unknown>).label : payload.type === 'sprite' ? (payload.value as Record<string, unknown>).label : null) as { fill?: string } | null;
			if (fill?.fill) demo.style.color = fill.fill;
		}

		// Text-sprite preview styled with its own font/size/colour.
		const textEl = this.element.querySelector<HTMLElement>('[data-preset-text]');
		if (textEl && payload.type === 'sprite' && (payload.value as Record<string, unknown>).type === 'text') {
			const t = payload.value as Record<string, unknown>;
			textEl.style.fontFamily = String(t.font ?? 'inherit');
			textEl.style.fontSize = `${Math.min(Number(t.size ?? 28), 48)}px`;
			textEl.style.color = String(t.fillColor ?? '#fff');
		}

		// Animation tint swatch.
		const swatch = this.element.querySelector<HTMLElement>('[data-preset-swatch]');
		if (swatch && payload.type === 'animation') {
			const tint = ((payload.value as Record<string, unknown>).props as Record<string, unknown>)?.tint;
			if (typeof tint === 'string') swatch.style.background = tint;
		}
	}
}
