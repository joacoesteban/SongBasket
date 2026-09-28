import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

import vue from '@vitejs/plugin-vue2'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        electron: resolve(__dirname, 'src/renderer/shims/electron.ts'),
        '@electron/remote': resolve(
          __dirname,
          'src/renderer/shims/electron-remote.ts'
        )
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    optimizeDeps: {
      exclude: ['electron', '@electron/remote']
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [vue()]
  }
})
