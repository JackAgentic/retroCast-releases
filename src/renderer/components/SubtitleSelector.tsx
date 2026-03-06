import { Captions, FileArchive, MousePointer2 } from 'lucide-react';
import type { EmbeddedSubtitle, SubtitleFile, SubtitleOption } from '../../shared/types';

interface Props {
  embeddedSubtitles: EmbeddedSubtitle[];
  externalSubtitle: SubtitleFile | null;
  subtitleOption: SubtitleOption;
  onOptionChange: (option: SubtitleOption) => void;
  onExternalSelect: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SubtitleSelector({
  embeddedSubtitles,
  externalSubtitle,
  subtitleOption,
  onOptionChange,
  onExternalSelect,
  loading,
  disabled,
}: Props) {
  return (
    <div className={`subtitle-section${disabled ? ' disabled' : ''}`} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      <h3>
        <Captions size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
        Subtitles
      </h3>

      <div className="subtitle-grid">
        {loading ? (
          <>
            <div className="subtitle-option skeleton" style={{ height: '36px', marginBottom: '8px' }} />
            <div className="subtitle-option skeleton" style={{ height: '36px', marginBottom: '8px' }} />
          </>
        ) : (
          <>
            <label className="subtitle-option">
              <input
                type="radio"
                name="subtitle"
                checked={subtitleOption.type === 'none'}
                onChange={() => onOptionChange({ type: 'none' })}
              />
              None
            </label>

            {embeddedSubtitles.map((sub) => (
              <label key={sub.streamIndex} className="subtitle-option">
                <input
                  type="radio"
                  name="subtitle"
                  checked={subtitleOption.type === 'embedded' && subtitleOption.streamIndex === sub.streamIndex}
                  onChange={() => onOptionChange({ type: 'embedded', streamIndex: sub.streamIndex })}
                />
                <FileArchive size={14} style={{ marginRight: '6px' }} color="var(--text-secondary)" />
                {sub.title || `Track ${sub.streamIndex}`} ({sub.language || 'Unknown'})
              </label>
            ))}

            <label className="subtitle-option">
              <input
                type="radio"
                name="subtitle"
                checked={subtitleOption.type === 'external'}
                onChange={() => {
                  if (externalSubtitle) {
                    onOptionChange({ type: 'external', path: externalSubtitle.path });
                  } else {
                    onExternalSelect();
                  }
                }}
              />
              <MousePointer2 size={14} style={{ marginRight: '6px' }} color="var(--text-secondary)" />
              External SRT
              <button className="external-btn" onClick={(e) => { e.preventDefault(); onExternalSelect(); }}>
                {externalSubtitle ? 'Change...' : 'Browse...'}
              </button>
              {externalSubtitle && <span className="srt-name">{externalSubtitle.name}</span>}
            </label>
          </>
        )}
      </div>
    </div>
  );
}
