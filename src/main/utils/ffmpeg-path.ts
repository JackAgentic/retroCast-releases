import path from 'node:path';
import { app } from 'electron';

function getResourcePath(name: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, name);
  }
  // In development, use node_modules
  return path.join(__dirname, '..', '..', 'node_modules', name);
}

export function getFfmpegPath(): string {
  if (app.isPackaged) {
    return getResourcePath('ffmpeg');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffmpeg-static') as string;
}

export function getFfprobePath(): string {
  if (app.isPackaged) {
    return getResourcePath(path.join('bin', process.platform, process.arch, 'ffprobe'));
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffprobe-static').path as string;
}
