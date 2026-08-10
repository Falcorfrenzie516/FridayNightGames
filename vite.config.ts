import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function safePublicCopyPlugin() {
  return {
    name: 'safe-public-copy',
    enforce: 'post' as const,
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');
      const files = fs.readdirSync(publicDir);
      for (const file of files) {
        if (file.includes(' ')) continue;
        const src = path.join(publicDir, file);
        const dest = path.join(distDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch (_) {
          // skip locked files
        }
      }
    },
  };
}

export default defineConfig({
  base: '/FridayNightGames/',
  plugins: [react(), safePublicCopyPlugin()],
  publicDir: false,

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
