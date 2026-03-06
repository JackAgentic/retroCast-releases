import type { RefObject } from 'react';
import { Cast, ArrowLeft } from 'lucide-react';
import type { ChromecastDevice, EmbeddedSubtitle, VideoFile, SubtitleFile, CastStatus, SubtitleOption } from '../../shared/types';
import { BouncingNowPlaying } from './BouncingNowPlaying';
import { PlayerControls } from './PlayerControls';
import { SubtitleSelector } from './SubtitleSelector';
import { DeviceList } from './DeviceList';
import { RetroModal } from './RetroModal';

interface CastingViewProps {
  videoFile: VideoFile | null;
  selectedDeviceId: string | null;
  devices: ChromecastDevice[];
  embeddedSubtitles: EmbeddedSubtitle[];
  externalSubtitle: SubtitleFile | null;
  subtitleOption: SubtitleOption;
  isLoading: boolean;
  disableFakePreview: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoContainerRef: RefObject<HTMLDivElement | null>;
  subtitleTrackUrl: string | null;
  localStatus: CastStatus | null;
  isFullscreen: boolean;
  controlsVisible: boolean;
  subtitlesModalOpen: boolean;
  setSubtitlesModalOpen: (open: boolean) => void;
  targetModalOpen: boolean;
  setTargetModalOpen: (open: boolean) => void;
  anyModalOpen: boolean;
  resetHideTimer: () => void;
  toggleFullscreen: () => void;
  onStop: () => void;
  onExternalSubSelect: () => void;
  onDeviceSwitch: (id: string | null) => void;
  onSubtitleOptionChange: (opt: SubtitleOption) => void;
  onSettings: () => void;
}

export function CastingView({
  videoFile,
  selectedDeviceId,
  devices,
  embeddedSubtitles,
  externalSubtitle,
  subtitleOption,
  isLoading,
  disableFakePreview,
  videoRef,
  videoContainerRef,
  subtitleTrackUrl,
  localStatus,
  isFullscreen,
  controlsVisible,
  subtitlesModalOpen,
  setSubtitlesModalOpen,
  targetModalOpen,
  setTargetModalOpen,
  anyModalOpen,
  resetHideTimer,
  toggleFullscreen,
  onStop,
  onExternalSubSelect,
  onDeviceSwitch,
  onSubtitleOptionChange,
  onSettings,
}: CastingViewProps) {
  if (disableFakePreview) {
    return (
      <div className="subtitle-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="casting-placeholder">
          <Cast size={32} />
          <span>Casting in progress...</span>
        </div>
      </div>
    );
  }

  const isLocal = selectedDeviceId === 'local';

  return (
    <div
      ref={isLocal ? videoContainerRef : undefined}
      className={`fake-video-window${isFullscreen ? ' fullscreen' : ''}`}
      onMouseMove={isLocal ? resetHideTimer : undefined}
      onClick={isLocal && isFullscreen && !controlsVisible ? resetHideTimer : undefined}
      style={isFullscreen ? { cursor: controlsVisible || anyModalOpen ? 'default' : 'none' } : undefined}
    >
      {!isFullscreen && (
        <div className="window-header">
          {isLocal && (
            <button
              className="ctrl-btn active"
              onClick={onStop}
              title="Back to Browser"
              style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}
        </div>
      )}
      <div className="window-body" onDoubleClick={isLocal ? toggleFullscreen : undefined}>
        {isLocal && videoFile ? (
          <video
            ref={videoRef}
            src={`file://${encodeURI(videoFile.path.replace(/\\/g, '/'))}`}
            autoPlay
          >
            {subtitleTrackUrl && (
              <track
                key={subtitleTrackUrl}
                src={subtitleTrackUrl}
                kind="subtitles"
                label="Subtitles"
                default
              />
            )}
          </video>
        ) : videoFile ? (
          <BouncingNowPlaying deviceName={devices.find(d => d.id === selectedDeviceId)?.name || 'Device'} />
        ) : (
          <div className="no-signal">NO SIGNAL</div>
        )}
      </div>
      {isLocal && localStatus && (
        <>
          <div className={`player-overlay${controlsVisible || anyModalOpen ? ' visible' : ''}`}>
            <PlayerControls
              status={localStatus}
              onPlay={() => videoRef.current?.play()}
              onPause={() => videoRef.current?.pause()}
              onSeek={(t: number) => { if (videoRef.current) videoRef.current.currentTime = t; }}
              onVolumeChange={(v: number) => { if (videoRef.current) videoRef.current.volume = v; }}
              onStop={onStop}
              onFullscreen={toggleFullscreen}
              onSubtitles={() => { setSubtitlesModalOpen(!subtitlesModalOpen); setTargetModalOpen(false); }}
              onTarget={() => { setTargetModalOpen(!targetModalOpen); setSubtitlesModalOpen(false); }}
              onSettings={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                onSettings();
              }}
              isFullscreen={isFullscreen}
              overlay={isFullscreen}
              isLocal
            />
          </div>
          {subtitlesModalOpen && (
            <RetroModal title="Subtitles" onClose={() => setSubtitlesModalOpen(false)} className="local-options-modal">
              <SubtitleSelector
                embeddedSubtitles={embeddedSubtitles}
                externalSubtitle={externalSubtitle}
                subtitleOption={subtitleOption}
                onOptionChange={onSubtitleOptionChange}
                onExternalSelect={onExternalSubSelect}
                loading={isLoading}
                disabled={!videoFile}
              />
            </RetroModal>
          )}
          {targetModalOpen && (
            <RetroModal title="Playback Target" onClose={() => setTargetModalOpen(false)} className="local-options-modal">
              <DeviceList
                devices={devices}
                selectedId={selectedDeviceId}
                onSelect={(id) => {
                  onDeviceSwitch(id);
                  if (id !== 'local') {
                    setTargetModalOpen(false);
                    if (document.fullscreenElement) document.exitFullscreen();
                  }
                }}
              />
            </RetroModal>
          )}
        </>
      )}
    </div>
  );
}
