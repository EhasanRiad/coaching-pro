import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
// singlefile: dist/index.html ডাবল-ক্লিক করলেও খুলবে (সার্ভার ছাড়া)
export default defineConfig({ plugins: [react(), viteSingleFile()], base: './' })
