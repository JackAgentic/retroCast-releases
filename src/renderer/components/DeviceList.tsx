import { Cast } from 'lucide-react';
import { LuminaLogo } from './Icons';
import type { ChromecastDevice } from '../../shared/types';

interface Props {
  devices: ChromecastDevice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function DeviceList({ devices, selectedId, onSelect }: Props) {
  return (
    <div className="subtitle-section">
      <h3>
        <Cast size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
        Playback Target
      </h3>

      <div className="subtitle-grid">
        <label className="subtitle-option">
          <input
            type="radio"
            name="device"
            checked={selectedId === 'local'}
            onChange={() => onSelect('local')}
          />
          <LuminaLogo size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Play on RetroCast
        </label>
        {devices.length === 0 ? (
          <div className="skeleton" style={{ height: '36px', marginBottom: '8px' }} />
        ) : (
          devices.map((d) => (
            <label key={d.id} className="subtitle-option">
              <input
                type="radio"
                name="device"
                checked={selectedId === d.id}
                onChange={() => onSelect(d.id)}
              />
              {d.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
