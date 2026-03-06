import { useState, useCallback } from 'react';
import type { MediaFile } from '../../shared/types';
import { PixelFileVideo, PixelCheck, PixelUpload } from './Icons';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface Props {
  videoFile: MediaFile | null;
  onSelect: () => void;
}

export function FileSelector({ videoFile, onSelect }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Electron exposes the path on dropped files
    const file = e.dataTransfer.files[0];
    if (file && (file as any).path) {
      // For drag and drop, trigger the select flow
      onSelect();
    }
  }, [onSelect]);

  return (
    <div
      className={`file-selector ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onSelect}
    >
      {videoFile ? (
        <>
          <div className="icon-wrapper success">
            <PixelCheck size={48} />
          </div>
          <div className="file-info">{videoFile.name}</div>
          <div className="file-size">{formatSize(videoFile.size)}</div>
          <button className="browse-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            Change Video
          </button>
        </>
      ) : (
        <>
          <div className="icon-wrapper">
            <PixelFileVideo size={48} className="pulse-icon" />
          </div>
          <div className="label">Drop a video here or click to browse</div>
          <button className="browse-btn">
            <PixelUpload size={16} />
            Select File
          </button>
        </>
      )}
    </div>
  );
}

