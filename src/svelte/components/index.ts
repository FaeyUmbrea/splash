import type { Component } from 'svelte';
import Button from './Button.svelte';
import Image from './Image.svelte';
import Text from './Text.svelte';

/** DOM component per sprite type, shared by the HTML renderer and the editor canvas. */
export const spriteComponents: Record<string, Component<any>> = {
	image: Image,
	text: Text,
	button: Button,
};

/** Fallback size for sprites without explicit dimensions; must match the PIXI renderer's defaults. */
export function spriteDefaultSize(type: string | null | undefined): { width?: number; height?: number } {
	return type === 'button' ? { width: 400, height: 200 } : {};
}
