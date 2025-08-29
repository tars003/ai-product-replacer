import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd } from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // FIX: Replaced global `process.cwd()` with an explicit import `cwd` from `node:process`
  // to ensure correct TypeScript types are available and resolve the error
  // "Property 'cwd' does not exist on type 'Process'".
  const env = loadEnv(mode, cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
