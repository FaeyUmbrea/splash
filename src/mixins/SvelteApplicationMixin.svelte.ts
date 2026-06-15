import type { DeepPartial } from 'fvtt-types/utils';
import * as svelte from 'svelte';

interface SvelteApplicationRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
	/** State data tracked by the root component: objects herein must be plain object. */
	state: object;
	/** This application instance */
	foundryApp?: SvelteApplication;
}

type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

function SvelteApplicationMixin<
	TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2.Any> & {
		DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
	},
>(Base: TBase) {
	abstract class SvelteApplication extends Base {
		static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
			classes: ['splash'],
		};

		protected abstract root: svelte.Component<any>;

		/** State data tracked by the root component */
		protected $state: object = $state({});

		/** The mounted root component, saved to be unmounted on application close */
		#mount: object = {};

		/**
		 * Optional async hook the mounted component can set to run work (e.g. an outro animation) while
		 * the DOM is still live, before the app tears down. Awaited in `_preClose`. `skipOutro` lets an
		 * emergency/instant close bypass it.
		 */
		onPreClose?: (options: foundry.applications.api.ApplicationV2.ClosingOptions & { skipOutro?: boolean }) => Promise<void> | void;

		protected override async _preClose(
			options: foundry.applications.api.ApplicationV2.ClosingOptions & { skipOutro?: boolean },
		): Promise<void> {
			// The outro is best-effort: a rejected/thrown out-animation must NEVER abort the close, or the
			// app would zombie on screen and every later close would re-run the same failing hook.
			if (!options?.skipOutro) {
				try {
					await this.onPreClose?.(options);
				} catch (error) {
					console.error('Splash | outro failed during close; tearing down anyway', error);
				}
			}
			await super._preClose(options);
		}

		protected abstract override _prepareContext(
			options: foundry.applications.api.ApplicationV2.RenderOptions,
		): Promise<SvelteApplicationRenderContext>;

		protected override async _renderHTML(
			context: SvelteApplicationRenderContext,
		): Promise<SvelteApplicationRenderContext> {
			return context;
		}

		protected override _replaceHTML(
			result: SvelteApplicationRenderContext,
			content: HTMLElement,
			options: foundry.applications.api.ApplicationV2.RenderOptions,
		): void {
			Object.assign(this.$state, result.state);
			if (options.isFirstRender) {
				this.#mount = svelte.mount(this.root, { target: content, props: { ...result, state: this.$state, foundryApp: this } });
			}
		}

		protected override _onClose(options: foundry.applications.api.ApplicationV2.ClosingOptions): void {
			super._onClose(options);
			svelte.unmount(this.#mount);
		}
	}

	return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { type SvelteApplication, SvelteApplicationMixin, type SvelteApplicationRenderContext };
