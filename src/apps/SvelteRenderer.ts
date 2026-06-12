import type { DeepPartial } from 'fvtt-types/utils';
import type { Component } from 'svelte';
import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';

/** Generic frameless fullscreen ApplicationV2 hosting a Svelte component (overlay, editor). */
export class SvelteRenderer extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root: Component<any>;

	#props: object;

	constructor(
		root: Component<any>,
		props: object,
		options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>,
	) {
		super(options);
		this.root = root;
		this.#props = props;
	}

	static override DEFAULT_OPTIONS = {
		window: {
			frame: false,
			positioned: false,
		},
	};

	protected override async _prepareContext() {
		return {
			state: {},
			...this.#props,
		};
	}
}
