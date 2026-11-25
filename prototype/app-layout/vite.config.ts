import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PROTOTYPE (throwaway): app layout variants for "Prototype the app layout on desktop & phone".
export default defineConfig({ plugins: [react(), tailwindcss()] })
