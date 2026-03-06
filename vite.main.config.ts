import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Plugin } from 'vite';

function copyProtoPlugin(): Plugin {
  return {
    name: 'copy-proto',
    closeBundle() {
      const src = resolve(__dirname, 'node_modules/castv2/lib/cast_channel.proto');
      const dest = resolve(__dirname, '.vite/build/cast_channel.proto');
      const destDir = dirname(dest);
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'ffmpeg-static',
        'ffprobe-static',
      ],
    },
  },
  plugins: [copyProtoPlugin()],
});
