/** Moves a node into a target so portalled UI escapes overflow and stacking contexts. */
export function portal(node: HTMLElement, target: HTMLElement = document.body) {
	target.appendChild(node);
	return {
		destroy() {
			if (node.parentNode === target) target.removeChild(node);
		},
	};
}
