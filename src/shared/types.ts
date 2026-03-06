export const IPC = {
  SELECT_VIDEO: 'select-video',
  SELECT_SUBTITLE: 'select-subtitle',
  PROBE_SUBTITLES: 'probe-subtitles',
  GET_DEVICES: 'get-devices',
  CONNECT_DEVICE: 'connect-device',
  DISCONNECT_DEVICE: 'disconnect-device',
  CAST_MEDIA: 'cast-media',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  STOP: 'stop',
  SET_VOLUME: 'set-volume',
  SET_SUBTITLE_TRACK: 'set-subtitle-track',
  DEVICES_UPDATED: 'devices-updated',
  CAST_STATUS: 'cast-status',
  CAST_ERROR: 'cast-error',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_NETWORK_INTERFACES: 'get-network-interfaces',
  READ_DIRECTORY: 'read-directory',
  SELECT_FILE_DIRECT: 'select-file-direct',
  GET_HOME_PATH: 'get-home-path',
  PREPARE_SUBTITLES: 'prepare-subtitles',
  OPEN_FOLDER: 'open-folder',
  UPDATE_TEXT_TRACK_STYLE: 'update-text-track-style',
  OPEN_FILE: 'open-file',
  SET_DEFAULT_PLAYER: 'set-default-player',
  CLOSE_TAB_SESSION: 'close-tab-session',
} as const;

export interface ChromecastDevice {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface EmbeddedSubtitle {
  streamIndex: number;
  language: string;
  title: string;
  codec: string;
}

export interface MediaFile {
  path: string;
  name: string;
  size: number;
}

export interface SubtitleFile {
  path: string;
  name: string;
}

export type SubtitleOption =
  | { type: 'none' }
  | { type: 'embedded'; streamIndex: number }
  | { type: 'external'; path: string };

export interface CastRequest {
  tabId: string;
  videoPath: string;
  subtitleOption: SubtitleOption;
  deviceId: string;
}

export type PlayerState = 'IDLE' | 'BUFFERING' | 'PLAYING' | 'PAUSED';

export interface CastStatus {
  playerState: PlayerState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export type SubtitleTextSize = 'small' | 'medium' | 'large';
export type SubtitleTextColor = 'white' | 'yellow' | 'cyan' | 'green';
export type SubtitleBackground = 'opaque' | 'semi-transparent' | 'none';
export type ThemePreset = 'classic-white' | 'terminal-green' | 'cyberpunk-amber' | 'synthwave-magenta' | 'rainbow-arcade' | 'neon-cycle';

export interface AppSettings {
  autoConnectDeviceName: string | null;
  startMuted: boolean;
  persistentVolume: number;
  bufferTimeSec: number;
  subtitleTextSize: SubtitleTextSize;
  subtitleTextColor: SubtitleTextColor;
  subtitleBackground: SubtitleBackground;
  customMediaServerPort: number | null;
  localAddressLock: string | null;
  themePreset: ThemePreset;
  disableFakePreview: boolean;
  subtitleFont: string;
}

export interface NetworkInterface {
  name: string;
  address: string;
  label: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoConnectDeviceName: null,
  startMuted: false,
  persistentVolume: 1,
  bufferTimeSec: 5,
  subtitleTextSize: 'medium',
  subtitleTextColor: 'white',
  subtitleBackground: 'semi-transparent',
  customMediaServerPort: null,
  localAddressLock: null,
  themePreset: 'classic-white',
  disableFakePreview: false,
  subtitleFont: 'VT323',
};

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export interface DirectoryContents {
  path: string;
  entries: FileEntry[];
  error?: string;
}

export interface VideoCastAPI {
  selectMedia: () => Promise<MediaFile | null>;
  selectSubtitle: () => Promise<SubtitleFile | null>;
  probeSubtitles: (videoPath: string) => Promise<EmbeddedSubtitle[]>;
  getDevices: () => Promise<ChromecastDevice[]>;
  castMedia: (request: CastRequest) => Promise<void>;
  play: (tabId: string) => Promise<void>;
  pause: (tabId: string) => Promise<void>;
  seek: (tabId: string, time: number) => Promise<void>;
  stop: (tabId: string) => Promise<void>;
  setVolume: (tabId: string, level: number) => Promise<void>;
  setSubtitleTrack: (tabId: string, trackId: number | null) => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  getNetworkInterfaces: () => Promise<NetworkInterface[]>;
  readDirectory: (dirPath: string) => Promise<DirectoryContents>;
  selectFileDirect: (filePath: string) => Promise<MediaFile>;
  onOpenFile: (callback: (filePath: string) => void) => () => void;
  getHomePath: () => Promise<string>;
  prepareSubtitles: (tabId: string, videoPath: string, subtitleOption: SubtitleOption) => Promise<string | null>;
  openFolder: (defaultPath?: string) => Promise<string | null>;
  updateTextTrackStyle: (tabId: string, style: { foregroundColor?: string; backgroundColor?: string; fontScale?: number; fontFamily?: string }) => Promise<void>;
  setAsDefaultPlayer: () => Promise<{ success: boolean; error?: string }>;
  closeTabSession: (tabId: string) => Promise<void>;
  onDevicesUpdated: (callback: (devices: ChromecastDevice[]) => void) => () => void;
  onCastStatus: (callback: (data: { tabId: string; status: CastStatus }) => void) => () => void;
  onCastError: (callback: (data: { tabId: string; error: string }) => void) => () => void;
}
