import type { ChromecastDevice, EmbeddedSubtitle, MediaFile, SubtitleFile, CastStatus, SubtitleOption } from '../shared/types';

export interface AppState {
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
}

export type Action =
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
  | { type: 'SET_ERROR'; payload: string | null };

export function reducer(state: AppState, action: Action): AppState {
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
    default:
      return state;
  }
}

export const initialState: AppState = {
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
};
