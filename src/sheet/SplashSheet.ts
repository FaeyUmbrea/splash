import { openSplashOverlay } from '../apps/overlay.ts';
import { SvelteRenderer } from '../apps/SvelteRenderer.ts';
import { img, img2 } from '../index.ts';
import SplashEditor from '../svelte/SplashEditor.svelte';

export class SplashSheet extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
	static VIEW_PARTS = {
		sheet: {
			template: 'modules/splash/templates/splash-sheet.hbs',
		},
	};

	static EDIT_PARTS = {
		header: super.EDIT_PARTS.header,
		content: {
			template: 'modules/splash/templates/splash-sheet-edit.hbs',
		},
		footer: super.EDIT_PARTS.footer,
	};

	async _onRender(_context, _options) {
		const editButton = this.element.querySelector('[data-action="editSplash"]');
		if (editButton) {
			editButton.addEventListener('click', this.editSplash.bind(this));
		}
		const showButton = this.element.querySelector('[data-action="showSplash"]');
		if (showButton) {
			showButton.addEventListener('click', this.showSplash.bind(this));
		}
		const testButton = this.element.querySelector('[data-action="testSplash"]');
		if (testButton) {
			testButton.addEventListener('click', this.testSplash.bind(this));
		}
	}

	editSplash() {
		new SvelteRenderer(
			SplashEditor,
			{ page: this.document },
			{ id: 'splash-editor', classes: ['splash-editor'] },
		).render(true);
	};

	showSplash() {
		openSplashOverlay(this.document as JournalEntryPage.OfType<'splash.splash'>, { layer: 'full' });
	};

	async testSplash() {
		const data = this.document as JournalEntryPage.OfType<'splash.splash'>;

		const splash = createSplash();

		// @ts-expect-error why thoooo
		await data.update({ system: splash });
	}
}

function createSplash() {
	const image = {
		type: 'image',
		img,
		name: 'Image',
		states: {
			initial: {
				zIndex: -1,
				priority: 1,
				height: window.innerHeight,
				width: window.innerWidth,
				name: '',
				x: null,
				y: null,
			},

			third: {
				zIndex: -1,
				x: 700,
				y: 200,
				height: 200,
				width: 400,
				priority: null,
				name: '',
			},
		},
	};

	const text = {
		type: 'text',
		text: 'Hello',
		font: 'Arial',
		size: 20,
		fillColor: '#ffffff',
		states: {
			second: { x: 500, y: 500, zIndex: 1 },
		},
	};

	const button = {
		type: 'button',
		label: {
			text: 'Button',
			fontSize: 20,
			strokeThickness: 1,
			stroke: '#000000',
			fill: '#ffffff',
		},
		image: {
			url: img,
			leftWidth: 0,
			rightWidth: 0,
			topHeight: 0,
			bottomHeight: 0,
		},
		hoverImage: {
			url: img2,
			leftWidth: 0,
			rightWidth: 0,
			topHeight: 0,
			bottomHeight: 0,
		},
		clickLabel: {
			text: 'SNENK',
			fontSize: 60,
			strokeThickness: 4,
			stroke: '#613414',
			fill: '#ba6234',
		},
		onClick: {
			type: 'change-state',
			load: ['second'],
			unload: ['third'],
		},
		tint: '#cccccc',
		hoverTint: '#999999',
		clickTint: '#141241',
		states: {
			third: { x: 500, y: 500 },
		},
	};

	return {
		children: [image, text, button],
		states: {
			initial: 'Initial',
			second: 'Second',
			third: 'Third',
		},
		animIn: {
			type: 'dissolve',
			props: {
				type: 'randomOrigins',
				randomOrigins: true,
				invert: true,
			},
		},
		animOut: {
			type: 'dissolve',
			props: {
				type: 'randomOrigins',
				randomOrigins: true,
				invert: false,
			},
		},
	};
}
