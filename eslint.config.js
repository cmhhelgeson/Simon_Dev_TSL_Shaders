import js from '@eslint/js';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import compat from 'eslint-plugin-compat';
import importX from 'eslint-plugin-import-x';
import html from 'eslint-plugin-html';
import tseslint from 'typescript-eslint';

// MrDoob Code Style, ported from the (unmaintained) eslint-config-mdcs to
// @stylistic — ESLint 10 removed the formatting rules from core.
const mdcs = {
	'@stylistic/array-bracket-spacing': [ 'error', 'always', { singleValue: true, arraysInArrays: false } ],
	'@stylistic/block-spacing': [ 'error', 'always' ],
	'@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true } ],
	'@stylistic/comma-spacing': [ 'error', { before: false, after: true } ],
	'@stylistic/comma-style': [ 'error', 'last' ],
	'@stylistic/computed-property-spacing': [ 'error', 'always' ],
	'@stylistic/eol-last': [ 'error', 'always' ],
	'@stylistic/function-call-spacing': [ 'error', 'never' ],
	'@stylistic/indent': [ 'error', 'tab', { SwitchCase: 1 } ],
	'@stylistic/key-spacing': [ 'error', { beforeColon: false } ],
	'@stylistic/keyword-spacing': [ 'error', { before: true, after: true } ],
	'@stylistic/new-parens': 'error',
	'@stylistic/no-extra-semi': 'warn',
	'@stylistic/no-multi-spaces': 'error',
	'@stylistic/no-trailing-spaces': [ 'error', { skipBlankLines: false } ],
	'@stylistic/no-whitespace-before-property': 'error',
	'@stylistic/object-curly-spacing': [ 'error', 'always' ],
	'@stylistic/padded-blocks': [ 'error', { blocks: 'always', switches: 'always', classes: 'always' } ],
	'@stylistic/padding-line-between-statements': [ 'error', { blankLine: 'always', prev: 'block-like', next: '*' } ],
	'@stylistic/semi': [ 'error', 'always', { omitLastInOneLineBlock: true } ],
	'@stylistic/semi-spacing': [ 'error', { before: false, after: true } ],
	'@stylistic/space-before-blocks': [ 'error', { functions: 'always', keywords: 'always', classes: 'always' } ],
	'@stylistic/space-before-function-paren': [ 'error', { anonymous: 'always', named: 'never', asyncArrow: 'ignore' } ],
	'@stylistic/space-in-parens': [ 'error', 'always' ],
	'@stylistic/space-infix-ops': 'error',
	'@stylistic/space-unary-ops': [ 'error', { words: true, nonwords: true } ],
};

export default tseslint.config(
	{
		ignores: [ 'build/**', 'dist/**', 'libs/**' ],
	},

	js.configs.recommended,
	tseslint.configs.recommended,
	compat.configs[ 'flat/recommended' ],
	importX.flatConfigs.recommended,

	{
		files: [ '**/*.{js,mjs,cjs,ts,mts}' ],
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				THREE: 'readonly',
				__THREE_DEVTOOLS__: 'readonly',
				potpack: 'readonly',
				fflate: 'readonly',
				Stats: 'readonly',
				XRWebGLBinding: 'readonly',
				XRWebGLLayer: 'readonly',
				XRRigidTransform: 'readonly',
				XRMediaBinding: 'readonly',
				GPUShaderStage: 'readonly',
				GPUBufferUsage: 'readonly',
				GPUTextureUsage: 'readonly',
				GPUTexture: 'readonly',
				GPUMapMode: 'readonly',
				QUnit: 'readonly',
				Ammo: 'readonly',
				CodeMirror: 'readonly',
				esprima: 'readonly',
				jsonlint: 'readonly',
				VideoFrame: 'readonly',
			},
		},
		settings: {
			polyfills: [ 'WebGL2RenderingContext' ],
		},
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			...mdcs,
			'no-throw-literal': 'error',
			'no-irregular-whitespace': 'error',
			'prefer-const': [ 'error', { destructuring: 'any', ignoreReadBeforeAssign: false } ],
			'@stylistic/quotes': [ 'error', 'single' ],
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',

			// Vite (aliases, .glsl imports) and TypeScript own module resolution;
			// import-x has no resolver here, so these only produce false positives.
			'import-x/no-unresolved': 'off',
			'import-x/named': 'off',
			'import-x/namespace': 'off',
			'import-x/default': 'off',
			'import-x/no-named-as-default': 'off',
			'import-x/no-named-as-default-member': 'off',
		},
	},

	{
		files: [ '**/*.html' ],
		plugins: { html },
	},
);
