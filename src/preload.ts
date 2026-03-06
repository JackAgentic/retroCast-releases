import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC } from './shared/types';
import type { VideoCastAPI, CastRequest, AppSettings } from './shared/types';

const api: VideoCastAPI = {
  selectMedia: () => ipcRenderer.invoke(IPC.SELECT_VIDEO),
  selectSubtitle: () => ipcRenderer.invoke(IPC.SELECT_SUBTITLE),
  probeSubtitles: (videoPath: string) => ipcRenderer.invoke(IPC.PROBE_SUBTITLES, videoPath),
  getDevices: () => ipcRenderer.invoke(IPC.GET_DEVICES),
  castMedia: (request: CastRequest) => ipcRenderer.invoke(IPC.CAST_MEDIA, request),
  play: () => ipcRenderer.invoke(IPC.PLAY),
  pause: () => ipcRenderer.invoke(IPC.PAUSE),
  seek: (time: number) => ipcRenderer.invoke(IPC.SEEK, time),
  stop: () => ipcRenderer.invoke(IPC.STOP),
  setVolume: (level: number) => ipcRenderer.invoke(IPC.SET_VOLUME, level),
  setSubtitleTrack: (trackId: number | null) => ipcRenderer.invoke(IPC.SET_SUBTITLE_TRACK, trackId),
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),
  getNetworkInterfaces: () => ipcRenderer.invoke(IPC.GET_NETWORK_INTERFACES),
  readDirectory: (dirPath: string) => ipcRenderer.invoke(IPC.READ_DIRECTORY, dirPath),
  selectFileDirect: (filePath: string) => ipcRenderer.invoke(IPC.SELECT_FILE_DIRECT, filePath),
  getHomePath: () => ipcRenderer.invoke(IPC.GET_HOME_PATH),
  prepareSubtitles: (videoPath: string, subtitleOption: any) => ipcRenderer.invoke(IPC.PREPARE_SUBTITLES, videoPath, subtitleOption),
  openFolder: (defaultPath?: string) => ipcRenderer.invoke(IPC.OPEN_FOLDER, defaultPath),
  updateTextTrackStyle: (style: any) => ipcRenderer.invoke(IPC.UPDATE_TEXT_TRACK_STYLE, style),
  setAsDefaultPlayer: () => ipcRenderer.invoke(IPC.SET_DEFAULT_PLAYER),
  onDevicesUpdated: (callback) => {
    const handler = (_event: any, devices: any) => callback(devices);
    ipcRenderer.on(IPC.DEVICES_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC.DEVICES_UPDATED, handler);
  },
  onCastStatus: (callback) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on(IPC.CAST_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.CAST_STATUS, handler);
  },
  onCastError: (callback) => {
    const handler = (_event: any, error: any) => callback(error);
    ipcRenderer.on(IPC.CAST_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.CAST_ERROR, handler);
  },
  onOpenFile: (callback) => {
    const handler = (_event: any, filePath: string) => callback(filePath);
    ipcRenderer.on(IPC.OPEN_FILE, handler);
    return () => ipcRenderer.removeListener(IPC.OPEN_FILE, handler);
  },
};

contextBridge.exposeInMainWorld('videoCast', api);

// Expose webUtils for drag-and-drop file path resolution (File.path removed in Electron 32+)
contextBridge.exposeInMainWorld('electronWebUtils', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
});
