import { Client, DefaultMediaReceiver } from 'castv2-client';
import type { CastStatus } from '../../shared/types';

interface CastTrack {
  trackId: number;
  type: string;
  trackContentId: string;
  trackContentType: string;
  name: string;
  language: string;
  subtype: string;
}

interface TextTrackStyle {
  foregroundColor?: string;
  backgroundColor?: string;
  fontScale?: number;
  fontFamily?: string;
}

interface LoadOptions {
  contentUrl: string;
  contentType: string;
  tracks?: CastTrack[];
  activeTrackIds?: number[];
  textTrackStyle?: TextTrackStyle;
}

export class Caster {
  private client: Client | null = null;
  private player: any = null;
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private onStatus: (status: CastStatus) => void;
  private onError: (error: string) => void;

  constructor(
    onStatus: (status: CastStatus) => void,
    onError: (error: string) => void,
  ) {
    this.onStatus = onStatus;
    this.onError = onError;
  }

  async connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();
      this.client.on('error', (err: Error) => {
        this.onError(`Connection error: ${err.message}`);
        this.cleanup();
      });
      this.client.connect({ host, port }, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async load(options: LoadOptions): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      this.client!.launch(DefaultMediaReceiver, (err: Error | null, player: any) => {
        if (err) return reject(err);
        this.player = player;

        player.on('status', (status: any) => {
          this.emitStatus(status);
        });

        const media: any = {
          contentId: options.contentUrl,
          contentType: options.contentType,
          streamType: 'BUFFERED',
        };

        if (options.tracks && options.tracks.length > 0) {
          media.tracks = options.tracks;
        }
        if (options.textTrackStyle) {
          media.textTrackStyle = options.textTrackStyle;
        }

        const loadOpts: any = { autoplay: true };
        if (options.activeTrackIds && options.activeTrackIds.length > 0) {
          loadOpts.activeTrackIds = options.activeTrackIds;
        }

        player.load(media, loadOpts, (err: Error | null) => {
          if (err) return reject(err);
          this.startStatusPolling();
          resolve();
        });
      });
    });
  }

  async play(): Promise<void> {
    return this.playerCommand('play');
  }

  async pause(): Promise<void> {
    return this.playerCommand('pause');
  }

  async stop(): Promise<void> {
    this.stopStatusPolling();
    return this.playerCommand('stop');
  }

  async seek(currentTime: number): Promise<void> {
    if (!this.player) return;
    return new Promise((resolve, reject) => {
      this.player.seek(currentTime, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async setVolume(level: number): Promise<void> {
    if (!this.client) return;
    return new Promise((resolve, reject) => {
      this.client!.setVolume({ level: Math.max(0, Math.min(1, level)) }, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async setSubtitleTrack(trackId: number | null): Promise<void> {
    if (!this.player) return;
    return new Promise((resolve, reject) => {
      const activeTrackIds = trackId !== null ? [trackId] : [];
      (this.player as any).media.sessionRequest(
        {
          type: 'EDIT_TRACKS_INFO',
          activeTrackIds,
        },
        (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  async updateTextTrackStyle(style: TextTrackStyle): Promise<void> {
    if (!this.player) return;
    return new Promise((resolve, reject) => {
      (this.player as any).media.sessionRequest(
        {
          type: 'EDIT_TRACKS_INFO',
          textTrackStyle: style,
        },
        (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  disconnect() {
    this.cleanup();
  }

  private async playerCommand(command: string): Promise<void> {
    if (!this.player) return;
    return new Promise((resolve, reject) => {
      this.player[command]((err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private emitStatus(status: any) {
    if (!status) return;
    this.onStatus({
      playerState: status.playerState || 'IDLE',
      currentTime: status.currentTime || 0,
      duration: status.media?.duration || 0,
      volume: status.volume?.level ?? 1,
      isMuted: status.volume?.muted ?? false,
    });
  }

  private startStatusPolling() {
    this.stopStatusPolling();
    this.statusInterval = setInterval(() => {
      if (!this.player) return;
      this.player.getStatus((err: Error | null, status: any) => {
        if (!err && status) this.emitStatus(status);
      });
    }, 1000);
  }

  private stopStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private cleanup() {
    this.stopStatusPolling();
    if (this.client) {
      try { this.client.close(); } catch { /* ignore */ }
      this.client = null;
    }
    this.player = null;
  }
}
