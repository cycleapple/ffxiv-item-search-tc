// Gathering view component - displays gathering nodes with maps like Teamcraft
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { GatheringPoint } from '../types';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { CopyButton } from './CopyButton';

interface GatheringViewProps {
  points: GatheringPoint[];
}

const GATHERING_TYPE_NAMES: Record<number, string> = {
  0: '採礦',
  1: '碎石',
  2: '伐木',
  3: '割草',
  4: '釣魚',
  5: '刺魚',
};

// Job icons (local files in public/icons/jobs/)
const JOB_ICONS = {
  miner: 'icons/jobs/Miner.png',
  botanist: 'icons/jobs/Botanist.png',
  fisher: 'icons/jobs/Fisher.png',
};

// Map gatheringType to job icon
const GATHERING_TYPE_ICONS: Record<number, string> = {
  0: JOB_ICONS.miner,     // Mining
  1: JOB_ICONS.miner,     // Quarrying
  2: JOB_ICONS.botanist,  // Logging
  3: JOB_ICONS.botanist,  // Harvesting
  4: JOB_ICONS.fisher,    // Fishing
  5: JOB_ICONS.fisher,    // Spearfishing
};

// Node type icons for map markers
const NODE_TYPE_ICONS: Record<number, string> = {
  0: 'https://xivapi.com/i/060000/060438.png', // Mining
  1: 'https://xivapi.com/i/060000/060437.png', // Quarrying (rocky outcrop)
  2: 'https://xivapi.com/i/060000/060433.png', // Logging (mature tree)
  3: 'https://xivapi.com/i/060000/060432.png', // Harvesting (lush vegetation)
  4: 'https://xivapi.com/i/060000/060465.png', // Fishing
  5: 'https://xivapi.com/i/060000/060466.png', // Spearfishing
};

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

// Map image base URL
const MAP_BASE_URL = 'https://xivapi.com/m';

// Zone map cache - by name and by id
let zoneMapCache: Record<string, ZoneMapInfo> = {};
let zoneMapByIdCache: Record<number, ZoneMapInfo> = {};
let zoneMapLoaded = false;

async function loadZoneMapData(): Promise<{
  byName: Record<string, ZoneMapInfo>;
  byId: Record<number, ZoneMapInfo>;
}> {
  if (zoneMapLoaded) {
    return { byName: zoneMapCache, byId: zoneMapByIdCache };
  }

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`);
    const data = await res.json();
    zoneMapCache = (data.maps || {}) as Record<string, ZoneMapInfo>;

    // Create lookup by map ID
    zoneMapByIdCache = {};
    Object.values(zoneMapCache).forEach((info) => {
      if (info.id) {
        zoneMapByIdCache[info.id] = info;
      }
    });

    zoneMapLoaded = true;
    return { byName: zoneMapCache, byId: zoneMapByIdCache };
  } catch {
    return { byName: {}, byId: {} };
  }
}

// Convert game coordinates to map percentage
function gameCoordToPercent(coord: number, sizeFactor: number): number {
  return (coord - 1) * sizeFactor / 40.96;
}

function formatEorzeanTime(hours: number): string {
  const h = hours % 24;
  return `${h.toString().padStart(2, '0')}:00`;
}

// Format spawn times into time windows
function formatSpawnWindows(spawns: number[], duration: number): string[] {
  if (!spawns || spawns.length === 0) return [];
  const windows: string[] = [];
  const durationHours = Math.floor(duration / 60);

  spawns.forEach((startHour) => {
    const endHour = (startHour + durationHours) % 24;
    windows.push(`${formatEorzeanTime(startHour)} - ${formatEorzeanTime(endHour)}`);
  });

  return windows;
}

// Get node type label
function getNodeTypeLabel(point: GatheringPoint): { label: string; color: string } | null {
  if (point.legendary) {
    return { label: '傳奇', color: 'text-yellow-400 bg-yellow-900/30' };
  }
  if (point.ephemeral) {
    return { label: '幻象', color: 'text-purple-400 bg-purple-900/30' };
  }
  if (point.timeRestriction || (point.spawns && point.spawns.length > 0)) {
    return { label: '限時', color: 'text-blue-400 bg-blue-900/30' };
  }
  return null;
}

// Group points by zone
interface ZoneGroup {
  zoneName: string;
  points: GatheringPoint[];
}

export function GatheringView({ points }: GatheringViewProps) {
  const [zoneMapsById, setZoneMapsById] = useState<Record<number, ZoneMapInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadZoneMapData().then(({ byId }) => {
      setZoneMapsById(byId);
      setLoading(false);
    });
  }, []);

  if (points.length === 0) {
    return (
      <div className="text-center py-4 text-[var(--ffxiv-muted)]">
        此物品無法採集
      </div>
    );
  }

  // Group points by zone (placeName)
  const zoneGroups: ZoneGroup[] = [];
  const zoneMap = new Map<string, GatheringPoint[]>();

  points.forEach((point) => {
    const zoneName = point.placeName || '未知地點';
    if (!zoneMap.has(zoneName)) {
      zoneMap.set(zoneName, []);
    }
    zoneMap.get(zoneName)!.push(point);
  });

  zoneMap.forEach((zonePoints, zoneName) => {
    zoneGroups.push({ zoneName, points: zonePoints });
  });

  // Sort by level
  zoneGroups.sort((a, b) => {
    const aLevel = Math.min(...a.points.map(p => p.level));
    const bLevel = Math.min(...b.points.map(p => p.level));
    return aLevel - bLevel;
  });

  return (
    <div className="space-y-6">
      {zoneGroups.map((group, groupIndex) => {
        // Use mapId from first point to look up zone map
        const firstPoint = group.points[0];
        const mapId = firstPoint?.mapId;
        const mapInfo = mapId ? zoneMapsById[mapId] : null;
        const mapUrl = mapInfo ? `${MAP_BASE_URL}/${mapInfo.path}.jpg` : null;
        const sizeFactor = mapInfo?.sizeFactor || 100;

        // Get primary gathering type for this zone
        const primaryType = group.points[0]?.gatheringType ?? 0;
        const jobIconPath = GATHERING_TYPE_ICONS[primaryType];
        const typeName = group.points[0]?.gatheringTypeName || GATHERING_TYPE_NAMES[primaryType] || '採集';

        // Get level range
        const levels = group.points.map(p => p.level);
        const minLevel = Math.min(...levels);
        const maxLevel = Math.max(...levels);
        const levelText = minLevel === maxLevel ? `Lv.${minLevel}` : `Lv.${minLevel}-${maxLevel}`;

        // Check for time restrictions
        const hasTimeRestriction = group.points.some(p => p.timeRestriction);

        return (
          <div
            key={groupIndex}
            className="bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 bg-[var(--ffxiv-card)] border-b border-[var(--ffxiv-accent)]">
              {jobIconPath && (
                <img
                  src={`${import.meta.env.BASE_URL}${jobIconPath}`}
                  alt=""
                  className="w-8 h-8"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{typeName}</span>
                  <span className="text-sm text-[var(--ffxiv-muted)]">{levelText}</span>
                  {hasTimeRestriction && (
                    <span className="text-yellow-400" title="限時採集點">⏰</span>
                  )}
                </div>
                <div className="text-sm text-[var(--ffxiv-muted)]">{group.zoneName}</div>
              </div>
            </div>

            {/* Map and details */}
            <div className="flex flex-col md:flex-row">
              {/* Map */}
              <div className="relative w-full md:w-64 h-64 bg-[var(--ffxiv-bg-tertiary)] flex-shrink-0">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
                  </div>
                ) : mapUrl ? (
                  <>
                    <img
                      src={mapUrl}
                      alt={group.zoneName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Aetheryte icons */}
                    {mapInfo?.aetherytes?.map((ae) => {
                      const aeLeft = gameCoordToPercent(ae.x, sizeFactor);
                      const aeTop = gameCoordToPercent(ae.y, sizeFactor);
                      const isMain = ae.type === 0;
                      const size = isMain ? 20 : 14;
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {ae.name}
                          </div>
                        </div>
                      );
                    })}
                    {/* Gathering node markers with radius */}
                    {group.points.map((point, i) => {
                      if (!point.x || !point.y) return null;
                      const nodeLeft = gameCoordToPercent(point.x, sizeFactor);
                      const nodeTop = gameCoordToPercent(point.y, sizeFactor);
                      const nodeIcon = NODE_TYPE_ICONS[point.gatheringType] || NODE_TYPE_ICONS[0];
                      // Use actual radius from data, or default to ~50 units (which appears as ~2.5 game coords)
                      const nodeRadius = point.radius || 50;
                      // Convert radius: the radius in data seems to be in different units
                      // Empirically, radius of 50 ≈ 2.5 game coords
                      const radiusGameCoords = nodeRadius / 20;
                      const radiusPercent = radiusGameCoords * sizeFactor / 40.96;
                      return (
                        <div key={point.id || i}>
                          {/* Radius circle */}
                          <div
                            className="absolute rounded-full border-2 border-cyan-400/60 bg-cyan-400/20 pointer-events-none"
                            style={{
                              left: `${nodeLeft}%`,
                              top: `${nodeTop}%`,
                              width: `${radiusPercent * 2}%`,
                              height: `${radiusPercent * 2}%`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 8,
                            }}
                          />
                          {/* Node icon */}
                          <div
                            className="absolute pointer-events-auto group"
                            style={{
                              left: `${nodeLeft}%`,
                              top: `${nodeTop}%`,
                              width: '24px',
                              height: '24px',
                              transform: 'translate(-50%, -50%)',
                              zIndex: 10,
                            }}
                          >
                            <img
                              src={nodeIcon}
                              alt=""
                              className="w-full h-full drop-shadow-lg"
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              Lv.{point.level} ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--ffxiv-muted)] text-sm">
                    地圖不可用
                  </div>
                )}
              </div>

              {/* Node details */}
              <div className="flex-1 p-3">
                <div className="space-y-3">
                  {group.points.map((point, i) => {
                    const nodeType = getNodeTypeLabel(point);
                    const spawnWindows = formatSpawnWindows(point.spawns || [], point.duration || 0);
                    const folkloreItem = point.folklore ? getItemById(point.folklore) : null;

                    return (
                      <div
                        key={point.id || i}
                        className="p-3 bg-[var(--ffxiv-card)] rounded text-sm space-y-2"
                      >
                        {/* Level and coordinates row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={NODE_TYPE_ICONS[point.gatheringType] || NODE_TYPE_ICONS[0]}
                              alt=""
                              className="w-5 h-5"
                            />
                            <span className="font-medium">
                              Lv.{point.level}{point.stars || ''}
                            </span>
                            {nodeType && (
                              <span className={`px-1.5 py-0.5 rounded text-xs ${nodeType.color}`}>
                                {nodeType.label}
                              </span>
                            )}
                          </div>
                          {point.x && point.y && (
                            <span className="text-[var(--ffxiv-highlight)]">
                              X: {point.x.toFixed(1)}, Y: {point.y.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {/* Time windows */}
                        {spawnWindows.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-yellow-400">⏰</span>
                            <span className="text-[var(--ffxiv-muted)]">
                              {spawnWindows.join(' / ')}
                            </span>
                          </div>
                        )}

                        {/* Perception requirement */}
                        {point.perceptionReq && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-400">📊</span>
                            <span className="text-[var(--ffxiv-muted)]">
                              鑑別力 ≥ {point.perceptionReq}
                            </span>
                          </div>
                        )}

                        {/* Folklore book requirement */}
                        {folkloreItem && (
                          <div className="flex items-center gap-2 text-xs">
                            <img
                              src={getItemIconUrl(folkloreItem.icon)}
                              alt=""
                              className="w-5 h-5"
                            />
                            <Link
                              to={`/item/${folkloreItem.id}`}
                              className="text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline"
                            >
                              {folkloreItem.name}
                            </Link>
                            <CopyButton text={folkloreItem.name} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
