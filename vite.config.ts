import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig({
  plugins: [
    inspectAttr(), 
    react()
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
