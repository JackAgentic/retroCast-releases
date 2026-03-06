import { useEffect, useRef } from 'react';

interface KeyboardShortcutActions {
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen?: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
}

export function useKeyboardShortcuts(
  active: boolean,
  actions: KeyboardShortcutActions | null,
) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!active || !actions) return;

    const handler = (e: KeyboardEvent) => {
      const a = actionsRef.current;
      if (!a) return;

      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          a.onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          a.onSeek(Math.max(0, a.getCurrentTime() - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          a.onSeek(Math.min(a.getDuration(), a.getCurrentTime() + 30));
          break;
        case 'ArrowUp':
          e.preventDefault();
          a.onVolumeChange(Math.min(1, a.getVolume() + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          a.onVolumeChange(Math.max(0, a.getVolume() - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          a.onVolumeChange(a.getVolume() === 0 ? 0.5 : 0);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          a.onToggleFullscreen?.();
          break;
        case 'Escape':
          // Let browser handle Escape for exiting fullscreen
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active]);
}
