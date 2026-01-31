// Map modal component for showing NPC locations
import { useEffect, useState } from 'react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  x: number;
  y: number;
  npcName?: string;
  mapId?: number;
}

// Map image base URL from XIVAPI
const MAP_BASE_URL = 'https://xivapi.com/m';

// Aetheryte info
interface AetheryteInfo {
  id: number;
  x: number;
  y: number;
  type: number; // 0 = main aetheryte, 1 = aethernet shard
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

// Zone map cache (loaded from data)
let zoneMapCache: Record<string, ZoneMapInfo> = {};
let zoneMapByIdCache: Record<number, { info: ZoneMapInfo; name: string }> = {};
let loadingPromise: Promise<Record<string, ZoneMapInfo>> | null = null;

async function loadZoneMapData(): Promise<Record<string, ZoneMapInfo>> {
  if (Object.keys(zoneMapCache).length > 0) return zoneMapCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`)
    .then((res) => res.json())
    .then((data) => {
      zoneMapCache = (data.maps || {}) as Record<string, ZoneMapInfo>;
      zoneMapByIdCache = {};
      Object.entries(zoneMapCache).forEach(([name, info]) => {
        if (info.id) {
          zoneMapByIdCache[info.id] = { info, name };
        }
      });
      return zoneMapCache;
    })
    .catch((err) => {
      console.warn('Failed to load zone maps:', err);
      return {};
    });

  return loadingPromise;
}

/**
 * Convert game coordinates to map percentage position
 * Reference: https://github.com/xivapi/ffxiv-datamining/blob/master/docs/MapCoordinates.md
 *
 * Game coord formula: (pixelCoords / sizeFactor) * 2 + 1
 * Reverse to get pixel: (gameCoord - 1) * sizeFactor / 2
 * As percentage of 2048px map: pixel / 2048 * 100
 * Combined: (gameCoord - 1) * sizeFactor / 40.96
 */
function gameCoordToPercent(coord: number, sizeFactor: number): number {
  return (coord - 1) * sizeFactor / 40.96;
}

export function MapModal({ isOpen, onClose, zoneName, x, y, npcName, mapId }: MapModalProps) {
  const [mapInfo, setMapInfo] = useState<ZoneMapInfo | null>(null);
  const [mapName, setMapName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load zone map data and find the map for this zone
  useEffect(() => {
    if (!isOpen || (!zoneName && !mapId)) return;

    setLoading(true);
    loadZoneMapData().then((maps) => {
      // Try by name first, then by mapId
      let found = zoneName ? maps[zoneName] : null;
      let resolvedName: string | null = null;
      if (!found && mapId && zoneMapByIdCache[mapId]) {
        found = zoneMapByIdCache[mapId].info;
        resolvedName = zoneMapByIdCache[mapId].name;
      }
      setMapInfo(found || null);
      setMapName(resolvedName);
      setLoading(false);
    });
  }, [isOpen, zoneName, mapId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mapUrl = mapInfo ? `${MAP_BASE_URL}/${mapInfo.path}.jpg` : null;
  const sizeFactor = mapInfo?.sizeFactor || 100;

  // Convert game coordinates to percentage position on map using sizeFactor
  const markerLeft = gameCoordToPercent(x, sizeFactor);
  const markerTop = gameCoordToPercent(y, sizeFactor);

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
            <h3 className="font-medium text-[var(--ffxiv-text)]">
              {mapName && mapName !== zoneName ? `${mapName} - ${zoneName}` : zoneName}
            </h3>
            {npcName && (
              <p className="text-sm text-[var(--ffxiv-muted)]">{npcName}</p>
            )}
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
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
            </div>
          ) : mapUrl ? (
            <>
              <img
                src={mapUrl}
                alt={zoneName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Aetheryte icons */}
              {mapInfo?.aetherytes?.map((ae) => {
                const aeLeft = gameCoordToPercent(ae.x, sizeFactor);
                const aeTop = gameCoordToPercent(ae.y, sizeFactor);
                // Main aetheryte (type 0) vs aethernet shard (type 1)
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
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {ae.name}
                    </div>
                  </div>
                );
              })}
              {/* Target marker */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${markerLeft}%`,
                  top: `${markerTop}%`,
                  width: '24px',
                  height: '24px',
                  transform: 'translate(-50%, -100%)',
                  zIndex: 10,
                }}
              >
                <svg className="w-full h-full text-red-500 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--ffxiv-muted)]">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p>地圖暫無法顯示</p>
                <p className="text-xs mt-1">({zoneName})</p>
              </div>
            </div>
          )}
        </div>

        {/* Coordinates */}
        <div className="p-4 border-t border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)]">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-[var(--ffxiv-highlight)] font-medium">
              X: {x.toFixed(1)}
            </span>
            <span className="text-[var(--ffxiv-highlight)] font-medium">
              Y: {y.toFixed(1)}
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
