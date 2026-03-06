import { useRef, useEffect } from 'react';
import { LuminaLogo } from './Icons';

export function BouncingNowPlaying({ deviceName }: { deviceName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const el = elementRef.current;
    if (!container || !el) return;

    let x = 20, y = 20, dx = 1.5, dy = 1;
    let animId: number;

    const step = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const ew = el.offsetWidth;
      const eh = el.offsetHeight;

      x += dx;
      y += dy;

      if (x + ew >= cw || x <= 0) {
        dx = -dx;
        x = Math.max(0, Math.min(x, cw - ew));
      }
      if (y + eh >= ch || y <= 0) {
        dy = -dy;
        y = Math.max(0, Math.min(y, ch - eh));
      }

      el.style.transform = `translate(${x}px, ${y}px)`;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div ref={containerRef} className="bounce-container">
      <div ref={elementRef} className="now-playing">
        <LuminaLogo size={48} className="bounce-logo" />
        <span>Casting to {deviceName}</span>
      </div>
    </div>
  );
}
