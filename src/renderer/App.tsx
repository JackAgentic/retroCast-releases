import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { Cast, Square, Wifi, WifiOff, AlertCircle, Settings, Play, Moon, Sun, Film } from 'lucide-react';
import type { ChromecastDevice, CastStatus } from '../shared/types';
import { FileBrowser } from './components/FileBrowser';
import { DeviceList } from './components/DeviceList';
import { SubtitleSelector } from './components/SubtitleSelector';
import { PlayerControls } from './components/PlayerControls';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CastingView } from './components/CastingView';
import { LuminaLogo } from './components/Icons';
import { SettingsProvider, useSettings } from './SettingsContext';
import { applyTheme } from './themes';
import { reducer, initialState } from './appReducer';
import { useDragDrop } from './hooks/useDragDrop';
import { useLocalPlayback } from './hooks/useLocalPlayback';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const api = (window as any).videoCast;
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']);
function isAudioFile(name: string): boolean {
  return AUDIO_EXTS.has(name.substring(name.lastIndexOf('.')).toLowerCase());
}

// Dismiss the boot screen from index.html (minimum 2.5s visible)
const bootShownAt = Date.now();
function dismissBootScreen() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  const elapsed = Date.now() - bootShownAt;
  const minVisible = 2500;
  const delay = Math.max(0, minVisible - elapsed);
  setTimeout(() => {
    boot.classList.add('fade-out');
    setTimeout(() => boot.remove(), 500);
  }, delay);
}

function AppInner() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [browserPath, setBrowserPath] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { settings, loaded } = useSettings();

  const {
    localStatus,
    isFullscreen,
    controlsVisible,
    subtitlesModalOpen,
    setSubtitlesModalOpen,
    targetModalOpen,
    setTargetModalOpen,
    anyModalOpen,
    toggleFullscreen,
    resetHideTimer,
  } = useLocalPlayback({
    videoRef,
    videoContainerRef,
    subtitleTrackUrl,
    isCasting: state.isCasting,
    selectedDeviceId: state.selectedDeviceId,
    videoFile: state.videoFile,
    settings,
  });

  const { dragOver, dragHandlers } = useDragDrop({
    onVideoSelected: (file) => dispatch({ type: 'SET_VIDEO', payload: file }),
    onSubtitlesProbed: (subs) => dispatch({ type: 'SET_EMBEDDED_SUBS', payload: subs }),
    onError: (msg) => dispatch({ type: 'SET_ERROR', payload: msg }),
    onLoadingChange: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
  });

  // Keyboard shortcuts for media controls
  const isLocal = state.isCasting && state.selectedDeviceId === 'local';
  const isChromecast = state.isCasting && state.selectedDeviceId !== 'local' && !!state.castStatus;

  useKeyboardShortcuts(state.isCasting, isLocal ? {
    onPlayPause: () => {
      const v = videoRef.current;
      if (!v) return;
      v.paused ? v.play() : v.pause();
    },
    onSeek: (t) => { if (videoRef.current) videoRef.current.currentTime = t; },
    onVolumeChange: (v) => { if (videoRef.current) videoRef.current.volume = v; },
    onToggleFullscreen: toggleFullscreen,
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    getDuration: () => videoRef.current?.duration ?? 0,
    getVolume: () => videoRef.current?.volume ?? 1,
  } : isChromecast ? {
    onPlayPause: () => {
      state.castStatus?.playerState === 'PLAYING' ? api.pause() : api.play();
    },
    onSeek: (t) => api.seek(t),
    onVolumeChange: (v) => { api.setVolume(v); dispatch({ type: 'SET_VOLUME', payload: v }); },
    getCurrentTime: () => state.castStatus?.currentTime ?? 0,
    getDuration: () => state.castStatus?.duration ?? 0,
    getVolume: () => state.volume,
  } : null);

  // Apply theme and persistent volume on settings load, then dismiss boot screen
  useEffect(() => {
    if (loaded) {
      applyTheme(settings.themePreset);
      dispatch({ type: 'SET_VOLUME', payload: settings.persistentVolume });
      dismissBootScreen();
    }
  }, [loaded]);

  // Auto-connect device when devices are discovered
  useEffect(() => {
    if (loaded && settings.autoConnectDeviceName && state.devices.length > 0 && !state.isCasting) {
      const match = state.devices.find(d => d.name === settings.autoConnectDeviceName);
      if (match && state.selectedDeviceId !== match.id) {
        dispatch({ type: 'SET_SELECTED_DEVICE', payload: match.id });
      }
    }
  }, [state.devices, loaded, settings.autoConnectDeviceName, state.isCasting, state.selectedDeviceId]);

  useEffect(() => {
    const unsubDevices = api.onDevicesUpdated((devices: ChromecastDevice[]) => {
      dispatch({ type: 'SET_DEVICES', payload: devices });
    });
    const unsubStatus = api.onCastStatus((status: CastStatus) => {
      dispatch({ type: 'SET_CAST_STATUS', payload: status });
    });
    const unsubError = api.onCastError((error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
      dispatch({ type: 'SET_CASTING', payload: false });
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    api.getDevices().then((devices: ChromecastDevice[]) => {
      dispatch({ type: 'SET_DEVICES', payload: devices });
    });

    return () => { unsubDevices(); unsubStatus(); unsubError(); };
  }, []);

  const handleFileSelect = useCallback(async (filePath: string) => {
    const file = await api.selectFileDirect(filePath);
    dispatch({ type: 'SET_VIDEO', payload: file });
    if (file && !isAudioFile(file.name)) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const subs = await api.probeSubtitles(file.path);
        dispatch({ type: 'SET_EMBEDDED_SUBS', payload: subs });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, []);

  // Listen for files opened via macOS "Open With" / Finder — auto-play locally
  const handleFileSelectRef = useRef(handleFileSelect);
  handleFileSelectRef.current = handleFileSelect;
  const pendingAutoPlayPath = useRef<string | null>(null);

  useEffect(() => {
    return api.onOpenFile((filePath: string) => {
      pendingAutoPlayPath.current = filePath;
      handleFileSelectRef.current(filePath);
    });
  }, []);

  // Auto-start local playback when file arrives from external open
  useEffect(() => {
    if (!pendingAutoPlayPath.current || !state.videoFile) return;
    if (state.videoFile.path !== pendingAutoPlayPath.current) return;
    pendingAutoPlayPath.current = null;

    // Stop any current playback
    if (state.isCasting) {
      if (state.selectedDeviceId !== 'local') {
        api.stop().catch(() => { /* ignore */ });
      }
      dispatch({ type: 'SET_CASTING', payload: false });
      dispatch({ type: 'SET_CAST_STATUS', payload: null });
      setSubtitleTrackUrl(null);
    }

    // Select local device and start playback
    if (state.selectedDeviceId !== 'local') {
      dispatch({ type: 'SET_SELECTED_DEVICE', payload: 'local' });
    }
    (async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const url = await api.prepareSubtitles(state.videoFile!.path, { type: 'none' });
        setSubtitleTrackUrl(url);
        dispatch({ type: 'SET_CASTING', payload: true });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, [state.videoFile]);

  const handleExternalSubSelect = useCallback(async () => {
    const file = await api.selectSubtitle();
    if (file) {
      dispatch({ type: 'SET_EXTERNAL_SUB', payload: file });
      dispatch({ type: 'SET_SUBTITLE_OPTION', payload: { type: 'external', path: file.path } });
    }
  }, []);

  const handleCast = useCallback(async () => {
    if (!state.videoFile || !state.selectedDeviceId) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    if (state.selectedDeviceId === 'local') {
      const url = await api.prepareSubtitles(state.videoFile.path, state.subtitleOption);
      setSubtitleTrackUrl(url);
      dispatch({ type: 'SET_CASTING', payload: true });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      await api.castMedia({
        videoPath: state.videoFile.path,
        subtitleOption: state.subtitleOption,
        deviceId: state.selectedDeviceId,
      });
      dispatch({ type: 'SET_CASTING', payload: true });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.videoFile, state.selectedDeviceId, state.subtitleOption]);

  const handleStop = useCallback(async () => {
    if (state.selectedDeviceId !== 'local') {
      try { await api.stop(); } catch (e) { /* ignore */ }
    }
    if (document.fullscreenElement) document.exitFullscreen();
    dispatch({ type: 'SET_CASTING', payload: false });
    dispatch({ type: 'SET_CAST_STATUS', payload: null });
    setSubtitleTrackUrl(null);
    setTheaterMode(false);
  }, [state.selectedDeviceId]);

  const handleDeviceSwitch = useCallback(async (newDeviceId: string | null) => {
    if (!newDeviceId || !state.isCasting || newDeviceId === state.selectedDeviceId) {
      dispatch({ type: 'SET_SELECTED_DEVICE', payload: newDeviceId });
      return;
    }

    if (state.selectedDeviceId !== 'local') {
      try { await api.stop(); } catch (e) { /* ignore */ }
    }

    dispatch({ type: 'SET_SELECTED_DEVICE', payload: newDeviceId });
    dispatch({ type: 'SET_CAST_STATUS', payload: null });

    if (newDeviceId === 'local' || !state.videoFile) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await api.castMedia({
        videoPath: state.videoFile.path,
        subtitleOption: state.subtitleOption,
        deviceId: newDeviceId,
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
      dispatch({ type: 'SET_CASTING', payload: false });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.isCasting, state.selectedDeviceId, state.videoFile, state.subtitleOption]);

  // Prepare subtitles for local playback, or re-cast for Chromecast when subtitle changes
  const prevSubtitleRef = useRef(state.subtitleOption);
  useEffect(() => {
    const prev = prevSubtitleRef.current;
    prevSubtitleRef.current = state.subtitleOption;

    if (!state.isCasting || !state.videoFile) return;
    if (prev === state.subtitleOption) return;

    if (state.selectedDeviceId === 'local') {
      api.prepareSubtitles(state.videoFile.path, state.subtitleOption).then((url: string | null) => {
        setSubtitleTrackUrl(url);
      });
    } else if (state.selectedDeviceId) {
      (async () => {
        try { await api.stop(); } catch (e) { /* ignore */ }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          await api.castMedia({
            videoPath: state.videoFile!.path,
            subtitleOption: state.subtitleOption,
            deviceId: state.selectedDeviceId!,
          });
        } catch (err: any) {
          dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      })();
    }
  }, [state.subtitleOption, state.isCasting, state.selectedDeviceId, state.videoFile]);

  // Hotswap subtitle appearance on Chromecast when settings change during casting
  const prevSubStyleRef = useRef({ size: settings.subtitleTextSize, color: settings.subtitleTextColor, bg: settings.subtitleBackground, font: settings.subtitleFont });
  useEffect(() => {
    const prev = prevSubStyleRef.current;
    prevSubStyleRef.current = { size: settings.subtitleTextSize, color: settings.subtitleTextColor, bg: settings.subtitleBackground, font: settings.subtitleFont };
    if (!state.isCasting || state.selectedDeviceId === 'local' || !state.selectedDeviceId) return;
    if (prev.size === settings.subtitleTextSize && prev.color === settings.subtitleTextColor && prev.bg === settings.subtitleBackground && prev.font === settings.subtitleFont) return;

    const colorMap: Record<string, string> = { white: '#FFFFFFFF', yellow: '#FFFF00FF', cyan: '#00FFFFFF', green: '#00FF00FF' };
    const bgMap: Record<string, string> = { opaque: '#000000FF', 'semi-transparent': '#00000080', none: '#00000000' };
    const scaleMap: Record<string, number> = { small: 0.75, medium: 1.0, large: 1.5 };

    api.updateTextTrackStyle({
      foregroundColor: colorMap[settings.subtitleTextColor] || '#FFFFFFFF',
      backgroundColor: bgMap[settings.subtitleBackground] || '#00000080',
      fontScale: scaleMap[settings.subtitleTextSize] || 1.0,
      fontFamily: settings.subtitleFont,
    }).catch(() => { /* ignore if not connected */ });
  }, [settings.subtitleTextSize, settings.subtitleTextColor, settings.subtitleBackground, settings.subtitleFont, state.isCasting, state.selectedDeviceId]);

  const fileIsAudio = state.videoFile ? isAudioFile(state.videoFile.name) : false;
  const canCast = !!state.videoFile && !!state.selectedDeviceId && !state.isCasting && !state.isLoading;

  return (
    <div className="app" {...dragHandlers}>
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-zone">
            <Film size={48} />
            <span>Drop media file here</span>
            <span className="drop-zone-formats">.mp4 .mkv .webm .avi .mov .mp3 .wav .flac .m4a</span>
          </div>
        </div>
      )}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <LuminaLogo size={32} />
          <h1>RetroCast</h1>
        </div>
        <div className="header-status">
          <span className="header-status-info">
            {state.isCasting ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className={`status-dot ${state.isCasting ? 'connected' : 'disconnected'}`} />
            {state.isCasting
              ? state.selectedDeviceId === 'local'
                ? 'Playing Locally'
                : `Casting to ${state.devices.find(d => d.id === state.selectedDeviceId)?.name || 'device'}`
              : 'Ready'}
          </span>
          {state.videoFile && (
            <div className="header-marquee">
              <span className="header-marquee-text">{state.videoFile.name}</span>
            </div>
          )}
        </div>
        <button
          className="ctrl-btn"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{ padding: '4px 8px', zIndex: 2, position: 'relative', flexShrink: 0 }}
        >
          <Settings size={18} />
        </button>
      </header>

      <div className="content">
        <div className={`main-selectors${state.isCasting ? ' casting' : ''}${state.isCasting && state.selectedDeviceId === 'local' ? ' local-playback' : ''}`}>
          {!(state.isCasting && state.selectedDeviceId === 'local') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, overflowY: 'auto' }}>
              {state.isCasting ? (
                <>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <SubtitleSelector
                      embeddedSubtitles={state.embeddedSubtitles}
                      externalSubtitle={state.externalSubtitle}
                      subtitleOption={state.subtitleOption}
                      onOptionChange={(opt) => dispatch({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
                      onExternalSelect={handleExternalSubSelect}
                      disabled={!state.videoFile}
                    />
                  </div>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <DeviceList
                      devices={state.devices}
                      selectedId={state.selectedDeviceId}
                      onSelect={handleDeviceSwitch}
                    />
                  </div>
                  <button className="cast-btn" onClick={handleStop} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                    <Square size={18} style={{ marginRight: '10px' }} fill="currentColor" />
                    Stop Casting
                  </button>
                  <button className="cast-btn" onClick={() => setTheaterMode(true)} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                    <Moon size={18} style={{ marginRight: '10px' }} />
                    Theater Mode
                  </button>
                </>
              ) : (
                <FileBrowser
                  selectedFile={state.videoFile}
                  onSelect={handleFileSelect}
                  onClear={() => dispatch({ type: 'SET_VIDEO', payload: null })}
                  initialPath={browserPath}
                  onPathChange={setBrowserPath}
                />
              )}
            </div>
          )}

          {!state.isCasting ? (
            <div className="side-panels">
              <DeviceList
                devices={state.devices}
                selectedId={state.selectedDeviceId}
                onSelect={(id) => dispatch({ type: 'SET_SELECTED_DEVICE', payload: id })}
              />
              {!fileIsAudio && (
                <SubtitleSelector
                  embeddedSubtitles={state.embeddedSubtitles}
                  externalSubtitle={state.externalSubtitle}
                  subtitleOption={state.subtitleOption}
                  onOptionChange={(opt) => dispatch({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
                  onExternalSelect={handleExternalSubSelect}
                  disabled={!state.videoFile}
                />
              )}
            </div>
          ) : (
            <CastingView
              videoFile={state.videoFile}
              selectedDeviceId={state.selectedDeviceId}
              devices={state.devices}
              embeddedSubtitles={state.embeddedSubtitles}
              externalSubtitle={state.externalSubtitle}
              subtitleOption={state.subtitleOption}
              isLoading={state.isLoading}
              disableFakePreview={settings.disableFakePreview}
              isAudio={fileIsAudio}
              videoRef={videoRef}
              videoContainerRef={videoContainerRef}
              subtitleTrackUrl={subtitleTrackUrl}
              localStatus={localStatus}
              isFullscreen={isFullscreen}
              controlsVisible={controlsVisible}
              subtitlesModalOpen={subtitlesModalOpen}
              setSubtitlesModalOpen={setSubtitlesModalOpen}
              targetModalOpen={targetModalOpen}
              setTargetModalOpen={setTargetModalOpen}
              anyModalOpen={anyModalOpen}
              resetHideTimer={resetHideTimer}
              toggleFullscreen={toggleFullscreen}
              onStop={handleStop}
              onExternalSubSelect={handleExternalSubSelect}
              onDeviceSwitch={handleDeviceSwitch}
              onSubtitleOptionChange={(opt) => dispatch({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
              onSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>

        {state.error && (
          <div className="error-toast">
            <div className="error-toast-header">
              <AlertCircle size={14} />
              <span>ERROR</span>
              <button className="error-toast-close" onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}>x</button>
            </div>
            <div className="error-toast-body">{state.error}</div>
          </div>
        )}

        {!state.isCasting && (
          <button className="cast-btn" disabled={!canCast} onClick={handleCast}>
            {state.selectedDeviceId === 'local' ? (
              <Play size={18} style={{ marginRight: '10px', verticalAlign: 'middle', marginTop: '-3px' }} fill="currentColor" />
            ) : (
              <Cast size={18} style={{ marginRight: '10px', verticalAlign: 'middle', marginTop: '-3px' }} />
            )}
            {state.isLoading
              ? (state.selectedDeviceId === 'local' ? 'Loading...' : 'Connecting...')
              : !state.videoFile
                ? 'Select a Video to Start'
                : !state.selectedDeviceId
                  ? 'Select a Device to Start'
                  : (state.selectedDeviceId === 'local' ? 'Start Playing' : 'Start Casting')}
          </button>
        )}
      </div>

      {state.isCasting && state.selectedDeviceId !== 'local' && state.castStatus && (
        <PlayerControls
          status={{ ...state.castStatus, volume: state.volume }}
          onPlay={() => api.play()}
          onPause={() => api.pause()}
          onSeek={(t: number) => api.seek(t)}
          onVolumeChange={(v: number) => {
            api.setVolume(v);
            dispatch({ type: 'SET_VOLUME', payload: v });
          }}
          onStop={handleStop}
        />
      )}

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        devices={state.devices}
      />

      {theaterMode && (
        <div className="dark-mode-overlay" onClick={() => setTheaterMode(false)}>
          <Sun size={48} />
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppInner />
      </SettingsProvider>
    </ErrorBoundary>
  );
}
