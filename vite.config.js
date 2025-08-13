import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'   // <— NEU

export default defineConfig({
  plugins: [react(), tailwindcss()],          // <— NEU
  server: { open: true }                      // (optional: Browser autoöffnen)
})
