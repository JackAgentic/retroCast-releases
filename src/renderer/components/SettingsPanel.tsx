import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../SettingsContext';
import { applyTheme } from '../themes';
import { RetroSelect } from './RetroSelect';
import { RetroModal } from './RetroModal';
import type {
  AppSettings,
  ChromecastDevice,
  NetworkInterface,
  SubtitleTextSize,
  SubtitleTextColor,
  SubtitleBackground,
  ThemePreset,
} from '../../shared/types';

const api = (window as any).videoCast;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  devices: ChromecastDevice[];
}

const TEXT_COLORS: { value: SubtitleTextColor; hex: string }[] = [
  { value: 'white', hex: '#ffffff' },
  { value: 'yellow', hex: '#ffff00' },
  { value: 'cyan', hex: '#00ffff' },
  { value: 'green', hex: '#00ff00' },
];

const SUBTITLE_FONTS = [
  { value: 'VT323', label: 'VT323 (Retro)' },
  { value: '"Press Start 2P"', label: 'Press Start 2P' },
  { value: 'Silkscreen', label: 'Silkscreen' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Outfit', label: 'Outfit' },
  { value: '"Special Elite"', label: 'Special Elite' },
  { value: '"Bebas Neue"', label: 'Bebas Neue' },
  { value: 'Righteous', label: 'Righteous' },
  { value: '"JetBrains Mono"', label: 'JetBrains Mono' },
  { value: '"Courier New"', label: 'Courier New' },
];

const THEMES: { value: ThemePreset; label: string; swatch: string }[] = [
  { value: 'classic-white', label: 'Classic', swatch: '#ffffff' },
  { value: 'terminal-green', label: 'Terminal', swatch: '#00ff00' },
  { value: 'cyberpunk-amber', label: 'Cyberpunk', swatch: '#ffaa00' },
  { value: 'synthwave-magenta', label: 'Synthwave', swatch: '#ff00ff' },
  { value: 'rainbow-arcade', label: 'Rainbow', swatch: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' },
  { value: 'neon-cycle', label: 'Neon', swatch: 'linear-gradient(90deg, #ff0055, #00ff66, #00ccff, #ff00ff)' },
];

function RetroSliderSimple({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const calcValue = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return min + ratio * (max - min);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    onChange(calcValue(e.clientX));

    const onMove = (ev: PointerEvent) => onChange(calcValue(ev.clientX));
    const onUp = (ev: PointerEvent) => {
      onChange(calcValue(ev.clientX));
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  };

  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div ref={trackRef} className="retro-slider" onPointerDown={handlePointerDown}>
      <div className="retro-slider-fill" style={{ width: `${pct}%` }} />
      <div className="retro-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose, devices }: Props) {
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      api.getNetworkInterfaces().then((ifaces: NetworkInterface[]) => setNetworkInterfaces(ifaces));
    }
  }, [isOpen, settings]);

  // Live theme preview
  useEffect(() => {
    if (isOpen) {
      applyTheme(draft.themePreset);
    }
  }, [draft.themePreset, isOpen]);

  const update = (partial: Partial<AppSettings>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    updateSettings(draft);
    applyTheme(draft.themePreset);
    onClose();
  };

  const handleCancel = () => {
    applyTheme(settings.themePreset);
    onClose();
  };

  if (!isOpen) return null;

  const subtitlePreviewStyle = {
    fontSize: { small: '14px', medium: '18px', large: '24px' }[draft.subtitleTextSize],
    color: TEXT_COLORS.find((c) => c.value === draft.subtitleTextColor)?.hex || '#fff',
    backgroundColor: {
      opaque: 'rgba(0,0,0,1)',
      'semi-transparent': 'rgba(0,0,0,0.5)',
      none: 'transparent',
    }[draft.subtitleBackground],
    padding: '2px 8px',
    fontFamily: (draft.subtitleFont || 'VT323').includes(' ') ? draft.subtitleFont : `${draft.subtitleFont || 'VT323'}, monospace`,
  };

  return (
    <RetroModal
      title="SETTINGS.EXE"
      onClose={handleCancel}
      className="settings-window"
      overlay
      onOverlayClick={handleCancel}
      footer={
        <>
          <button className="ctrl-btn" onClick={handleCancel}>CANCEL</button>
          <button className="ctrl-btn active" onClick={handleSave}>SAVE & CLOSE</button>
        </>
      }
    >
        <div className="settings-body">
          {/* Chromecast & Player */}
          <div className="settings-section">
            <h4>Chromecast & Player</h4>

            <div className="settings-row">
              <label>Auto-Connect Device</label>
              <RetroSelect
                value={draft.autoConnectDeviceName || ''}
                options={[{ value: '', label: 'None' }, ...devices.map((d) => ({ value: d.name, label: d.name }))]}
                onChange={(v) => update({ autoConnectDeviceName: v || null })}
              />
            </div>

            <div className="settings-row">
              <label>Start Muted</label>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={draft.startMuted}
                onChange={(e) => update({ startMuted: e.target.checked })}
              />
            </div>

            <div className="settings-row">
              <label>Default Volume</label>
              <div className="settings-slider-row">
                <RetroSliderSimple
                  value={draft.persistentVolume}
                  min={0}
                  max={1}
                  onChange={(v) => update({ persistentVolume: Math.round(v * 100) / 100 })}
                />
                <span className="settings-slider-value">{Math.round(draft.persistentVolume * 100)}%</span>
              </div>
            </div>

            <div className="settings-row">
              <label>Buffer Time</label>
              <div className="settings-slider-row">
                <RetroSliderSimple
                  value={draft.bufferTimeSec}
                  min={1}
                  max={30}
                  onChange={(v) => update({ bufferTimeSec: Math.round(v) })}
                />
                <span className="settings-slider-value">{draft.bufferTimeSec}s</span>
              </div>
            </div>
          </div>

          {/* Subtitle Formatting */}
          <div className="settings-section">
            <h4>Subtitle Formatting</h4>

            <div className="settings-row">
              <label>Text Size</label>
              <div className="settings-radio-group">
                {(['small', 'medium', 'large'] as SubtitleTextSize[]).map((size) => (
                  <label key={size}>
                    <input
                      type="radio"
                      name="subtitleSize"
                      checked={draft.subtitleTextSize === size}
                      onChange={() => update({ subtitleTextSize: size })}
                    />
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Text Color</label>
              <div className="color-swatches">
                {TEXT_COLORS.map((c) => (
                  <div
                    key={c.value}
                    className={`color-swatch${draft.subtitleTextColor === c.value ? ' selected' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => update({ subtitleTextColor: c.value })}
                    title={c.value}
                  />
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Background</label>
              <div className="settings-radio-group">
                {(['opaque', 'semi-transparent', 'none'] as SubtitleBackground[]).map((bg) => (
                  <label key={bg}>
                    <input
                      type="radio"
                      name="subtitleBg"
                      checked={draft.subtitleBackground === bg}
                      onChange={() => update({ subtitleBackground: bg })}
                    />
                    {bg === 'semi-transparent' ? 'Semi' : bg.charAt(0).toUpperCase() + bg.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Text Font</label>
              <RetroSelect
                value={draft.subtitleFont}
                options={SUBTITLE_FONTS}
                onChange={(v) => update({ subtitleFont: v })}
              />
            </div>

            <div className="subtitle-preview">
              <span style={subtitlePreviewStyle}>Sample subtitle text</span>
            </div>
          </div>

          {/* Network & System */}
          <div className="settings-section">
            <h4>Network & System</h4>

            <div className="settings-row">
              <label>Media Server Port</label>
              <input
                type="text"
                className="settings-input"
                placeholder="Auto"
                value={draft.customMediaServerPort ?? ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  const num = parseInt(val, 10);
                  update({ customMediaServerPort: val === '' ? null : isNaN(num) ? draft.customMediaServerPort : num });
                }}
              />
            </div>

            <div className="settings-row">
              <label>Network Adapter</label>
              <RetroSelect
                value={draft.localAddressLock || ''}
                options={[{ value: '', label: 'Auto-detect' }, ...networkInterfaces.map((iface) => ({ value: iface.address, label: iface.label }))]}
                onChange={(v) => update({ localAddressLock: v || null })}
              />
            </div>

            <div className="restart-notice">* Port and adapter changes take effect on restart</div>
          </div>

          {/* Appearance */}
          <div className="settings-section">
            <h4>Appearance</h4>

            <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <label>Theme</label>
              <div className="theme-cards">
                {THEMES.map((t) => (
                  <div
                    key={t.value}
                    className={`theme-card${draft.themePreset === t.value ? ' selected' : ''}`}
                    onClick={() => update({ themePreset: t.value })}
                  >
                    <div className="theme-swatch" style={{ background: t.swatch }} />
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-row" style={{ marginTop: '12px' }}>
              <label>Disable Preview Window</label>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={draft.disableFakePreview}
                onChange={(e) => update({ disableFakePreview: e.target.checked })}
              />
            </div>
          </div>
        </div>
    </RetroModal>
  );
}
