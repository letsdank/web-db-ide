import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            'public/**',
            'bootstrap/**',
            'storage/**',
            'vendor/**',
            'node_modules/**',
            'coverage/**',
            'dist/**',
        ],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ['resources/js/**/*.ts', 'resources/js/**/*.tsx', 'vite.config.ts', 'vitest.config.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', {prefer: 'type-imports'}],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-misused-promises': [
                'error',
                {
                    checksVoidReturn: {
                        attributes: false,
                    },
                },
            ],
        },
    },

    {
        files: ['resources/js/**/*.test.ts', 'resources/js/**/*.test.tsx'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
