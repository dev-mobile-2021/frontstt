import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/sous-traitance/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: parseInt(process.env.PORT || "5173"),
  },
})
