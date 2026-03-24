// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Local ESLint rules specific to this project.
 * When this grows to 4+ rules, extract each rule into eslint-rules/<name>.mjs
 * and import them here. If rules need to be shared with apps/web, promote to
 * packages/eslint-plugin-farm.
 */
const localPlugin = {
  rules: {
    /**
     * Flags direct assignment to global.fetch or globalThis.fetch in test files.
     *
     * Direct assignment bypasses Jest's mock tracking: jest.clearAllMocks() does
     * NOT restore global variable assignments. Always capture the original value
     * in beforeEach and restore it in afterEach:
     *
     *   let originalFetch: typeof globalThis.fetch;
     *   beforeEach(() => { originalFetch = globalThis.fetch; });
     *   afterEach(() => { globalThis.fetch = originalFetch; });
     *
     *   // inside the test:
     *   globalThis.fetch = jest.fn().mockResolvedValue({ ... }) as typeof fetch;
     */
    'no-global-fetch-assignment': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Disallow direct assignment to global.fetch / globalThis.fetch in test files without a capture-and-restore guard.',
        },
        messages: {
          noGlobalFetchAssignment:
            'Direct assignment to {{name}}.fetch leaks into subsequent tests because jest.clearAllMocks() does not restore global variable assignments. ' +
            'Capture the original in beforeEach and restore it in afterEach.',
        },
        schema: [],
      },
      create(context) {
        return {
          AssignmentExpression(node) {
            const left = node.left;
            // Skip restore assignments (right-hand side is a plain identifier,
            // e.g. `globalThis.fetch = originalFetch` in afterEach).
            if (node.right.type === 'Identifier') return;

            if (
              left.type === 'MemberExpression' &&
              left.property.type === 'Identifier' &&
              left.property.name === 'fetch' &&
              left.object.type === 'Identifier' &&
              (left.object.name === 'global' || left.object.name === 'globalThis')
            ) {
              context.report({
                node,
                messageId: 'noGlobalFetchAssignment',
                data: { name: left.object.name },
              });
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'web/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    plugins: { local: localPlugin },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'local/no-global-fetch-assignment': 'warn',
    },
  },
);
