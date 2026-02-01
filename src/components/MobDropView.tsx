// Monster drop map view - displays mob spawn positions with map modal
import { useState, useEffect, useCallback } from 'react';
import type { MobPositionData } from '../types';

interface MobDropViewProps {
  mobIds: number[];
  mobNames: string[];
  totalMobs: number;
}

// Map image base URL
const MAP_BASE_URL = 'https://xivapi.com/m';

// Monster marker for map
const MOB_MARKER_ICON = 'https://xivapi.com/i/060000/060004.png';

// Aetheryte info
interface AetheryteInfo {
  id: number;
  x: number;
  y: number;
  type: number;
  name: string;
}

// Zone map info structure
interface ZoneMapInfo {
  id: number;
  path: string;
  sizeFactor: number;
  offsetX: number;
  offsetY: number;
  aetherytes: AetheryteInfo[];
}

// Cache for mob positions
let mobPositionCache: MobPositionData | null = null;
let mobPositionLoading: Promise<MobPositionData> | null = null;

async function loadMobPositions(): Promise<MobPositionData> {
  if (mobPositionCache) return mobPositionCache;
  if (mobPositionLoading) return mobPositionLoading;

  mobPositionLoading = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/mob-positions.json`);
      if (!res.ok) return {};
      mobPositionCache = await res.json();
      return mobPositionCache!;
    } catch {
      return {};
    }
  })();

  return mobPositionLoading;
}

// Zone map cache
let zoneMapByIdCache: Record<number, ZoneMapInfo> = {};
let zoneMapLoaded = false;

async function loadZoneMapData(): Promise<Record<number, ZoneMapInfo>> {
  if (zoneMapLoaded) return zoneMapByIdCache;

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`);
    const data = await res.json();
    const maps = (data.maps || {}) as Record<string, ZoneMapInfo>;
    zoneMapByIdCache = {};
    Object.values(maps).forEach((info) => {
      if (info.id) {
        zoneMapByIdCache[info.id] = info;
      }
    });
    zoneMapLoaded = true;
    return zoneMapByIdCache;
  } catch {
    return {};
  }
}

// Convert game coordinates to map percentage
function gameCoordToPercent(coord: number, sizeFactor: number): number {
  return (coord - 1) * sizeFactor / 40.96;
}

// Compute centroid and bounding radius of positions
function computeCenter(positions: { x: number; y: number }[]): { cx: number; cy: number; radius: number } {
  if (positions.length === 0) return { cx: 0, cy: 0, radius: 0 };
  const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
  let maxDist = 0;
  for (const p of positions) {
    const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    if (d > maxDist) maxDist = d;
  }
  return { cx, cy, radius: maxDist };
}

// Group mob data by zone for display
interface ZoneMobGroup {
  zoneName: string;
  mapId: number;
  mapPath: string;
  sizeFactor: number;
  mobs: {
    mobId: number;
    mobName: string;
    positions: { x: number; y: number; level: number }[];
  }[];
}

// Modal for showing mob positions on a large map
function MobMapModal({ group, zoneMapInfo, onClose }: {
  group: ZoneMobGroup;
  zoneMapInfo: ZoneMapInfo | undefined;
  onClose: () => void;
}) {
  const mapUrl = `${MAP_BASE_URL}/${group.mapPath}.jpg`;
  const sizeFactor = group.sizeFactor;

  // All positions for range circle
  const allPositions = group.mobs.flatMap((m) => m.positions);
  const { cx, cy, radius } = computeCenter(allPositions);
  const radiusPercent = radius * sizeFactor / 40.96;

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] max-w-lg w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--ffxiv-border)]">
          <div>
            <h3 className="font-medium text-[var(--ffxiv-text)]">{group.zoneName}</h3>
            <p className="text-sm text-[var(--ffxiv-muted)]">
              {group.mobs.map((m) => m.mobName).join(', ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--ffxiv-bg-tertiary)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--ffxiv-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map */}
        <div className="relative aspect-square bg-[var(--ffxiv-bg-tertiary)]">
          <img
            src={mapUrl}
            alt={group.zoneName}
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Aetheryte icons */}
          {zoneMapInfo?.aetherytes?.map((ae) => {
            const aeLeft = gameCoordToPercent(ae.x, sizeFactor);
            const aeTop = gameCoordToPercent(ae.y, sizeFactor);
            const isMain = ae.type === 0;
            const size = isMain ? 24 : 16;
            return (
              <div
                key={ae.id}
                className="absolute pointer-events-auto group"
                style={{
                  left: `${aeLeft}%`,
                  top: `${aeTop}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 5,
                }}
              >
                <img
                  src={isMain
                    ? 'https://xivapi.com/i/060000/060453.png'
                    : 'https://xivapi.com/i/060000/060430.png'
                  }
                  alt={ae.name}
                  className="w-full h-full"
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {ae.name}
                </div>
              </div>
            );
          })}
          {/* Range circle */}
          {radius > 0 && (
            <div
              className="absolute rounded-full border-2 border-red-400/60 bg-red-400/15 pointer-events-none"
              style={{
                left: `${gameCoordToPercent(cx, sizeFactor)}%`,
                top: `${gameCoordToPercent(cy, sizeFactor)}%`,
                width: `${radiusPercent * 2}%`,
                height: `${radiusPercent * 2}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 8,
              }}
            />
          )}
          {/* Mob position markers */}
          {group.mobs.map((mob) =>
            mob.positions.map((pos, i) => {
              const left = gameCoordToPercent(pos.x, sizeFactor);
              const top = gameCoordToPercent(pos.y, sizeFactor);
              return (
                <div
                  key={`${mob.mobId}-${i}`}
                  className="absolute pointer-events-auto group"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: '20px',
                    height: '20px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                >
                  <img
                    src={MOB_MARKER_ICON}
                    alt=""
                    className="w-full h-full drop-shadow-lg"
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    {mob.mobName} {pos.level > 0 && `Lv.${pos.level}`} ({pos.x.toFixed(1)}, {pos.y.toFixed(1)})
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)]">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-[var(--ffxiv-highlight)] font-medium">
              X: {cx.toFixed(1)}, Y: {cy.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-[var(--ffxiv-muted)] text-center mt-2">
            點擊外部或按 ESC 關閉
          </p>
        </div>
      </div>
    </div>
  );
}

export function MobDropView({ mobIds, mobNames, totalMobs }: MobDropViewProps) {
  const [mobPositions, setMobPositions] = useState<MobPositionData>({});
  const [zoneMaps, setZoneMaps] = useState<Record<number, ZoneMapInfo>>({});
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState<number | null>(null); // groupIndex

  useEffect(() => {
    Promise.all([loadMobPositions(), loadZoneMapData()]).then(([positions, maps]) => {
      setMobPositions(positions);
      setZoneMaps(maps);
      setLoading(false);
    });
  }, []);

  const closeModal = useCallback(() => setOpenModal(null), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
      </div>
    );
  }

  // Build zone groups: group all mobs by their map/zone
  const zoneGroupMap = new Map<number, ZoneMobGroup>();

  mobIds.forEach((mobId, index) => {
    const mobName = mobNames[index] || `怪物 #${mobId}`;
    const mobData = mobPositions[String(mobId)];
    if (!mobData || !mobData.positions) return;

    for (const mapGroup of mobData.positions) {
      const key = mapGroup.mapId;
      if (!zoneGroupMap.has(key)) {
        zoneGroupMap.set(key, {
          zoneName: mapGroup.zoneName,
          mapId: mapGroup.mapId,
          mapPath: mapGroup.mapPath,
          sizeFactor: mapGroup.sizeFactor,
          mobs: [],
        });
      }
      zoneGroupMap.get(key)!.mobs.push({
        mobId,
        mobName,
        positions: mapGroup.positions,
      });
    }
  });

  const zoneGroups = Array.from(zoneGroupMap.values());

  // Sort by level of first position
  zoneGroups.sort((a, b) => {
    const aLevel = a.mobs[0]?.positions[0]?.level || 0;
    const bLevel = b.mobs[0]?.positions[0]?.level || 0;
    return aLevel - bLevel;
  });

  if (zoneGroups.length === 0) {
    return (
      <div className="text-sm text-[var(--ffxiv-muted)] mt-1">
        <div className="flex flex-wrap gap-1">
          {mobNames.map((name, i) => (
            <span key={i} className="px-2 py-0.5 bg-[var(--ffxiv-card)] rounded text-xs">
              {name}
            </span>
          ))}
          {totalMobs > mobNames.length && (
            <span className="px-2 py-0.5 text-xs text-[var(--ffxiv-muted)]">
              ...還有 {totalMobs - mobNames.length} 個怪物
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 mt-2">
        {zoneGroups.map((group, groupIndex) => {
          // Compute centroid as representative coordinate
          const allPositions = group.mobs.flatMap((m) => m.positions);
          const { cx, cy } = computeCenter(allPositions);

          // Level range
          const levels = allPositions.map((p) => p.level).filter((l) => l > 0);
          const minLevel = levels.length > 0 ? Math.min(...levels) : 0;
          const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;
          const levelText = minLevel === maxLevel
            ? (minLevel > 0 ? `Lv.${minLevel}` : '')
            : `Lv.${minLevel}-${maxLevel}`;

          return (
            <div
              key={groupIndex}
              className="flex items-center gap-3 p-2 bg-[var(--ffxiv-card)] rounded text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {group.mobs.map((m) => m.mobName).join(', ')}
                  </span>
                  {levelText && (
                    <span className="text-xs text-[var(--ffxiv-muted)] flex-shrink-0">{levelText}</span>
                  )}
                </div>
                <div className="text-xs text-[var(--ffxiv-muted)]">
                  {group.zoneName} (X: {cx.toFixed(1)}, Y: {cy.toFixed(1)})
                </div>
              </div>
              <button
                onClick={() => setOpenModal(groupIndex)}
                className="px-3 py-1.5 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded text-xs transition-colors flex-shrink-0"
              >
                地圖
              </button>
            </div>
          );
        })}
        {totalMobs > mobNames.length && (
          <div className="text-xs text-[var(--ffxiv-muted)] pl-2">
            ...還有 {totalMobs - mobNames.length} 個怪物
          </div>
        )}
      </div>

      {/* Map modal */}
      {openModal !== null && zoneGroups[openModal] && (
        <MobMapModal
          group={zoneGroups[openModal]}
          zoneMapInfo={zoneMaps[zoneGroups[openModal].mapId]}
          onClose={closeModal}
        />
      )}
    </>
  );
}
