import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import compat from 'eslint-plugin-compat'
export default [
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  { files: ['web/src/**/*.{ts,svelte}'], ...compat.configs['flat/recommended'] },
  { files: ['**/*.svelte', '**/*.svelte.ts'], languageOptions: { parserOptions: { parser: tseslint.parser } } },
  { rules: { '@typescript-eslint/no-explicit-any': 'off', 'svelte/no-at-html-tags': 'off' } },
]
