// Scaffolds a new data-model schema and wires it into its category file: the schema creator, the category's
// TypedSchemaField, and the Initialized/Create unions. Locations are found by parsing the TypeScript AST (not
// string matching), and the result is formatted by the project's own `eslint --fix`, so output is lint-stable.
// Data model only — the runtime/registration is yours.
//
//   yarn scaffold <effect|sprite|action|animation> <name>
//   e.g. yarn scaffold effect wobble

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = join(ROOT, 'src', 'datamodel', 'schema');

const CATEGORIES = {
	effect: { file: 'effects.ts', suffix: 'Effect', fieldCreator: 'EffectFieldCreator', base: null, wrap: true, alwaysQuote: false, exportCreator: false, register: 'registerEffect' },
	action: { file: 'actions.ts', suffix: 'Action', fieldCreator: 'ActionFieldCreator', base: 'BaseActionSchemaCreator', wrap: true, alwaysQuote: true, exportCreator: false, register: 'registerAction' },
	sprite: { file: 'sprites.ts', suffix: 'Sprite', fieldCreator: 'SpriteFieldCreator', base: 'BaseSpriteSchemaCreator', wrap: false, alwaysQuote: true, exportCreator: true, register: 'registerSprite' },
	animation: { file: 'animations.ts', suffix: 'Animation', fieldCreator: 'AnimationFieldCreator', base: 'BaseAnimationModelSchemaCreator', wrap: false, alwaysQuote: false, exportCreator: false, register: 'registerAnimation' },
};

const [category, rawName] = process.argv.slice(2);
if (!category || !rawName || !CATEGORIES[category]) {
	console.error('Usage: yarn scaffold <effect|sprite|action|animation> <name>');
	console.error('  e.g. yarn scaffold effect wobble');
	process.exit(1);
}

const cfg = CATEGORIES[category];
const key = rawName; // discriminator value, used verbatim in `choices` and as the field key
const pascal = rawName.split(/[^a-z0-9]+/i).filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)).join('');
const typeName = pascal + cfg.suffix; // e.g. WobbleEffect
const creator = `${typeName}SchemaCreator`;
const keyLit = (cfg.alwaysQuote || !/^[a-z_$][\w$]*$/i.test(key)) ? `'${key}'` : key;

const filePath = join(SCHEMA_DIR, cfg.file);
const text = readFileSync(filePath, 'utf8');
const sf = ts.createSourceFile(cfg.file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const fnNamed = name => sf.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name);
const typeNamed = name => sf.statements.find(s => ts.isTypeAliasDeclaration(s) && s.name.text === name);

if (fnNamed(creator)) {
	console.error(`${creator} already exists in ${cfg.file}. Aborting.`);
	process.exit(1);
}

// The schema body differs per category: effects/animations declare their own fields, sprites/actions spread a base.
let bodyLines;
if (category === 'effect') {
	bodyLines = [`const fields = foundry.data.fields;`, `return {`, `type: new fields.StringField({ required: true, choices: ['${key}'] }),`, `// TODO: add fields`, `};`];
} else if (category === 'animation') {
	bodyLines = [`const fields = foundry.data.fields;`, `return ${cfg.base}('${key}', new fields.SchemaField({`, `// TODO: add fields`, `}, { required: true }));`];
} else {
	bodyLines = [`const base = ${cfg.base}('${key}');`, `return {`, `...base,`, `// TODO: add fields`, `};`];
}

const block = [
	`${cfg.exportCreator ? 'export function' : 'function'} ${creator}() {`,
	...bodyLines,
	`}`,
	``,
	`export type ${typeName}Create = Create<typeof ${creator}>;`,
	`export type ${typeName}Initialized = Initialized<typeof ${creator}>;`,
	`export type ${typeName} = ${typeName}Create | ${typeName}Initialized;`,
	``,
].join('\n');

// Locate insertion points by AST. Indentation/spacing are intentionally rough here — eslint --fix normalizes them.
const fc = fnNamed(cfg.fieldCreator);
if (!fc?.body) throw new Error(`Could not find function ${cfg.fieldCreator} in ${cfg.file}`);
const ret = fc.body.statements.find(ts.isReturnStatement);
const objLit = ret && ts.isNewExpression(ret.expression) ? ret.expression.arguments?.[0] : undefined;
if (!objLit || !ts.isObjectLiteralExpression(objLit)) throw new Error(`Could not find the ${cfg.fieldCreator} TypedSchemaField object`);

const entry = `\n${keyLit}: ${cfg.wrap ? `new fields.SchemaField(${creator}())` : `${creator}()`},`;

const edits = [
	// New schema block, just before the FieldCreator (getFullStart covers the comment glued above it).
	{ pos: fc.getFullStart(), text: `\n${block}\n` },
	// New entry, just inside the object literal's closing brace.
	{ pos: objLit.getEnd() - 1, text: entry },
];

// Extend each union by appending a member at the end of its type expression (before the `;`).
for (const [name, member] of [[`${cfg.suffix}Initialized`, `${typeName}Initialized`], [`${cfg.suffix}Create`, `${typeName}Create`]]) {
	const alias = typeNamed(name);
	if (!alias) throw new Error(`Could not find union ${name}`);
	edits.push({ pos: alias.type.getEnd(), text: ` | ${member}` });
}

// Apply high-to-low so earlier offsets stay valid.
let out = text;
for (const e of edits.sort((a, b) => b.pos - a.pos)) out = out.slice(0, e.pos) + e.text + out.slice(e.pos);
writeFileSync(filePath, out);

// Format with the project's real lint rules so the result is stable, not hand-indented.
execFileSync('yarn', ['eslint', '--fix', filePath], { cwd: ROOT, stdio: 'inherit' });

const steps = {
	effect: [
		`Replace the TODO in ${creator} with real fields.`,
		`Add the filter (e.g. src/shaders/${key}/) and register it in src/utils/setup.ts:  api.registerEffect('${key}', '<lang key>', builder, { defaults, fields }).`,
		`The registration's \`fields\`/\`defaults\` drive the editor automatically — add the labels under "effectsEditor" in lang/en.json.`,
	],
	animation: [
		`Replace the TODO in ${creator} with real fields.`,
		`Add the transition filter + an instantiate fn, then register in src/utils/setup.ts:  api.registerAnimation('${key}', '<lang key>', instantiateFn, { defaults, fields }).`,
		`Fields/defaults drive the editor — add the labels under "animationEditor" in lang/en.json.`,
	],
	sprite: [
		`Replace the TODO in ${creator} with real fields.`,
		`Add a component in src/svelte/components/ (and a PIXI instantiate fn), then register in src/utils/setup.ts:  api.registerSprite('${key}', '<name>', instantiateFn).`,
		`Add it to the editor: ObjectsPanel.svelte (add menu), spriteFactory.ts (defaults), ObjectTab.svelte (inspector). Add labels in lang/en.json.`,
	],
	action: [
		`Replace the TODO in ${creator} with real fields.`,
		`Handle '${key}' in src/renderer/SplashRuntime.ts (or a processor), then register in src/utils/setup.ts:  api.registerAction('${key}', '<lang key>', processor, { icon, defaults, fields }).`,
		`Fields/defaults drive the ActionEditor — add the labels under "actionEditor" in lang/en.json.`,
	],
}[category];

/* eslint-disable no-console */
console.log(`\n✓ ${typeName} (${category}) added to the data model and formatted.\n`);
console.log('Modified:');
console.log(`  src/datamodel/schema/${cfg.file}   —   ${creator}, the ${cfg.fieldCreator} entry, and the ${cfg.suffix} unions\n`);
console.log(`To finish it as a working ${category}:`);
steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log('\nMigration: not needed — additive changes are filled from each field\'s `initial` when old documents load.');
console.log('  (Renames, removals, or field type changes WOULD need a migration.)');
