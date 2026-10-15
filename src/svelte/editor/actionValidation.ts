/** One actionable problem in a built-in action, displayed beside its fields and before testing. */
export interface ActionProblem {
	message: string;
	state?: string;
}

/** Validate built-in action inputs without executing actions or imposing rules on extension actions. */
export function actionProblems(action: Record<string, unknown> | null | undefined, states: string[]): ActionProblem[] {
	if (!action?.type) return [];
	const problems: ActionProblem[] = [];
	if (action.type === 'set-value' || action.type === 'increment-value') {
		if (typeof action.key !== 'string' || !action.key.trim()) problems.push({ message: 'valueName' });
	}
	if (action.type === 'macro' && !action.macro) problems.push({ message: 'macro' });
	if (action.type === 'script' && (typeof action.source !== 'string' || !action.source.trim())) problems.push({ message: 'script' });
	if (action.type === 'vote' && (typeof action.optionId !== 'string' || !action.optionId.trim())) problems.push({ message: 'vote' });
	if (action.type === 'change-state') {
		const load = Array.isArray(action.load) ? action.load : [];
		const unload = Array.isArray(action.unload) ? action.unload : [];
		if (!load.length && !unload.length) problems.push({ message: 'chooseStates' });
		for (const state of new Set([...load, ...unload])) {
			if (typeof state === 'string' && !states.includes(state)) problems.push({ message: 'missingState', state });
		}
	}
	return problems;
}

/** A problem together with the object or state whose authoring controls own it. */
export interface AuthoringIssue {
	owner: string;
	state?: string;
	objectId?: string;
	message: string;
	missingState?: string;
}
