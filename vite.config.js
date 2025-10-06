import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve as pathResolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the build works when deployed under
  // a subpath or when the host doesn't serve from the domain root.
  // This prevents /assets/... absolute URLs which often 404 on hosted platforms.
  base: './',
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: [
      { find: '@chakra-ui/react', replacement: pathResolve(__dirname, 'node_modules', '@chakra-ui', 'react') },
      { find: '@emotion/react', replacement: pathResolve(__dirname, 'node_modules', '@emotion', 'react') },
      { find: '@emotion/styled', replacement: pathResolve(__dirname, 'node_modules', '@emotion', 'styled') },
    ]
  },
})
