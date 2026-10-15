<svelte:options runes={true} />
<script lang='ts'>
	import type { AuthoringIssue } from './actionValidation.ts';

	const { issues }: { issues: AuthoringIssue[] } = $props();
</script>

{#if issues.length}
	<details class='issues'>
		<summary><i class='fa-solid fa-triangle-exclamation'></i> {game.i18n.format('splash.editor.validation.connections', { count: issues.length })}</summary>
		<ul>
			{#each issues as issue, index (index)}
				<li><strong>{issue.owner}:</strong> {game.i18n.format(`splash.editor.validation.${issue.message}`, { state: issue.missingState ?? '' })}</li>
			{/each}
		</ul>
	</details>
{/if}

<style lang='scss'>
	.issues {
		padding: 10px 14px;
		background: #ff980010;
		border-bottom: 1px solid #ff980040;
		color: #ffca7a;
		font-size: 12px;
		max-height: 160px;
		overflow: auto;
	}
	summary {
		cursor: pointer;
	}
	ul {
		margin: 8px 0 0;
		padding-left: 20px;
		line-height: 1.7;
	}
</style>
