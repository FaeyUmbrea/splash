import type { Component } from 'svelte';
import Button from './Button.svelte';
import Draggable from './Draggable.svelte';
import DropZone from './DropZone.svelte';
import Gauge from './Gauge.svelte';
import Hotspot from './Hotspot.svelte';
import Image from './Image.svelte';
import Panel from './Panel.svelte';
import Text from './Text.svelte';
import TextInput from './TextInput.svelte';
import Video from './Video.svelte';

/** DOM component per sprite type, shared by the HTML renderer and the editor canvas. */
export const spriteComponents: Record<string, Component<any>> = {
	'image': Image,
	'text': Text,
	'button': Button,
	'panel': Panel,
	'gauge': Gauge,
	'hotspot': Hotspot,
	'video': Video,
	'text-input': TextInput,
	'draggable': Draggable,
	'drop-zone': DropZone,
};

/** Fallback size for sprites without explicit dimensions; must match the PIXI renderer's defaults. */
export function spriteDefaultSize(type: string | null | undefined): { width?: number; height?: number } {
	if (type === 'button') return { width: 400, height: 200 };
	if (type === 'panel') return { width: 200, height: 200 };
	if (type === 'gauge') return { width: 300, height: 40 };
	if (type === 'hotspot') return { width: 200, height: 200 };
	if (type === 'text-input') return { width: 240, height: 40 };
	if (type === 'draggable') return { width: 100, height: 100 };
	if (type === 'drop-zone') return { width: 120, height: 120 };
	return {};
}
