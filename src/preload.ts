import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC } from './shared/types';
import type { VideoCastAPI, CastRequest, AppSettings } from './shared/types';

const api: VideoCastAPI = {
  selectMedia: () => ipcRenderer.invoke(IPC.SELECT_VIDEO),
  selectSubtitle: () => ipcRenderer.invoke(IPC.SELECT_SUBTITLE),
  probeSubtitles: (videoPath: string) => ipcRenderer.invoke(IPC.PROBE_SUBTITLES, videoPath),
  getDevices: () => ipcRenderer.invoke(IPC.GET_DEVICES),
  castMedia: (request: CastRequest) => ipcRenderer.invoke(IPC.CAST_MEDIA, request),
  play: (tabId: string) => ipcRenderer.invoke(IPC.PLAY, tabId),
  pause: (tabId: string) => ipcRenderer.invoke(IPC.PAUSE, tabId),
  seek: (tabId: string, time: number) => ipcRenderer.invoke(IPC.SEEK, tabId, time),
  stop: (tabId: string) => ipcRenderer.invoke(IPC.STOP, tabId),
  setVolume: (tabId: string, level: number) => ipcRenderer.invoke(IPC.SET_VOLUME, tabId, level),
  setSubtitleTrack: (tabId: string, trackId: number | null) => ipcRenderer.invoke(IPC.SET_SUBTITLE_TRACK, tabId, trackId),
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),
  getNetworkInterfaces: () => ipcRenderer.invoke(IPC.GET_NETWORK_INTERFACES),
  readDirectory: (dirPath: string) => ipcRenderer.invoke(IPC.READ_DIRECTORY, dirPath),
  selectFileDirect: (filePath: string) => ipcRenderer.invoke(IPC.SELECT_FILE_DIRECT, filePath),
  getHomePath: () => ipcRenderer.invoke(IPC.GET_HOME_PATH),
  prepareSubtitles: (tabId: string, videoPath: string, subtitleOption: any) => ipcRenderer.invoke(IPC.PREPARE_SUBTITLES, tabId, videoPath, subtitleOption),
  openFolder: (defaultPath?: string) => ipcRenderer.invoke(IPC.OPEN_FOLDER, defaultPath),
  updateTextTrackStyle: (tabId: string, style: any) => ipcRenderer.invoke(IPC.UPDATE_TEXT_TRACK_STYLE, tabId, style),
  setAsDefaultPlayer: () => ipcRenderer.invoke(IPC.SET_DEFAULT_PLAYER),
  closeTabSession: (tabId: string) => ipcRenderer.invoke(IPC.CLOSE_TAB_SESSION, tabId),
  onDevicesUpdated: (callback) => {
    const handler = (_event: any, devices: any) => callback(devices);
    ipcRenderer.on(IPC.DEVICES_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC.DEVICES_UPDATED, handler);
  },
  onCastStatus: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC.CAST_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.CAST_STATUS, handler);
  },
  onCastError: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
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
