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
import { TabBar } from './components/TabBar';
import { LuminaLogo } from './components/Icons';
import { SettingsProvider, useSettings } from './SettingsContext';
import { applyTheme } from './themes';
import { tabsReducer, tabsInitialState, createTabId } from './appReducer';
import type { TabAction } from './appReducer';
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
  const [state, dispatch] = useReducer(tabsReducer, tabsInitialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { settings, loaded } = useSettings();

  // Active tab helpers
  const activeTab = state.tabs.find(t => t.id === state.activeTabId)!;
  const tabState = activeTab.state;
  const tabId = activeTab.id;

  // Dispatch an action to the active tab
  const dispatchTab = useCallback((action: TabAction) => {
    dispatch({ type: 'TAB_ACTION', payload: { tabId: state.activeTabId, action } });
  }, [state.activeTabId]);

  // Dispatch an action to a specific tab
  const dispatchToTab = useCallback((targetTabId: string, action: TabAction) => {
    dispatch({ type: 'TAB_ACTION', payload: { tabId: targetTabId, action } });
  }, []);

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
    isCasting: tabState.isCasting,
    selectedDeviceId: tabState.selectedDeviceId,
    videoFile: tabState.videoFile,
    settings,
  });

  const { dragOver, dragHandlers } = useDragDrop({
    onVideoSelected: (file) => dispatchTab({ type: 'SET_VIDEO', payload: file }),
    onSubtitlesProbed: (subs) => dispatchTab({ type: 'SET_EMBEDDED_SUBS', payload: subs }),
    onError: (msg) => dispatchTab({ type: 'SET_ERROR', payload: msg }),
    onLoadingChange: (loading) => dispatchTab({ type: 'SET_LOADING', payload: loading }),
  });

  // Keyboard shortcuts for media controls
  const isLocal = tabState.isCasting && tabState.selectedDeviceId === 'local';
  const isChromecast = tabState.isCasting && tabState.selectedDeviceId !== 'local' && !!tabState.castStatus;

  useKeyboardShortcuts(tabState.isCasting, isLocal ? {
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
      tabState.castStatus?.playerState === 'PLAYING' ? api.pause(tabId) : api.play(tabId);
    },
    onSeek: (t) => api.seek(tabId, t),
    onVolumeChange: (v) => { api.setVolume(tabId, v); dispatchTab({ type: 'SET_VOLUME', payload: v }); },
    getCurrentTime: () => tabState.castStatus?.currentTime ?? 0,
    getDuration: () => tabState.castStatus?.duration ?? 0,
    getVolume: () => tabState.volume,
  } : null);

  // Apply theme and persistent volume on settings load, then dismiss boot screen
  useEffect(() => {
    if (loaded) {
      applyTheme(settings.themePreset);
      dispatch({ type: 'BROADCAST_VOLUME', payload: settings.persistentVolume });
      dismissBootScreen();
    }
  }, [loaded]);

  // Auto-connect device when devices are discovered
  useEffect(() => {
    if (loaded && settings.autoConnectDeviceName && tabState.devices.length > 0 && !tabState.isCasting) {
      const match = tabState.devices.find(d => d.name === settings.autoConnectDeviceName);
      if (match && tabState.selectedDeviceId !== match.id) {
        dispatchTab({ type: 'SET_SELECTED_DEVICE', payload: match.id });
      }
    }
  }, [tabState.devices, loaded, settings.autoConnectDeviceName, tabState.isCasting, tabState.selectedDeviceId, dispatchTab]);

  // Subscribe to IPC events
  useEffect(() => {
    const unsubDevices = api.onDevicesUpdated((devices: ChromecastDevice[]) => {
      dispatch({ type: 'BROADCAST_DEVICES', payload: devices });
    });
    const unsubStatus = api.onCastStatus((data: { tabId: string; status: CastStatus }) => {
      dispatchToTab(data.tabId, { type: 'SET_CAST_STATUS', payload: data.status });
    });
    const unsubError = api.onCastError((data: { tabId: string; error: string }) => {
      dispatchToTab(data.tabId, { type: 'SET_ERROR', payload: data.error });
      dispatchToTab(data.tabId, { type: 'SET_CASTING', payload: false });
      dispatchToTab(data.tabId, { type: 'SET_LOADING', payload: false });
    });

    api.getDevices().then((devices: ChromecastDevice[]) => {
      dispatch({ type: 'BROADCAST_DEVICES', payload: devices });
    });

    return () => { unsubDevices(); unsubStatus(); unsubError(); };
  }, [dispatchToTab]);

  const handleFileSelect = useCallback(async (filePath: string) => {
    const file = await api.selectFileDirect(filePath);
    dispatchTab({ type: 'SET_VIDEO', payload: file });
    dispatch({ type: 'SET_TAB_LABEL', payload: { tabId: state.activeTabId, label: file.name } });
    if (file && !isAudioFile(file.name)) {
      dispatchTab({ type: 'SET_LOADING', payload: true });
      try {
        const subs = await api.probeSubtitles(file.path);
        dispatchTab({ type: 'SET_EMBEDDED_SUBS', payload: subs });
      } finally {
        dispatchTab({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [dispatchTab, state.activeTabId]);

  // Listen for files opened via macOS "Open With" / Finder — open in new tab and auto-play
  const handleFileSelectRef = useRef(handleFileSelect);
  handleFileSelectRef.current = handleFileSelect;
  const pendingAutoPlayTabRef = useRef<string | null>(null);

  useEffect(() => {
    return api.onOpenFile((filePath: string) => {
      // Create a new tab for the file
      const newTabId = createTabId();
      dispatch({ type: 'ADD_TAB', payload: { id: newTabId } });
      pendingAutoPlayTabRef.current = newTabId;

      // Select the file in the new tab
      (async () => {
        const file = await api.selectFileDirect(filePath);
        dispatchToTab(newTabId, { type: 'SET_VIDEO', payload: file });
        dispatch({ type: 'SET_TAB_LABEL', payload: { tabId: newTabId, label: file.name } });
        if (file && !isAudioFile(file.name)) {
          try {
            const subs = await api.probeSubtitles(file.path);
            dispatchToTab(newTabId, { type: 'SET_EMBEDDED_SUBS', payload: subs });
          } catch { /* ignore */ }
        }
      })();
    });
  }, [dispatchToTab]);

  // Auto-start local playback when file arrives in a tab from external open
  useEffect(() => {
    const pendingTabId = pendingAutoPlayTabRef.current;
    if (!pendingTabId) return;
    const tab = state.tabs.find(t => t.id === pendingTabId);
    if (!tab || !tab.state.videoFile) return;
    pendingAutoPlayTabRef.current = null;

    (async () => {
      dispatchToTab(pendingTabId, { type: 'SET_LOADING', payload: true });
      try {
        const url = await api.prepareSubtitles(pendingTabId, tab.state.videoFile!.path, { type: 'none' });
        // Only set subtitle URL if this is the active tab
        if (pendingTabId === state.activeTabId) {
          setSubtitleTrackUrl(url);
        }
        dispatchToTab(pendingTabId, { type: 'SET_SELECTED_DEVICE', payload: 'local' });
        dispatchToTab(pendingTabId, { type: 'SET_CASTING', payload: true });
      } finally {
        dispatchToTab(pendingTabId, { type: 'SET_LOADING', payload: false });
      }
    })();
  }, [state.tabs, state.activeTabId, dispatchToTab]);

  const handleExternalSubSelect = useCallback(async () => {
    const file = await api.selectSubtitle();
    if (file) {
      dispatchTab({ type: 'SET_EXTERNAL_SUB', payload: file });
      dispatchTab({ type: 'SET_SUBTITLE_OPTION', payload: { type: 'external', path: file.path } });
    }
  }, [dispatchTab]);

  const handleCast = useCallback(async () => {
    if (!tabState.videoFile || !tabState.selectedDeviceId) return;
    dispatchTab({ type: 'SET_LOADING', payload: true });
    dispatchTab({ type: 'SET_ERROR', payload: null });

    if (tabState.selectedDeviceId === 'local') {
      const url = await api.prepareSubtitles(tabId, tabState.videoFile.path, tabState.subtitleOption);
      setSubtitleTrackUrl(url);
      dispatchTab({ type: 'SET_CASTING', payload: true });
      dispatchTab({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      await api.castMedia({
        tabId,
        videoPath: tabState.videoFile.path,
        subtitleOption: tabState.subtitleOption,
        deviceId: tabState.selectedDeviceId,
      });
      dispatchTab({ type: 'SET_CASTING', payload: true });
    } catch (err: any) {
      dispatchTab({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
    } finally {
      dispatchTab({ type: 'SET_LOADING', payload: false });
    }
  }, [tabState.videoFile, tabState.selectedDeviceId, tabState.subtitleOption, tabId, dispatchTab]);

  const handleStop = useCallback(async () => {
    if (tabState.selectedDeviceId !== 'local') {
      try { await api.stop(tabId); } catch (e) { /* ignore */ }
    }
    if (document.fullscreenElement) document.exitFullscreen();
    dispatchTab({ type: 'SET_CASTING', payload: false });
    dispatchTab({ type: 'SET_CAST_STATUS', payload: null });
    setSubtitleTrackUrl(null);
    setTheaterMode(false);
  }, [tabState.selectedDeviceId, tabId, dispatchTab]);

  const handleDeviceSwitch = useCallback(async (newDeviceId: string | null) => {
    if (!newDeviceId || !tabState.isCasting || newDeviceId === tabState.selectedDeviceId) {
      dispatchTab({ type: 'SET_SELECTED_DEVICE', payload: newDeviceId });
      return;
    }

    if (tabState.selectedDeviceId !== 'local') {
      try { await api.stop(tabId); } catch (e) { /* ignore */ }
    }

    dispatchTab({ type: 'SET_SELECTED_DEVICE', payload: newDeviceId });
    dispatchTab({ type: 'SET_CAST_STATUS', payload: null });

    if (newDeviceId === 'local' || !tabState.videoFile) return;

    dispatchTab({ type: 'SET_LOADING', payload: true });
    dispatchTab({ type: 'SET_ERROR', payload: null });
    try {
      await api.castMedia({
        tabId,
        videoPath: tabState.videoFile.path,
        subtitleOption: tabState.subtitleOption,
        deviceId: newDeviceId,
      });
    } catch (err: any) {
      dispatchTab({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
      dispatchTab({ type: 'SET_CASTING', payload: false });
    } finally {
      dispatchTab({ type: 'SET_LOADING', payload: false });
    }
  }, [tabState.isCasting, tabState.selectedDeviceId, tabState.videoFile, tabState.subtitleOption, tabId, dispatchTab]);

  // Prepare subtitles for local playback, or re-cast for Chromecast when subtitle changes
  const prevSubtitleRef = useRef(tabState.subtitleOption);
  useEffect(() => {
    const prev = prevSubtitleRef.current;
    prevSubtitleRef.current = tabState.subtitleOption;

    if (!tabState.isCasting || !tabState.videoFile) return;
    if (prev === tabState.subtitleOption) return;

    if (tabState.selectedDeviceId === 'local') {
      api.prepareSubtitles(tabId, tabState.videoFile.path, tabState.subtitleOption).then((url: string | null) => {
        setSubtitleTrackUrl(url);
      });
    } else if (tabState.selectedDeviceId) {
      (async () => {
        try { await api.stop(tabId); } catch (e) { /* ignore */ }
        dispatchTab({ type: 'SET_LOADING', payload: true });
        try {
          await api.castMedia({
            tabId,
            videoPath: tabState.videoFile!.path,
            subtitleOption: tabState.subtitleOption,
            deviceId: tabState.selectedDeviceId!,
          });
        } catch (err: any) {
          dispatchTab({ type: 'SET_ERROR', payload: err.message || 'Failed to cast' });
        } finally {
          dispatchTab({ type: 'SET_LOADING', payload: false });
        }
      })();
    }
  }, [tabState.subtitleOption, tabState.isCasting, tabState.selectedDeviceId, tabState.videoFile, tabId, dispatchTab]);

  // Hotswap subtitle appearance on Chromecast when settings change during casting
  const prevSubStyleRef = useRef({ size: settings.subtitleTextSize, color: settings.subtitleTextColor, bg: settings.subtitleBackground, font: settings.subtitleFont });
  useEffect(() => {
    const prev = prevSubStyleRef.current;
    prevSubStyleRef.current = { size: settings.subtitleTextSize, color: settings.subtitleTextColor, bg: settings.subtitleBackground, font: settings.subtitleFont };
    if (!tabState.isCasting || tabState.selectedDeviceId === 'local' || !tabState.selectedDeviceId) return;
    if (prev.size === settings.subtitleTextSize && prev.color === settings.subtitleTextColor && prev.bg === settings.subtitleBackground && prev.font === settings.subtitleFont) return;

    const colorMap: Record<string, string> = { white: '#FFFFFFFF', yellow: '#FFFF00FF', cyan: '#00FFFFFF', green: '#00FF00FF' };
    const bgMap: Record<string, string> = { opaque: '#000000FF', 'semi-transparent': '#00000080', none: '#00000000' };
    const scaleMap: Record<string, number> = { small: 0.75, medium: 1.0, large: 1.5 };

    api.updateTextTrackStyle(tabId, {
      foregroundColor: colorMap[settings.subtitleTextColor] || '#FFFFFFFF',
      backgroundColor: bgMap[settings.subtitleBackground] || '#00000080',
      fontScale: scaleMap[settings.subtitleTextSize] || 1.0,
      fontFamily: settings.subtitleFont,
    }).catch(() => { /* ignore if not connected */ });
  }, [settings.subtitleTextSize, settings.subtitleTextColor, settings.subtitleBackground, settings.subtitleFont, tabState.isCasting, tabState.selectedDeviceId, tabId]);

  // Tab management
  const handleAddTab = useCallback(() => {
    dispatch({ type: 'ADD_TAB' });
  }, []);

  const handleCloseTab = useCallback(async (closingTabId: string) => {
    // Clean up cast session for the closing tab
    const tab = state.tabs.find(t => t.id === closingTabId);
    if (tab?.state.isCasting && tab.state.selectedDeviceId !== 'local') {
      try { await api.stop(closingTabId); } catch { /* ignore */ }
    }
    api.closeTabSession(closingTabId).catch(() => { /* ignore */ });
    dispatch({ type: 'CLOSE_TAB', payload: closingTabId });
  }, [state.tabs]);

  // Pause local playback when switching away from a tab
  const prevActiveTabRef = useRef(state.activeTabId);
  const handleSelectTab = useCallback((newTabId: string) => {
    if (newTabId === state.activeTabId) return;

    // Pause local playback on the tab we're leaving
    const prevTab = state.tabs.find(t => t.id === state.activeTabId);
    if (prevTab?.state.isCasting && prevTab.state.selectedDeviceId === 'local' && videoRef.current) {
      videoRef.current.pause();
    }

    prevActiveTabRef.current = state.activeTabId;
    dispatch({ type: 'SET_ACTIVE_TAB', payload: newTabId });

    // Reset local playback state for new tab
    setSubtitleTrackUrl(null);
    setTheaterMode(false);
  }, [state.activeTabId, state.tabs]);

  // When active tab changes, restore subtitle URL for local playback
  useEffect(() => {
    if (tabState.isCasting && tabState.selectedDeviceId === 'local' && tabState.videoFile) {
      api.prepareSubtitles(tabId, tabState.videoFile.path, tabState.subtitleOption).then((url: string | null) => {
        setSubtitleTrackUrl(url);
      });
    }
  }, [state.activeTabId]);

  const fileIsAudio = tabState.videoFile ? isAudioFile(tabState.videoFile.name) : false;
  const canCast = !!tabState.videoFile && !!tabState.selectedDeviceId && !tabState.isCasting && !tabState.isLoading;

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
            {tabState.isCasting ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className={`status-dot ${tabState.isCasting ? 'connected' : 'disconnected'}`} />
            {tabState.isCasting
              ? tabState.selectedDeviceId === 'local'
                ? 'Playing Locally'
                : `Casting to ${tabState.devices.find(d => d.id === tabState.selectedDeviceId)?.name || 'device'}`
              : 'Ready'}
          </span>
          {tabState.videoFile && (
            <div className="header-marquee">
              <span className="header-marquee-text">{tabState.videoFile.name}</span>
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

      <TabBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
      />

      <div className="content">
        <div className={`main-selectors${tabState.isCasting ? ' casting' : ''}${tabState.isCasting && tabState.selectedDeviceId === 'local' ? ' local-playback' : ''}`}>
          {!(tabState.isCasting && tabState.selectedDeviceId === 'local') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, overflowY: 'auto' }}>
              {tabState.isCasting ? (
                <>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <SubtitleSelector
                      embeddedSubtitles={tabState.embeddedSubtitles}
                      externalSubtitle={tabState.externalSubtitle}
                      subtitleOption={tabState.subtitleOption}
                      onOptionChange={(opt) => dispatchTab({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
                      onExternalSelect={handleExternalSubSelect}
                      disabled={!tabState.videoFile}
                    />
                  </div>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <DeviceList
                      devices={tabState.devices}
                      selectedId={tabState.selectedDeviceId}
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
                  selectedFile={tabState.videoFile}
                  onSelect={handleFileSelect}
                  onClear={() => {
                    dispatchTab({ type: 'SET_VIDEO', payload: null });
                    dispatch({ type: 'SET_TAB_LABEL', payload: { tabId, label: 'New Tab' } });
                  }}
                  initialPath={activeTab.browserPath}
                  onPathChange={(p) => dispatch({ type: 'SET_TAB_BROWSER_PATH', payload: { tabId, path: p } })}
                />
              )}
            </div>
          )}

          {!tabState.isCasting ? (
            <div className="side-panels">
              <DeviceList
                devices={tabState.devices}
                selectedId={tabState.selectedDeviceId}
                onSelect={(id) => dispatchTab({ type: 'SET_SELECTED_DEVICE', payload: id })}
              />
              {!fileIsAudio && (
                <SubtitleSelector
                  embeddedSubtitles={tabState.embeddedSubtitles}
                  externalSubtitle={tabState.externalSubtitle}
                  subtitleOption={tabState.subtitleOption}
                  onOptionChange={(opt) => dispatchTab({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
                  onExternalSelect={handleExternalSubSelect}
                  disabled={!tabState.videoFile}
                />
              )}
            </div>
          ) : (
            <CastingView
              videoFile={tabState.videoFile}
              selectedDeviceId={tabState.selectedDeviceId}
              devices={tabState.devices}
              embeddedSubtitles={tabState.embeddedSubtitles}
              externalSubtitle={tabState.externalSubtitle}
              subtitleOption={tabState.subtitleOption}
              isLoading={tabState.isLoading}
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
              onSubtitleOptionChange={(opt) => dispatchTab({ type: 'SET_SUBTITLE_OPTION', payload: opt })}
              onSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>

        {tabState.error && (
          <div className="error-toast">
            <div className="error-toast-header">
              <AlertCircle size={14} />
              <span>ERROR</span>
              <button className="error-toast-close" onClick={() => dispatchTab({ type: 'SET_ERROR', payload: null })}>x</button>
            </div>
            <div className="error-toast-body">{tabState.error}</div>
          </div>
        )}

        {!tabState.isCasting && (
          <button className="cast-btn" disabled={!canCast} onClick={handleCast}>
            {tabState.selectedDeviceId === 'local' ? (
              <Play size={18} style={{ marginRight: '10px', verticalAlign: 'middle', marginTop: '-3px' }} fill="currentColor" />
            ) : (
              <Cast size={18} style={{ marginRight: '10px', verticalAlign: 'middle', marginTop: '-3px' }} />
            )}
            {tabState.isLoading
              ? (tabState.selectedDeviceId === 'local' ? 'Loading...' : 'Connecting...')
              : !tabState.videoFile
                ? 'Select a Video to Start'
                : !tabState.selectedDeviceId
                  ? 'Select a Device to Start'
                  : (tabState.selectedDeviceId === 'local' ? 'Start Playing' : 'Start Casting')}
          </button>
        )}
      </div>

      {tabState.isCasting && tabState.selectedDeviceId !== 'local' && tabState.castStatus && (
        <PlayerControls
          status={{ ...tabState.castStatus, volume: tabState.volume }}
          onPlay={() => api.play(tabId)}
          onPause={() => api.pause(tabId)}
          onSeek={(t: number) => api.seek(tabId, t)}
          onVolumeChange={(v: number) => {
            api.setVolume(tabId, v);
            dispatchTab({ type: 'SET_VOLUME', payload: v });
          }}
          onStop={handleStop}
        />
      )}

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        devices={tabState.devices}
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
