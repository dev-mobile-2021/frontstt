import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/sous-traitance/',
    plugins: [
      tailwindcss(),
      react(),
    ],
    build: {
      emptyOutDir: true,
    },
    server: {
      port: parseInt(process.env.PORT || "5173"),
    },
  }
})
