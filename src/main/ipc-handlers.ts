import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { IPC } from '../shared/types';
import type { CastRequest, ChromecastDevice, AppSettings, SubtitleOption } from '../shared/types';
import { MediaServer } from './media-server';
import { DeviceDiscovery } from './chromecast/discovery';
import { Caster } from './chromecast/caster';
import { probeSubtitles, extractSubtitle } from './subtitles/extractor';
import { convertSrtToVtt } from './subtitles/converter';
import { getLocalIP, getNetworkInterfaces } from './utils/network';
import { SettingsManager } from './settings-manager';

let mediaServer: MediaServer;
let discovery: DeviceDiscovery;
let caster: Caster | null = null;
let devices: ChromecastDevice[] = [];
let settingsManager: SettingsManager;

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows();
  return wins.length > 0 ? wins[0] : null;
}

export async function initializeServices() {
  settingsManager = new SettingsManager();
  const settings = settingsManager.get();

  mediaServer = new MediaServer(settings.customMediaServerPort);
  await mediaServer.start();

  discovery = new DeviceDiscovery((updatedDevices) => {
    devices = updatedDevices;
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.DEVICES_UPDATED, devices);
    }
  });
  discovery.start();
}

export function registerIpcHandlers() {
  ipcMain.handle(IPC.SELECT_VIDEO, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Media File',
      filters: [
        { name: 'Media Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
    };
  });

  ipcMain.handle(IPC.SELECT_SUBTITLE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Subtitle File',
      filters: [
        { name: 'Subtitle Files', extensions: ['srt', 'vtt'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return {
      path: result.filePaths[0],
      name: path.basename(result.filePaths[0]),
    };
  });

  ipcMain.handle(IPC.PROBE_SUBTITLES, async (_event, videoPath: string) => {
    try {
      return await probeSubtitles(videoPath);
    } catch (err) {
      console.error('Probe subtitles error:', err);
      return [];
    }
  });

  ipcMain.handle(IPC.GET_DEVICES, () => {
    return devices;
  });

  ipcMain.handle(IPC.GET_SETTINGS, () => {
    return settingsManager.get();
  });

  ipcMain.handle(IPC.SAVE_SETTINGS, (_event, settings: AppSettings) => {
    settingsManager.save(settings);
  });

  ipcMain.handle(IPC.GET_NETWORK_INTERFACES, () => {
    return getNetworkInterfaces();
  });

  ipcMain.handle(IPC.CAST_MEDIA, async (_event, request: CastRequest) => {
    const win = getMainWindow();
    const settings = settingsManager.get();
    const localIP = getLocalIP(settings.localAddressLock);
    const port = mediaServer.getPort();
    const baseUrl = `http://${localIP}:${port}`;

    // Set video on media server
    mediaServer.setVideo(request.videoPath);
    mediaServer.clearSubtitles();

    // Process subtitles
    const tracks: any[] = [];
    let activeTrackIds: number[] = [];

    if (request.subtitleOption.type !== 'none') {
      const tempDir = path.join(os.tmpdir(), 'videocast-subs');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const vttPath = path.join(tempDir, `sub_${Date.now()}.vtt`);

      if (request.subtitleOption.type === 'embedded') {
        await extractSubtitle(request.videoPath, request.subtitleOption.streamIndex, vttPath);
      } else {
        const vttContent = convertSrtToVtt(request.subtitleOption.path);
        fs.writeFileSync(vttPath, vttContent, 'utf-8');
      }

      mediaServer.setSubtitle(1, vttPath);
      tracks.push({
        trackId: 1,
        type: 'TEXT',
        trackContentId: `${baseUrl}/subtitles/1?t=${Date.now()}`,
        trackContentType: 'text/vtt',
        name: 'Subtitles',
        language: 'en',
        subtype: 'SUBTITLES',
      });
      activeTrackIds = [1];
    }

    // Find device
    const device = devices.find((d) => d.id === request.deviceId);
    if (!device) throw new Error('Device not found');

    // Disconnect existing caster
    if (caster) {
      caster.disconnect();
      caster = null;
    }

    // Create new caster
    caster = new Caster(
      (status) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.CAST_STATUS, status);
        }
      },
      (error) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.CAST_ERROR, error);
        }
      },
    );

    await caster.connect(device.host, device.port);

    const ext = path.extname(request.videoPath).toLowerCase();
    const contentTypes: Record<string, string> = {
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

    const textTrackColorMap: Record<string, string> = {
      white: '#FFFFFFFF', yellow: '#FFFF00FF', cyan: '#00FFFFFF', green: '#00FF00FF',
    };
    const textTrackBgMap: Record<string, string> = {
      opaque: '#000000FF', 'semi-transparent': '#00000080', none: '#00000000',
    };
    const fontScaleMap: Record<string, number> = {
      small: 0.75, medium: 1.0, large: 1.5,
    };

    await caster.load({
      contentUrl: `${baseUrl}/video`,
      contentType: contentTypes[ext] || 'application/octet-stream',
      tracks: tracks.length > 0 ? tracks : undefined,
      activeTrackIds: activeTrackIds.length > 0 ? activeTrackIds : undefined,
      textTrackStyle: {
        foregroundColor: textTrackColorMap[settings.subtitleTextColor] || '#FFFFFFFF',
        backgroundColor: textTrackBgMap[settings.subtitleBackground] || '#00000080',
        fontScale: fontScaleMap[settings.subtitleTextSize] || 1.0,
      },
    });

    if (settings.startMuted) {
      await caster.setVolume(0);
    }
  });

  ipcMain.handle(IPC.PLAY, async () => {
    if (caster) await caster.play();
  });

  ipcMain.handle(IPC.PAUSE, async () => {
    if (caster) await caster.pause();
  });

  ipcMain.handle(IPC.SEEK, async (_event, time: number) => {
    if (caster) await caster.seek(time);
  });

  ipcMain.handle(IPC.STOP, async () => {
    if (caster) {
      await caster.stop();
      caster.disconnect();
      caster = null;
    }
  });

  ipcMain.handle(IPC.SET_VOLUME, async (_event, level: number) => {
    if (caster) await caster.setVolume(level);
    if (settingsManager) settingsManager.updateVolume(level);
  });

  ipcMain.handle(IPC.SET_SUBTITLE_TRACK, async (_event, trackId: number | null) => {
    if (caster) await caster.setSubtitleTrack(trackId);
  });

  const MEDIA_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']);

  ipcMain.handle(IPC.READ_DIRECTORY, async (_event, dirPath: string) => {
    const entries: { name: string; path: string; isDirectory: boolean; size: number }[] = [];
    try {
      const names = fs.readdirSync(dirPath);
      console.log(`[readDir] ${dirPath}: ${names.length} raw entries`);
      for (const name of names) {
        if (name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            entries.push({ name, path: fullPath, isDirectory: true, size: 0 });
          } else {
            const ext = path.extname(name).toLowerCase();
            if (MEDIA_EXTENSIONS.has(ext)) {
              entries.push({ name, path: fullPath, isDirectory: false, size: stat.size });
            }
          }
        } catch (e: any) {
          console.log(`[readDir] stat failed for ${name}: ${e?.message}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to read directory:', dirPath, err?.message || err);
      return { path: dirPath, entries: [], error: err?.message || String(err) };
    }
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { path: dirPath, entries };
  });

  ipcMain.handle(IPC.SELECT_FILE_DIRECT, async (_event, filePath: string) => {
    const stat = fs.statSync(filePath);
    return { path: filePath, name: path.basename(filePath), size: stat.size };
  });

  ipcMain.handle(IPC.GET_HOME_PATH, () => {
    return os.homedir();
  });

  ipcMain.handle(IPC.OPEN_FOLDER, async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Open Folder',
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC.PREPARE_SUBTITLES, async (_event, videoPath: string, subtitleOption: SubtitleOption) => {
    mediaServer.clearSubtitles();
    if (subtitleOption.type === 'none') return null;

    const tempDir = path.join(os.tmpdir(), 'videocast-subs');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const vttPath = path.join(tempDir, `sub_${Date.now()}.vtt`);

    if (subtitleOption.type === 'embedded') {
      await extractSubtitle(videoPath, subtitleOption.streamIndex, vttPath);
    } else {
      const vttContent = convertSrtToVtt(subtitleOption.path);
      fs.writeFileSync(vttPath, vttContent, 'utf-8');
    }

    mediaServer.setSubtitle(1, vttPath);
    const port = mediaServer.getPort();
    return `http://localhost:${port}/subtitles/1?t=${Date.now()}`;
  });

  ipcMain.handle(IPC.UPDATE_TEXT_TRACK_STYLE, async (_event, style: { foregroundColor?: string; backgroundColor?: string; fontScale?: number }) => {
    if (!caster) return;
    await caster.updateTextTrackStyle(style);
  });

  ipcMain.handle(IPC.SET_DEFAULT_PLAYER, async () => {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'Setting default player is only supported on macOS' };
    }

    const bundleId = 'com.retrocast.app';
    const utTypes = [
      // Video
      'public.movie', 'public.video', 'com.apple.quicktime-movie',
      'public.mpeg-4', 'org.matroska.mkv', 'org.webmproject.webm', 'public.avi',
      // Audio
      'public.audio', 'public.mp3', 'com.apple.m4a-audio',
      'org.xiph.flac', 'public.aac-audio', 'org.xiph.ogg-vorbis',
      'com.microsoft.waveform-audio',
    ];

    const extensions = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];

    // First, force-register the app with Launch Services so macOS knows about our UTI declarations
    try {
      execSync('/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f /Applications/RetroCast.app', {
        encoding: 'utf-8',
        timeout: 10000,
      });
    } catch { /* ignore if not installed to /Applications */ }

    // Use ObjC bridge via osascript — sets defaults by both UTType and file extension
    const script = `
ObjC.import("CoreServices");
ObjC.import("Foundation");
var bid = "${bundleId}";
var types = ${JSON.stringify(utTypes)};
var exts = ${JSON.stringify(extensions)};
var failed = [];
for (var i = 0; i < types.length; i++) {
  var s = $.LSSetDefaultRoleHandlerForContentType($(types[i]), 0x0002, $(bid));
  if (s !== 0) failed.push(types[i]);
}
for (var j = 0; j < exts.length; j++) {
  var uti = $.UTTypeCreatePreferredIdentifierForTag($.kUTTagClassFilenameExtension, $(exts[j]), null);
  var utiStr = ObjC.castRefToObject(uti).js;
  $.LSSetDefaultRoleHandlerForContentType($(utiStr), 0x0002, $(bid));
}
if (failed.length === 0) { "OK"; } else { "FAILED:" + failed.join(","); }
`;

    try {
      const result = execSync(`/usr/bin/osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();

      if (result.startsWith('OK')) {
        return { success: true };
      } else {
        return { success: false, error: `Some types could not be set: ${result}` };
      }
    } catch (err: any) {
      console.error('Failed to set default player:', err);
      return { success: false, error: err.message || 'Failed to execute system command' };
    }
  });
}

export function cleanupServices() {
  if (caster) {
    caster.disconnect();
    caster = null;
  }
  if (discovery) discovery.stop();
  if (mediaServer) mediaServer.stop();
}
