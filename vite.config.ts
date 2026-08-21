import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from the root of the newprder.run custom domain, not from a
  // /newprder/ project path.
  base: '/',
  plugins: [react()],
});
