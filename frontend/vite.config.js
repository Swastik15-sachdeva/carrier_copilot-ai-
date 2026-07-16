import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/resume': 'http://127.0.0.1:8000',
      '/cover-letter': 'http://127.0.0.1:8000',
      '/roadmap': 'http://127.0.0.1:8000',
      '/interview': 'http://127.0.0.1:8000',
      '/mentor': 'http://127.0.0.1:8000',
    }
  }
})
