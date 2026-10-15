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

export { spriteDefaultSize } from '../../utils/spriteSize.ts';
