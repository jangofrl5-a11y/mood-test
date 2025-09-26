import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the build works when deployed under
  // a subpath or when the host doesn't serve from the domain root.
  // This prevents /assets/... absolute URLs which often 404 on hosted platforms.
  base: './',
  plugins: [react()],
})
