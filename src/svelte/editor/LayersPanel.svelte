<script lang='ts'>
	import type { SplashCreate, SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { nanoid } from 'nanoid';
	import { createEventDispatcher } from 'svelte';

	export let working: SplashCreate;
	export let activeState: string;
	export let selectedId: string | null;

	const dispatch = createEventDispatcher<{ select: string; change: void }>();

	const typeIcons: Record<string, string> = {
		image: 'fa-image',
		text: 'fa-font',
		button: 'fa-hand-pointer',
	};

	const defaultPlacement = () => ({ x: 100, y: 100 });

	function addSprite(sprite: SpriteCreate) {
		working.children = [...(working.children ?? []), sprite];
		dispatch('change');
		dispatch('select', sprite.id!);
	}

	function addImage() {
		new foundry.applications.apps.FilePicker({
			type: 'image',
			callback: (path: string) => {
				addSprite({
					type: 'image',
					id: nanoid(),
					name: 'New Image',
					img: path,
					states: { [activeState]: { ...defaultPlacement(), width: 400, height: 300 } },
				});
			},
		}).render(true);
	}

	function addText() {
		addSprite({
			type: 'text',
			id: nanoid(),
			name: 'New Text',
			text: 'New Text',
			size: 48,
			fillColor: '#ffffff',
			states: { [activeState]: defaultPlacement() },
		});
	}

	function addButton() {
		addSprite({
			type: 'button',
			id: nanoid(),
			name: 'New Button',
			label: { text: 'Button', fontSize: 32, strokeThickness: 0, stroke: '#000000', fill: '#ffffff' },
			image: { url: 'modules/splash/assets/noise.png', leftWidth: 0, rightWidth: 0, topHeight: 0, bottomHeight: 0 },
			onClick: { type: 'close' },
			states: { [activeState]: { ...defaultPlacement(), width: 300, height: 100 } },
		});
	}

	function removeSprite(id: string | null | undefined) {
		working.children = (working.children ?? []).filter(child => child?.id !== id);
		dispatch('change');
	}

	function placeInState(sprite: SpriteCreate) {
		sprite.states = { ...sprite.states, [activeState]: defaultPlacement() };
		dispatch('change');
	}
</script>

<aside class='layers-panel'>
	<header>
		<h2>Layers</h2>
		<button type='button' title='Add image' on:click={addImage}><i class='fas fa-image'></i></button>
		<button type='button' title='Add text' on:click={addText}><i class='fas fa-font'></i></button>
		<button type='button' title='Add button' on:click={addButton}><i class='fas fa-hand-pointer'></i></button>
	</header>
	<ul>
		{#each working.children ?? [] as child (child.id)}
			<li class:selected={child.id === selectedId} class:absent={!child.states?.[activeState]}>
				<button type='button' class='select' on:click={() => dispatch('select', child.id ?? '')}>
					<i class='fas {typeIcons[child.type ?? ''] ?? 'fa-question'}'></i>
					{child.name || child.id}
				</button>
				{#if !child.states?.[activeState]}
					<button type='button' class='place' title='Place in this state' on:click={() => placeInState(child)}>
						<i class='fas fa-location-plus'></i>
					</button>
				{/if}
				<button type='button' class='remove' title='Delete sprite' on:click={() => removeSprite(child.id)}>
					<i class='fas fa-trash'></i>
				</button>
			</li>
		{/each}
	</ul>
</aside>

<style lang='scss'>
	.layers-panel {
		position: absolute;
		top: 4rem;
		left: 1rem;
		width: 240px;
		max-height: 70vh;
		overflow-y: auto;
		background: #000000d0;
		border: 1px solid #666;
		border-radius: 6px;
		padding: 0.5rem;
		color: #fff;
		z-index: 10;

		header {
			display: flex;
			align-items: center;
			gap: 0.25rem;

			h2 {
				flex: 1;
				margin: 0;
				font-size: 1rem;
				border: none;
			}

			button {
				background: none;
				border: 1px solid #666;
				border-radius: 4px;
				color: #fff;
				cursor: pointer;
			}
		}

		ul {
			margin: 0.5rem 0 0;
			padding: 0;
			list-style: none;
		}

		li {
			display: flex;
			align-items: center;

			&.selected .select {
				color: #ff9800;
			}

			&.absent .select {
				opacity: 0.5;
			}

			.select {
				flex: 1;
				text-align: left;
				background: none;
				border: none;
				color: #fff;
				cursor: pointer;
			}

			.place,
			.remove {
				background: none;
				border: none;
				color: #aaa;
				cursor: pointer;
				font-size: 0.8em;
			}
		}
	}
</style>
