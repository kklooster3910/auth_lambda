// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
    {
        files: ['**/*.js'],
        extends: [
            eslint.configs.recommended,
            prettierConfig,
        ],
        plugins: { prettier },
        rules: {
            'prettier/prettier': 'error',
        },
    },
]);
