import neostandard from 'neostandard'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['out/**', 'release/**', 'node_modules/**', 'APPLICATION_SUPPORT/**', 'temp/**', 'static/**', 'assets/**', 'build/**']
  },
  ...neostandard({ ts: true }),
  ...pluginVue.configs['flat/vue2-recommended'],
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off'
    }
  },
  {
    // Spotify and YouTube payloads are snake_case on the wire and are carried
    // through the store unchanged.
    rules: { camelcase: 'off' }
  },
  {
    files: ['src/main/controllers/Prototype/*.ts'],
    rules: { 'no-extend-native': 'off' }
  },
  {
    files: ['src/@types/**/*.d.ts'],
    rules: {
      'no-var': 'off',
      'no-unused-vars': 'off'
    }
  }
]
