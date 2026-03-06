import { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Square, Volume2, Volume1, VolumeX, Maximize2, Minimize2, X, Subtitles, Cast, Settings } from 'lucide-react';
import type { CastStatus } from '../../shared/types';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

function RetroSlider({ value, min, max, onChange, className = '' }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const latestProps = useRef({ min, max, onChange });
  latestProps.current = { min, max, onChange };

  useEffect(() => {
    if (!dragging) setLocalValue(value);
  }, [value, dragging]);

  const calcValue = (clientX: number) => {
    const track = trackRef.current!;
    const rect = track.getBoundingClientRect();
    const { min: mn, max: mx } = latestProps.current;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return mn + ratio * (mx - mn);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const v = calcValue(e.clientX);
    setDragging(true);
    setLocalValue(v);

    const onMove = (ev: PointerEvent) => {
      const mv = calcValue(ev.clientX);
      setLocalValue(mv);
      latestProps.current.onChange(mv);
    };
    const onUp = (ev: PointerEvent) => {
      const fv = calcValue(ev.clientX);
      latestProps.current.onChange(fv);
      setLocalValue(fv);
      setDragging(false);
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('lostpointercapture', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('lostpointercapture', onUp);
  };

  const displayValue = dragging ? localValue : value;
  const pct = max > min
    ? Math.max(0, Math.min(100, ((displayValue - min) / (max - min)) * 100))
    : 0;

  return (
    <div
      ref={trackRef}
      className={`retro-slider ${className}`}
      onPointerDown={handlePointerDown}
    >
      <div className="retro-slider-fill" style={{ width: `${pct}%` }} />
      <div className="retro-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}

interface Props {
  status: CastStatus;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (level: number) => void;
  onStop: () => void;
  onFullscreen?: () => void;
  onSubtitles?: () => void;
  onTarget?: () => void;
  onSettings?: () => void;
  isFullscreen?: boolean;
  overlay?: boolean;
  isLocal?: boolean;
}

export function PlayerControls({ status, onPlay, onPause, onSeek, onVolumeChange, onStop, onFullscreen, onSubtitles, onTarget, onSettings, isFullscreen, overlay, isLocal }: Props) {
  const isPlaying = status.playerState === 'PLAYING';
  const [premuteVolume, setPremuteVolume] = useState(1);

  const isMuted = status.volume === 0;

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(premuteVolume || 0.5);
    } else {
      setPremuteVolume(status.volume);
      onVolumeChange(0);
    }
  };

  const VolumeIcon = isMuted ? VolumeX : status.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`player-controls${overlay ? ' player-controls-overlay' : ''}`}>
      <div className="time-row">
        <span className="time-display">{formatTime(status.currentTime)}</span>
        <RetroSlider
          className="seek-slider"
          value={status.currentTime}
          min={0}
          max={status.duration || 1}
          onChange={onSeek}
        />
        <span className="time-display">{formatTime(status.duration)}</span>
      </div>
      <div className="controls-row">
        <div className="controls-left"></div>
        <div className="controls-center">
          <button className="ctrl-btn" onClick={() => onSeek(Math.max(0, status.currentTime - 10))} title="Back 10s">
            <RotateCcw size={18} /><span className="seek-label">10</span>
          </button>
          <button
            className="ctrl-btn active"
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button className="ctrl-btn" onClick={() => onSeek(status.currentTime + 30)} title="Forward 30s">
            <RotateCw size={18} /><span className="seek-label">30</span>
          </button>
          <button className="ctrl-btn" onClick={onStop} title={isLocal ? 'Close' : 'Stop'}>
            {isLocal ? <X size={18} /> : <Square size={18} fill="currentColor" />}
          </button>
          <button className="ctrl-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            <VolumeIcon size={18} />
          </button>
          <RetroSlider
            className="volume-slider"
            value={status.volume}
            min={0}
            max={1}
            onChange={onVolumeChange}
          />
        </div>
        <div className="controls-right">
          {onSubtitles && (
            <button className="ctrl-btn" onClick={onSubtitles} title="Subtitles">
              <Subtitles size={18} />
            </button>
          )}
          {onTarget && (
            <button className="ctrl-btn" onClick={onTarget} title="Playback Target">
              <Cast size={18} />
            </button>
          )}
          {onSettings && (
            <button className="ctrl-btn" onClick={onSettings} title="Settings">
              <Settings size={18} />
            </button>
          )}
          {onFullscreen && (
            <button className="ctrl-btn" onClick={onFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
