import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dataFiles from './vite-plugin-data';

export default defineConfig({
  plugins: [react(), dataFiles()],
  server: { port: 5174, host: true },
});
