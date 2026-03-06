import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
};

export class MediaServer {
  private app: express.Application;
  private server: Server | null = null;
  private videoPaths: Map<string, string> = new Map();
  private subtitleFiles: Map<string, Map<number, string>> = new Map();
  private port = 0;
  private requestedPort: number;

  constructor(port?: number | null) {
    this.app = express();
    this.requestedPort = port && port > 0 ? port : 0;
    this.setupCors();
    this.setupRoutes();
  }

  private setupCors() {
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });
  }

  private setupRoutes() {
    this.app.get('/sessions/:tabId/video', (req, res) => {
      const videoPath = this.videoPaths.get(req.params.tabId);
      if (!videoPath || !fs.existsSync(videoPath)) {
        res.status(404).send('No video loaded');
        return;
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const ext = path.extname(videoPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const stream = fs.createReadStream(videoPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(videoPath).pipe(res);
      }
    });

    this.app.get('/sessions/:tabId/subtitles/:trackId', (req, res) => {
      const tabSubs = this.subtitleFiles.get(req.params.tabId);
      const trackId = parseInt(req.params.trackId, 10);
      const vttPath = tabSubs?.get(trackId);
      if (!vttPath || !fs.existsSync(vttPath)) {
        res.status(404).send('Subtitle track not found');
        return;
      }
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      fs.createReadStream(vttPath).pipe(res);
    });
  }

  setVideo(tabId: string, videoPath: string) {
    this.videoPaths.set(tabId, videoPath);
  }

  setSubtitle(tabId: string, trackId: number, vttPath: string) {
    if (!this.subtitleFiles.has(tabId)) {
      this.subtitleFiles.set(tabId, new Map());
    }
    this.subtitleFiles.get(tabId)!.set(trackId, vttPath);
  }

  clearSubtitles(tabId: string) {
    this.subtitleFiles.delete(tabId);
  }

  clearSession(tabId: string) {
    this.videoPaths.delete(tabId);
    this.subtitleFiles.delete(tabId);
  }

  getPort(): number {
    return this.port;
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.requestedPort, '0.0.0.0', () => {
        const addr = this.server!.address();
        this.port = typeof addr === 'object' && addr ? addr.port : 0;
        console.log(`Media server listening on port ${this.port}`);
        resolve(this.port);
      });
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && this.requestedPort !== 0) {
          console.warn(`Port ${this.requestedPort} in use, falling back to random port`);
          this.server = this.app.listen(0, '0.0.0.0', () => {
            const addr = this.server!.address();
            this.port = typeof addr === 'object' && addr ? addr.port : 0;
            console.log(`Media server listening on fallback port ${this.port}`);
            resolve(this.port);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
