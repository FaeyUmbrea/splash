import type { EditorDraft } from '../editorData.ts';
import { describe, expect, it } from 'vitest';
import { actionProblems } from '../actionValidation.ts';
import { discoverValueKeys } from '../authoringValues.ts';

describe('authoring connections', () => {
	it('finds shared values across initial data, state actions, conditions and object bindings', () => {
		const data = {
			values: { answer: '' },
			states: { initial: { onEnter: [{ type: 'set-value', key: 'score', value: '0' }] } },
			children: [
				{ valueKey: 'score', onClick: { type: 'change-state', conditions: { unlocked: 'yes' } } },
				{ valueKey: '', onDrop: { type: 'increment-value', key: 'attempts' } },
				{ name: 'not-a-value-name', onClick: { type: 'macro', key: 'extension-setting' } },
			],
		} as unknown as EditorDraft;
		expect(discoverValueKeys(data)).toEqual(['answer', 'attempts', 'score', 'unlocked']);
	});

	it('accepts an intentionally empty stored value but requires a value name', () => {
		expect(actionProblems({ type: 'set-value', key: 'answer', value: '' }, [])).toEqual([]);
		expect(actionProblems({ type: 'set-value', key: '  ', value: 'yes' }, [])).toEqual([{ message: 'valueName' }]);
	});

	it('identifies deleted states while accepting readable labels separately from saved keys', () => {
		expect(actionProblems({ type: 'change-state', load: ['state1'], unload: ['initial'] }, ['initial', 'state1'])).toEqual([]);
		expect(actionProblems({ type: 'change-state', load: ['deleted'], unload: ['deleted'] }, ['initial'])).toEqual([{ message: 'missingState', state: 'deleted' }]);
		expect(actionProblems({ type: 'change-state', load: [], unload: [] }, ['initial'])).toEqual([{ message: 'chooseStates' }]);
	});

	it('leaves no-action fields and third-party action contracts alone', () => {
		expect(actionProblems(null, [])).toEqual([]);
		expect(actionProblems({ type: 'publisher-action', key: '' }, [])).toEqual([]);
	});
});
