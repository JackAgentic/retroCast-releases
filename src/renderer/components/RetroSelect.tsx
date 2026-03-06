import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface RetroSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function RetroSelect({ value, options, onChange }: RetroSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label || value || '—';

  return (
    <div className="retro-select" ref={ref}>
      <button
        type="button"
        className="retro-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="retro-select-label">{selectedLabel}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div className="retro-select-dropdown">
          {options.map((o) => (
            <div
              key={o.value}
              className={`retro-select-option${o.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
