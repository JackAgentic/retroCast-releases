import { useState, useCallback, useEffect, useRef } from 'react';
import type { VideoFile, EmbeddedSubtitle } from '../../shared/types';

const api = (window as any).videoCast;
const VIDEO_EXTS = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];

interface UseDragDropCallbacks {
  onVideoSelected: (file: VideoFile) => void;
  onSubtitlesProbed: (subs: EmbeddedSubtitle[]) => void;
  onError: (msg: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function useDragDrop(callbacks: UseDragDropCallbacks) {
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // Prevent Electron's default file navigation
  useEffect(() => {
    const preventNav = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('dragover', preventNav);
    document.addEventListener('drop', preventNav);
    return () => {
      document.removeEventListener('dragover', preventNav);
      document.removeEventListener('drop', preventNav);
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const electronWebUtils = (window as any).electronWebUtils;
    const filePath: string | undefined = electronWebUtils?.getPathForFile(file);
    if (!filePath) {
      cbRef.current.onError('Could not resolve file path');
      return;
    }

    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    if (!VIDEO_EXTS.includes(ext)) {
      cbRef.current.onError(`Unsupported file type: ${ext}`);
      return;
    }

    const videoFile: VideoFile = {
      path: filePath,
      name: file.name,
      size: file.size,
    };
    cbRef.current.onVideoSelected(videoFile);
    cbRef.current.onLoadingChange(true);
    api.probeSubtitles(filePath)
      .then((subs: EmbeddedSubtitle[]) => cbRef.current.onSubtitlesProbed(subs))
      .catch(() => { })
      .finally(() => cbRef.current.onLoadingChange(false));
  }, []);

  return {
    dragOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
