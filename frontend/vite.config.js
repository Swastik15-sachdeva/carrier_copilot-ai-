import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/resume': 'http://localhost:8000',
      '/cover-letter': 'http://localhost:8000',
      '/roadmap': 'http://localhost:8000',
      '/interview': 'http://localhost:8000',
      '/mentor': 'http://localhost:8000',
    }
  }
})
