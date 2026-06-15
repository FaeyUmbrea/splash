<svelte:options runes={true} />
<script lang='ts'>
	const {
		origins,
		width,
		onChange,
	}: {
		origins: number[];
		/** Stage width — origins are x-positions across it. */
		width: number;
		onChange: (origins: number[]) => void;
	} = $props();

	let barEl = $state<HTMLElement | null>(null);

	function xAt(clientX: number): number {
		const r = barEl?.getBoundingClientRect();
		if (!r) return 0;
		return Math.max(0, Math.min(width, Math.round(((clientX - r.left) / r.width) * width)));
	}

	function addOrigin(event: MouseEvent) {
		onChange([...origins, xAt(event.clientX)].sort((a, b) => a - b));
	}

	function removeOrigin(index: number, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		onChange(origins.filter((_, i) => i !== index));
	}

	function dragMarker(index: number, event: PointerEvent) {
		event.preventDefault();
		event.stopPropagation();
		function move(e: PointerEvent) {
			onChange(origins.map((o, i) => (i === index ? xAt(e.clientX) : o)));
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}
</script>

<div class='origin-editor'>
	<span class='sublabel'>Origins — click to add, drag to move, right-click to remove</span>
	<div class='bar' bind:this={barEl} role='presentation' onclick={addOrigin}>
		{#each origins as o, i (i)}
			<div
				class='marker'
				style={`left:${(o / Math.max(1, width)) * 100}%`}
				role='button'
				tabindex='-1'
				title={`x=${o}`}
				onpointerdown={e => dragMarker(i, e)}
				onclick={e => e.stopPropagation()}
				oncontextmenu={e => removeOrigin(i, e)}
			></div>
		{/each}
		{#if origins.length === 0}
			<span class='empty'>click to add an origin</span>
		{/if}
	</div>
</div>

<style lang='scss'>
	.origin-editor {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.bar {
		position: relative;
		height: 34px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 3px;
		cursor: copy;

		.empty {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 11px;
			opacity: 0.4;
			pointer-events: none;
		}

		.marker {
			position: absolute;
			top: 0;
			bottom: 0;
			width: 3px;
			margin-left: -1.5px;
			background: #ff9800;
			cursor: ew-resize;

			&::before {
				content: '';
				position: absolute;
				top: -3px;
				left: -3px;
				width: 9px;
				height: 9px;
				border-radius: 50%;
				background: #ff9800;
			}
		}
	}
</style>
