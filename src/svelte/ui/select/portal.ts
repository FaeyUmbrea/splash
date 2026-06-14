/** Move a node to a target (default document.body) so portalled UI escapes overflow/stacking contexts. */
export function portal(node: HTMLElement, target: HTMLElement = document.body) {
	target.appendChild(node);
	return {
		destroy() {
			if (node.parentNode === target) target.removeChild(node);
		},
	};
}
