import { useState, useRef, useEffect } from 'react';
import { useAlarms } from '../contexts/AlarmContext';

interface AlarmButtonProps {
  itemId: number;
  pointId: number;
  spawns: number[];
  duration: number;
  placeName?: string;
  mapId?: number;
  x?: number;
  y?: number;
}

export function AlarmButton({ itemId, pointId, spawns, duration, placeName, mapId, x, y }: AlarmButtonProps) {
  const { addAlarm, removeAlarm, isAlarmSet, groups } = useAlarms();
  const active = isAlarmSet(itemId, pointId);
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeAlarm(itemId, pointId);
    } else if (groups.length > 1) {
      setShowPicker(true);
    } else {
      addAlarm({ itemId, pointId, spawns, duration, placeName, mapId, x, y });
    }
  };

  const handlePickGroup = (groupId: string) => {
    addAlarm({ itemId, pointId, spawns, duration, placeName, mapId, x, y }, groupId);
    setShowPicker(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={handleClick}
        className={`p-1 rounded transition-colors ${active ? 'text-yellow-400 hover:text-yellow-300' : 'text-[var(--ffxiv-muted)] hover:text-yellow-400'}`}
        title={active ? '移除鬧鐘' : '加入鬧鐘'}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </button>
      {showPicker && (
        <div className="absolute z-50 right-0 top-full mt-1 py-1 bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded shadow-lg min-w-[120px]">
          <div className="px-2 py-1 text-xs text-[var(--ffxiv-muted)]">加入群組</div>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={(e) => { e.stopPropagation(); handlePickGroup(g.id); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--ffxiv-accent)]/20 transition-colors"
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
