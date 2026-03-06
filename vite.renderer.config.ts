import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Remove crossorigin attributes from HTML tags - they break file:// loading in packaged Electron
function removeCrossOriginPlugin(): Plugin {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  plugins: [removeCrossOriginPlugin()],
});
