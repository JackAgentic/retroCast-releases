/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import type { VideoCastAPI } from './src/shared/types';

declare global {
  interface Window {
    videoCast: VideoCastAPI;
  }
}
