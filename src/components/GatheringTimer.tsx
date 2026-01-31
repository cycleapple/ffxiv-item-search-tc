import { useState, useEffect } from 'react';
import { getNextSpawnInfo, formatCountdown, type SpawnInfo } from '../utils/eorzeanClock';

interface GatheringTimerProps {
  spawns: number[];
  duration: number;
}

export default function GatheringTimer({ spawns, duration }: GatheringTimerProps) {
  const [infos, setInfos] = useState<SpawnInfo[]>(() => getNextSpawnInfo(spawns, duration));

  useEffect(() => {
    setInfos(getNextSpawnInfo(spawns, duration));
    const id = setInterval(() => {
      setInfos(getNextSpawnInfo(spawns, duration));
    }, 1000);
    return () => clearInterval(id);
  }, [spawns, duration]);

  if (infos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {infos.map((info) => (
        <div key={info.startHour} className="flex items-center gap-2 text-xs">
          <div
            className="relative h-3 flex-1 rounded overflow-hidden"
            style={{ backgroundColor: 'var(--ffxiv-surface, #1a1a2e)', minWidth: 80, maxWidth: 160 }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded transition-[width] duration-1000 ease-linear"
              style={{
                width: `${(info.active ? info.progress : info.progress) * 100}%`,
                backgroundColor: info.active ? '#22c55e' : '#6b7280',
              }}
            />
          </div>
          <span
            className="whitespace-nowrap"
            style={{ color: info.active ? '#4ade80' : 'var(--ffxiv-muted, #888)' }}
          >
            {info.active
              ? `採集中 剩餘 ${formatCountdown(Math.floor((1 - info.progress) * duration * 175 / 60))}`
              : `距離出現 ${formatCountdown(info.countdown)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
