import type { ChromecastDevice, EmbeddedSubtitle, MediaFile, SubtitleFile, CastStatus, SubtitleOption } from '../shared/types';

// --- Per-tab state (formerly AppState) ---

export interface TabState {
  videoFile: MediaFile | null;
  embeddedSubtitles: EmbeddedSubtitle[];
  externalSubtitle: SubtitleFile | null;
  subtitleOption: SubtitleOption;
  devices: ChromecastDevice[];
  selectedDeviceId: string | null;
  isCasting: boolean;
  isLoading: boolean;
  castStatus: CastStatus | null;
  volume: number;
  error: string | null;
  savedCurrentTime: number;
}

export type TabAction =
  | { type: 'SET_VIDEO'; payload: MediaFile | null }
  | { type: 'SET_EMBEDDED_SUBS'; payload: EmbeddedSubtitle[] }
  | { type: 'SET_EXTERNAL_SUB'; payload: SubtitleFile | null }
  | { type: 'SET_SUBTITLE_OPTION'; payload: SubtitleOption }
  | { type: 'SET_DEVICES'; payload: ChromecastDevice[] }
  | { type: 'SET_SELECTED_DEVICE'; payload: string | null }
  | { type: 'SET_CASTING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CAST_STATUS'; payload: CastStatus | null }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SAVE_CURRENT_TIME'; payload: number };

export function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'SET_VIDEO':
      return { ...state, videoFile: action.payload, embeddedSubtitles: [], subtitleOption: { type: 'none' }, error: null };
    case 'SET_EMBEDDED_SUBS':
      return { ...state, embeddedSubtitles: action.payload };
    case 'SET_EXTERNAL_SUB':
      return { ...state, externalSubtitle: action.payload };
    case 'SET_SUBTITLE_OPTION':
      return { ...state, subtitleOption: action.payload };
    case 'SET_DEVICES': {
      let newSelectedId = state.selectedDeviceId;
      if (newSelectedId && newSelectedId !== 'local' && !action.payload.find(d => d.id === newSelectedId)) {
        newSelectedId = 'local';
      }
      return { ...state, devices: action.payload, selectedDeviceId: newSelectedId };
    }
    case 'SET_SELECTED_DEVICE':
      return { ...state, selectedDeviceId: action.payload };
    case 'SET_CASTING':
      return { ...state, isCasting: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CAST_STATUS':
      return { ...state, castStatus: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SAVE_CURRENT_TIME':
      return { ...state, savedCurrentTime: action.payload };
    default:
      return state;
  }
}

export const tabInitialState: TabState = {
  videoFile: null,
  embeddedSubtitles: [],
  externalSubtitle: null,
  subtitleOption: { type: 'none' },
  devices: [],
  selectedDeviceId: 'local',
  isCasting: false,
  isLoading: false,
  castStatus: null,
  volume: 1,
  error: null,
  savedCurrentTime: 0,
};

// --- Top-level tabs state ---

export interface Tab {
  id: string;
  label: string;
  state: TabState;
  browserPath: string;
}

export interface TabsState {
  tabs: Tab[];
  activeTabId: string;
}

let tabCounter = 0;
export function createTabId(): string {
  return `tab-${++tabCounter}-${Date.now()}`;
}

function createTab(id?: string): Tab {
  const tabId = id || createTabId();
  return {
    id: tabId,
    label: 'New Tab',
    state: { ...tabInitialState },
    browserPath: '',
  };
}

export type TabsAction =
  | { type: 'ADD_TAB'; payload?: { id?: string } }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_TAB_LABEL'; payload: { tabId: string; label: string } }
  | { type: 'SET_TAB_BROWSER_PATH'; payload: { tabId: string; path: string } }
  | { type: 'TAB_ACTION'; payload: { tabId: string; action: TabAction } }
  | { type: 'BROADCAST_DEVICES'; payload: ChromecastDevice[] }
  | { type: 'BROADCAST_VOLUME'; payload: number };

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'ADD_TAB': {
      const tab = createTab(action.payload?.id);
      // Copy devices from existing tab so new tab sees discovered devices
      if (state.tabs.length > 0) {
        tab.state.devices = state.tabs[0].state.devices;
      }
      return {
        ...state,
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      };
    }
    case 'CLOSE_TAB': {
      if (state.tabs.length <= 1) return state;
      const idx = state.tabs.findIndex(t => t.id === action.payload);
      if (idx === -1) return state;
      const newTabs = state.tabs.filter(t => t.id !== action.payload);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === action.payload) {
        // Activate adjacent tab
        const newIdx = Math.min(idx, newTabs.length - 1);
        newActiveId = newTabs[newIdx].id;
      }
      return { ...state, tabs: newTabs, activeTabId: newActiveId };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.payload };
    case 'SET_TAB_LABEL':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.payload.tabId ? { ...t, label: action.payload.label } : t
        ),
      };
    case 'SET_TAB_BROWSER_PATH':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.payload.tabId ? { ...t, browserPath: action.payload.path } : t
        ),
      };
    case 'TAB_ACTION':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.payload.tabId
            ? { ...t, state: tabReducer(t.state, action.payload.action) }
            : t
        ),
      };
    case 'BROADCAST_DEVICES':
      return {
        ...state,
        tabs: state.tabs.map(t => ({
          ...t,
          state: tabReducer(t.state, { type: 'SET_DEVICES', payload: action.payload }),
        })),
      };
    case 'BROADCAST_VOLUME':
      return {
        ...state,
        tabs: state.tabs.map(t => ({
          ...t,
          state: tabReducer(t.state, { type: 'SET_VOLUME', payload: action.payload }),
        })),
      };
    default:
      return state;
  }
}

const defaultTab = createTab();
export const tabsInitialState: TabsState = {
  tabs: [defaultTab],
  activeTabId: defaultTab.id,
};
