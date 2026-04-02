import { defineConfig } from 'oxlint'

export default defineConfig({
	plugins: ['typescript', 'import'],

	// eslint-plugin-simple-import-sort is used as a JS plugin since oxlint
	// doesn't have a native import-sorting implementation
	jsPlugins: ['eslint-plugin-simple-import-sort'],

	env: {
		browser: true,
		node: true,
		es2025: true,
	},

	rules: {
		'no-console': ['error', { allow: ['warn', 'error'] }],
		'no-debugger': 'error',
		'no-shadow': 'error',
		'no-irregular-whitespace': 'warn',
		'prefer-const': 'warn',
		'no-unused-vars': 'off',
		// SolidJS refs are assigned via JSX `ref={...}` which oxlint doesn't track
		'no-unassigned-vars': 'off',

		'simple-import-sort/exports': 'error',
		'simple-import-sort/imports': [
			'error',
			{
				groups: [
					['^\\u0000'],
					['^@?\\w'],
					['^tools', '^~'],
					['^\\.\\.',  '\\.'],
					['^Types'],
				],
			},
		],

		'typescript/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			},
		],

		'import/no-cycle': 'error',
		'import/no-default-export': 'error',
		'import/first': 'error',
	},

	overrides: [
		{
			files: ['src/**/*.ts', 'src/**/*.tsx'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						patterns: [
							{
								group: ['~/**/*repository*'],
								message: 'Cannot use repository outside of the module. Use module public methods instead',
							},
						],
					},
				],
			},
		},
		{
			files: [
				'src/routes/**/*.tsx',
				'src/app.tsx',
				'src/entry-server.tsx',
				'vite.config.ts',
				'oxlint.config.ts',
			],
			rules: {
				'import/no-default-export': 'off',
			},
		},
		{
			files: ['**/*.test.ts', '**/*.test.tsx'],
			rules: {
				'typescript/ban-ts-comment': 'off',
			},
		},
	],
})
