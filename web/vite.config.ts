import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sessionEndpoint } from './server/sessionEndpoint.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sessionEndpoint()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
	  sourcemap: "hidden",
	  outDir: "build",
	  rolldownOptions: {
	    input: ['index.html', 'client.html'],
	  },
  }
})
