import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

import eslint from '@eslint/js'

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'release/**',
      'node_modules/**',
      'APPLICATION_SUPPORT/**',
      'temp/**',
      'backend/**',
      'build/**',
      'assets/**',
      'static/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-restricted-syntax': ['error', 'ConditionalExpression']
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['interface'],
          format: ['PascalCase']
        },
        {
          selector: ['typeAlias'],
          format: ['PascalCase']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase']
        },
        {
          selector: 'variable',
          types: ['function'],
          format: ['camelCase', 'PascalCase']
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          types: ['array', 'string', 'number', 'boolean'],
          format: ['UPPER_CASE', 'PascalCase']
        }
      ]
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'vue/no-restricted-syntax': ['error', 'ConditionalExpression']
    }
  },
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      'prettier/prettier': 'error'
    }
  }
)
