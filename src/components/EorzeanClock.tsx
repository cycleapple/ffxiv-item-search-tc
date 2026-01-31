import { useState, useEffect } from 'react';
import { getEorzeanTime } from '../utils/eorzeanClock';

export function EorzeanClock() {
  const [et, setET] = useState(getEorzeanTime);

  useEffect(() => {
    const id = setInterval(() => setET(getEorzeanTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-sm text-[var(--ffxiv-muted)] font-mono">
      ET {String(et.hours).padStart(2, '0')}:{String(et.minutes).padStart(2, '0')}
    </span>
  );
}
