<svelte:options runes={true} />
<script lang='ts'>
	import type { PresetPayload } from '../../utils/presets.ts';
	import { promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';
	import { IconButton, ImageField } from '../ui';

	interface Img { url?: string; leftWidth?: number; topHeight?: number; rightWidth?: number; bottomHeight?: number }

	const {
		value,
		title,
		onChange,
		onClose,
	}: {
		value: Img;
		title: string;
		onChange: (patch: Partial<Img>) => void;
		onClose: () => void;
	} = $props();

	let natW = $state(0);
	let natH = $state(0);
	let imgEl = $state<HTMLImageElement | null>(null);

	const l = $derived(value.leftWidth ?? 0);
	const t = $derived(value.topHeight ?? 0);
	const r = $derived(value.rightWidth ?? 0);
	const b = $derived(value.bottomHeight ?? 0);

	// Cut lines are drawn in this scaled preview space.
	const MAX = 360;
	const scale = $derived(natW && natH ? Math.min(MAX / natW, MAX / natH, 1) : 1);
	const dispW = $derived(natW * scale);
	const dispH = $derived(natH * scale);

	function onImgLoad() {
		natW = imgEl?.naturalWidth ?? 0;
		natH = imgEl?.naturalHeight ?? 0;
	}

	function dragLine(event: PointerEvent, edge: 'l' | 'r' | 't' | 'b') {
		event.preventDefault();
		const box = (event.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
		function move(e: PointerEvent) {
			const xPx = Math.round((e.clientX - box.left) / scale);
			const yPx = Math.round((e.clientY - box.top) / scale);
			if (edge === 'l') onChange({ leftWidth: Math.max(0, Math.min(xPx, natW - r)) });
			else if (edge === 'r') onChange({ rightWidth: Math.max(0, Math.min(natW - xPx, natW - l)) });
			else if (edge === 't') onChange({ topHeight: Math.max(0, Math.min(yPx, natH - b)) });
			else onChange({ bottomHeight: Math.max(0, Math.min(natH - yPx, natH - t)) });
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	const demoBorderImage = $derived(value.url
		? `border-image: url("${value.url}") ${t} ${r} ${b} ${l} fill / ${t}px ${r}px ${b}px ${l}px stretch; border-style: solid; border-width: ${t}px ${r}px ${b}px ${l}px;`
		: '');

	let picking = $state(false);
	const isGM = !!game.user?.isGM;

	function applyPreset(payload: PresetPayload) {
		if (payload.type === 'nineslice') {
			const { type: _type, ...img } = payload;
			onChange(img as Partial<Img>);
		}
	}
</script>

<div class='nine-slice-backdrop' role='presentation' onclick={onClose}>
	<div class='nine-slice-editor' role='dialog' aria-label={title} onclick={e => e.stopPropagation()}>
		<header>
			<span>{game.i18n.format('splash.editor.nineSliceEditor.headerTitle', { title })}</span>
			<span class='header-actions'>
				<IconButton icon='fa-solid fa-folder-open' title={game.i18n.localize('splash.editor.nineSliceEditor.applyPreset')} onclick={() => (picking = true)} />
				{#if isGM && value.url}
					<IconButton icon='fa-solid fa-floppy-disk' title={game.i18n.localize('splash.editor.nineSliceEditor.saveAsPreset')} onclick={() => promptAndSavePreset({ type: 'nineslice', ...value } as PresetPayload, game.i18n.localize('splash.editor.nineSliceEditor.presetDefaultName'))} />
				{/if}
				<button type='button' class='close' title={game.i18n.localize('splash.editor.nineSliceEditor.close')} aria-label={game.i18n.localize('splash.editor.nineSliceEditor.close')} onclick={onClose}><i class='fa-solid fa-xmark'></i></button>
			</span>
		</header>

		<div class='body'>
			<div class='left'>
				<ImageField label={game.i18n.localize('splash.editor.nineSliceEditor.imageLabel')} value={value.url ?? ''} onChange={v => onChange({ url: v })} />
				<div class='cut-area'>
					{#if value.url}
						<div class='canvas' style={`width:${dispW}px;height:${dispH}px;`}>
							<img bind:this={imgEl} src={value.url} alt='' onload={onImgLoad} />
							{#if natW}
								<div class='line v' role='slider' aria-label={game.i18n.localize('splash.editor.nineSliceEditor.cutLeft')} aria-valuenow={l} tabindex='0' style={`left:${l * scale}px;`} onpointerdown={e => dragLine(e, 'l')}></div>
								<div class='line v' role='slider' aria-label={game.i18n.localize('splash.editor.nineSliceEditor.cutRight')} aria-valuenow={r} tabindex='0' style={`left:${(natW - r) * scale}px;`} onpointerdown={e => dragLine(e, 'r')}></div>
								<div class='line h' role='slider' aria-label={game.i18n.localize('splash.editor.nineSliceEditor.cutTop')} aria-valuenow={t} tabindex='0' style={`top:${t * scale}px;`} onpointerdown={e => dragLine(e, 't')}></div>
								<div class='line h' role='slider' aria-label={game.i18n.localize('splash.editor.nineSliceEditor.cutBottom')} aria-valuenow={b} tabindex='0' style={`top:${(natH - b) * scale}px;`} onpointerdown={e => dragLine(e, 'b')}></div>
							{/if}
						</div>
					{:else}
						<p class='hint'>{game.i18n.localize('splash.editor.nineSliceEditor.pickImageHint')}</p>
					{/if}
				</div>
				<p class='hint'>{game.i18n.format('splash.editor.nineSliceEditor.dragHint', { l, t, r, b })}</p>
			</div>

			<div class='right'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.nineSliceEditor.demoLabel')}</span>
				<div class='demo' style={demoBorderImage}>{game.i18n.localize('splash.editor.nineSliceEditor.demoButton')}</div>
			</div>
		</div>
	</div>
</div>

{#if picking}
	<PresetPicker kind='nineslice' title={game.i18n.localize('splash.editor.nineSliceEditor.applyPreset')} onPick={applyPreset} onClose={() => (picking = false)} />
{/if}

<style lang='scss'>
	.header-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.nine-slice-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9200;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nine-slice-editor {
		background: #1e1e1e;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
		min-width: 640px;
		color: #eee;

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 8px 12px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			font-weight: 600;

			.close {
				background: none;
				border: 0;
				color: inherit;
				cursor: pointer;
			}
		}

		.body {
			display: grid;
			grid-template-columns: auto 1fr;
			gap: 16px;
			padding: 16px;
		}
	}

	.cut-area {
		margin: 10px 0;
		display: flex;
		justify-content: center;
		min-height: 120px;
	}

	.canvas {
		position: relative;
		background: repeating-conic-gradient(#333 0% 25%, #2a2a2a 0% 50%) 50% / 16px 16px;

		img {
			width: 100%;
			height: 100%;
			image-rendering: pixelated;
		}

		.line {
			position: absolute;
			background: #ff9800;
			box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);

			&.v {
				top: 0;
				bottom: 0;
				width: 2px;
				margin-left: -1px;
				cursor: ew-resize;
			}

			&.h {
				left: 0;
				right: 0;
				height: 2px;
				margin-top: -1px;
				cursor: ns-resize;
			}
		}
	}

	.right {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.demo {
		width: 160px;
		height: 70px;
		min-width: 40px;
		min-height: 30px;
		resize: both;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		text-shadow: 0 1px 2px #000;
		background: rgba(255, 255, 255, 0.04);
	}

	.hint {
		margin: 4px 0 0;
		font-size: 11px;
		opacity: 0.6;
	}

	.sublabel,
	.hint {
		user-select: none;
	}
</style>
