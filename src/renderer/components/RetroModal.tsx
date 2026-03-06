import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface RetroModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlay?: boolean;
  onOverlayClick?: () => void;
}

export function RetroModal({ title, onClose, children, footer, className, overlay, onOverlayClick }: RetroModalProps) {
  const modal = (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <span>{title}</span>
        <button className="ctrl-btn" onClick={onClose} style={{ padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
          <X size={14} />
        </button>
      </div>
      <div className="modal-body">
        {children}
      </div>
      {footer && (
        <div className="modal-footer">
          {footer}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="settings-overlay" onClick={onOverlayClick}>
        {modal}
      </div>
    );
  }

  return modal;
}
