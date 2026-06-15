import type { SpriteCreate } from '../datamodel/SplashModel.ts';
import type { PrefabBehavior } from './index.ts';
import { nanoid } from 'nanoid';

/**
 * The output is a plain portable splash; interactivity rides in two inline macros parameterized by
 * per-button context, so nothing references this behavior at runtime.
 */

const ROTATE
	= `const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ';const w=scope.parent;`
		+ `const i=(A.indexOf((w.child.get('Middle').text||'A').toUpperCase())+(context.Direction||1)+26)%26;`
		+ `w.child.get('Middle').text=A[i];w.child.get('Top').text=A[(i+25)%26];w.child.get('Bottom').text=A[(i+1)%26];`;

const UNLOCK
	= `const root=scope.parent;`
		+ `const word=context.Wheels.map(id=>String(root.child.get(id)?.child.get('Middle').text||'').toUpperCase()).join('');`
		+ `if(word===String(context.Keyword).toUpperCase()){ui.notifications?.info(game.i18n.localize('splash.behavior.tumblerLock.unlocked'));api.unlockDoor();api.close();}`
		+ `else{ui.notifications?.warn(game.i18n.localize('splash.behavior.tumblerLock.wrongCombination'));}`;

const WHEEL_W = 90;
const WHEEL_H = 240;
const GAP = 16;
const X0 = 200;
const Y0 = 200;

export const tumblerLock: PrefabBehavior = {
	key: 'tumbler-lock',
	// Getters, not eager calls: this is imported before game.i18n exists, and in Node when buildPresets bundles it.
	get label() { return game.i18n.localize('splash.behavior.tumblerLock.label'); },
	icon: 'fa-solid fa-lock',
	fields: [{ key: 'codeword', get label() { return game.i18n.localize('splash.behavior.tumblerLock.codeword'); }, type: 'text', default: 'OPEN' }],

	build(config, { stateKey }) {
		const word = (String(config.codeword ?? '').toUpperCase().replace(/[^A-Z]/g, '') || 'OPEN');
		const lock = nanoid(6);

		const place = (x: number, y: number, width: number, height: number) => ({ [stateKey]: { x, y, width, height } });
		const panel = (groupId: string, x: number, y: number, w: number, h: number): SpriteCreate =>
			({ type: 'panel', id: nanoid(), name: 'Body', groupId, fill: '#1b2838', borderColor: '#7799bb', borderWidth: 4, radius: 10, effects: [], states: place(x, y, w, h) } as SpriteCreate);
		const text = (groupId: string, name: string, value: string, x: number, y: number, w: number, size: number, color: string): SpriteCreate =>
			({ type: 'text', id: nanoid(), name, groupId, text: value, font: 'Arial', size, fillColor: color, align: 'center', effects: [], states: { [stateKey]: { x, y, width: w, height: null } } } as SpriteCreate);
		const button = (groupId: string | null, name: string, label: string, source: string, context: Record<string, unknown>, x: number, y: number, w: number, h: number): SpriteCreate =>
			({ type: 'button', id: nanoid(), name, groupId, label: { text: label, fontSize: name === 'Unlock' ? 22 : 26, strokeThickness: 0, stroke: '#000000', fill: '#cfe3ff' }, image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 }, tint: name === 'Unlock' ? '#3a6ea5' : '#2d4a63', onClick: { type: 'script', source }, context, effects: [], states: place(x, y, w, h) } as SpriteCreate);

		const sprites: SpriteCreate[] = [];
		const wheelIds: string[] = [];

		[...word].forEach((_letter, i) => {
			const wid = `${lock}_w${i}`;
			wheelIds.push(wid);
			const x = X0 + i * (WHEEL_W + GAP);
			sprites.push(
				panel(wid, x, Y0, WHEEL_W, WHEEL_H),
				button(wid, 'Up', '▲', ROTATE, { Direction: 1 }, x + 15, Y0 + 6, WHEEL_W - 30, 30),
				text(wid, 'Top', 'Z', x, Y0 + 45, WHEEL_W, 28, '#7f9fc0'),
				text(wid, 'Middle', 'A', x, Y0 + 92, WHEEL_W, 56, '#ffffff'),
				text(wid, 'Bottom', 'B', x, Y0 + 168, WHEEL_W, 28, '#7f9fc0'),
				button(wid, 'Down', '▼', ROTATE, { Direction: -1 }, x + 15, Y0 + WHEEL_H - 36, WHEEL_W - 30, 30),
			);
		});

		const fullWidth = word.length * (WHEEL_W + GAP) - GAP;
		// Ungrouped, so its `scope.parent` is the tree root and it reaches every wheel by id.
		sprites.push(button(null, 'Unlock', 'UNLOCK', UNLOCK, { Keyword: word, Wheels: wheelIds }, X0, Y0 + WHEEL_H + 16, fullWidth, 44));

		return sprites;
	},
};
