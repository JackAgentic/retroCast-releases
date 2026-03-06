import { useState, useEffect, useCallback, useRef } from 'react';
import type { CastStatus } from '../../shared/types';

interface UseLocalPlaybackParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  subtitleTrackUrl: string | null;
  isCasting: boolean;
  selectedDeviceId: string | null;
  videoFile: any;
  settings: {
    subtitleTextSize: string;
    subtitleTextColor: string;
    subtitleBackground: string;
    subtitleFont: string;
  };
}

export function useLocalPlayback({
  videoRef,
  videoContainerRef,
  subtitleTrackUrl,
  isCasting,
  selectedDeviceId,
  videoFile,
  settings,
}: UseLocalPlaybackParams) {
  const [localStatus, setLocalStatus] = useState<CastStatus | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [subtitlesModalOpen, setSubtitlesModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anyModalOpen = subtitlesModalOpen || targetModalOpen;

  // Activate/deactivate subtitle tracks on the local video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = subtitleTrackUrl ? 'showing' : 'disabled';
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [subtitleTrackUrl]);

  // Apply subtitle appearance settings via a dynamic ::cue stylesheet
  useEffect(() => {
    const sizeMap: Record<string, string> = { small: '16px', medium: '24px', large: '36px' };
    const colorMap: Record<string, string> = { white: '#ffffff', yellow: '#ffff00', cyan: '#00ffff', green: '#00ff00' };
    const bgMap: Record<string, string> = { opaque: 'rgba(0,0,0,1)', 'semi-transparent': 'rgba(0,0,0,0.5)', none: 'transparent' };

    const styleId = 'subtitle-cue-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      video::cue {
        font-size: ${sizeMap[settings.subtitleTextSize] || '24px'};
        color: ${colorMap[settings.subtitleTextColor] || '#ffffff'};
        background-color: ${bgMap[settings.subtitleBackground] || 'rgba(0,0,0,0.5)'};
        font-family: ${settings.subtitleFont}, sans-serif;
      }
    `;
  }, [settings.subtitleTextSize, settings.subtitleTextColor, settings.subtitleBackground, settings.subtitleFont]);

  // Sync local <video> element state into localStatus for PlayerControls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      setLocalStatus(null);
      return;
    }

    const update = () => {
      setLocalStatus({
        playerState: video.paused ? 'PAUSED' : 'PLAYING',
        currentTime: video.currentTime,
        duration: video.duration || 0,
        volume: video.volume,
        isMuted: video.muted,
      });
    };

    const onEnded = () => {
      setLocalStatus((prev) => prev ? { ...prev, playerState: 'IDLE' } : null);
    };

    video.addEventListener('timeupdate', update);
    video.addEventListener('play', update);
    video.addEventListener('pause', update);
    video.addEventListener('volumechange', update);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('ended', onEnded);

    if (video.readyState >= 1) update();

    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('play', update);
      video.removeEventListener('pause', update);
      video.removeEventListener('volumechange', update);
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('ended', onEnded);
    };
  }, [isCasting, selectedDeviceId, videoFile]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  // Sync fullscreen state from browser events
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Auto-hide controls in fullscreen after mouse idle
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (document.fullscreenElement) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    if (anyModalOpen) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [isFullscreen, anyModalOpen]);

  return {
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
  };
}
