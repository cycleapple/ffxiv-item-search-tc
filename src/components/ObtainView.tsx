// Obtain view component - shows all ways to obtain an item
import { useState, useEffect } from 'react';
import type { ItemSource, Recipe, GatheringPoint, VendorInfo, VentureQuantity } from '../types';
import { getItemById, getItemByName } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { Link } from 'react-router-dom';
import { CopyButton } from './CopyButton';
import { MapModal } from './MapModal';

// Cache for CN quest names
let questCNNamesCache: Record<number, string> | null = null;

async function loadQuestCNNames(): Promise<Record<number, string>> {
  if (questCNNamesCache) return questCNNamesCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/quest-cn-names.json`);
    questCNNamesCache = await res.json();
    return questCNNamesCache || {};
  } catch {
    return {};
  }
}

// Cache for CN instance names (TC name -> CN name)
let instanceCNNamesCache: Record<string, string> | null = null;

async function loadInstanceCNNames(): Promise<Record<string, string>> {
  if (instanceCNNamesCache) return instanceCNNamesCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/instance-cn-names.json`);
    instanceCNNamesCache = await res.json();
    return instanceCNNamesCache || {};
  } catch {
    return {};
  }
}

interface ObtainViewProps {
  itemId: number;
  sources: ItemSource[];
  recipes: Recipe[];
  gatheringPoints: GatheringPoint[];
}

// XIVAPI icon URLs
const XIVAPI_ICONS = {
  vendor: 'https://xivapi.com/i/065000/065002.png',       // Gil/Vendor
  gil: 'https://xivapi.com/i/065000/065002.png',          // Gil
  gcshop: 'https://xivapi.com/i/065000/065005.png',       // GC Seals
  wolfmarks: 'https://xivapi.com/i/065000/065014.png',    // Wolf Marks
  tomestone: 'https://xivapi.com/i/065000/065023.png',    // Tomestones
  achievement: 'https://xivapi.com/i/065000/065059.png',  // Achievement Certificate
  skybuilders: 'https://xivapi.com/i/065000/065073.png',  // Skybuilders' Scrip
  desynth: 'https://xivapi.com/i/000000/000120.png',      // Desynthesis
  trade: 'https://xivapi.com/i/060000/060412.png',        // Trade/Exchange
  aetheryte: 'https://xivapi.com/i/060000/060453.png',    // Aetheryte
  dungeon: 'https://xivapi.com/i/061000/061801.png',      // Dungeon
  raid: 'https://xivapi.com/i/061000/061802.png',         // Raid
  trial: 'https://xivapi.com/i/061000/061804.png',        // Trial
  ultimate: 'https://xivapi.com/i/061000/061832.png',     // Ultimate
  deepdungeon: 'https://xivapi.com/i/061000/061824.png',  // Deep Dungeon
  treasure: 'https://xivapi.com/i/061000/061808.png',     // Treasure Hunt
};

// Local icons (stored in public/icons/)
const LOCAL_ICONS = {
  quest: 'icons/quest.png',      // Quest reward
  venture: 'icons/venture.png',  // Retainer Venture
  voyage: 'icons/voyage.png',    // Voyages (Submarine/Airship)
};

// Job icons (local files in public/icons/jobs/)
const JOB_ICONS = {
  // Crafters (by craftType)
  carpenter: 'icons/jobs/Carpenter.png',     // 0
  blacksmith: 'icons/jobs/Blacksmith.png',   // 1
  armorer: 'icons/jobs/Armorer.png',         // 2
  goldsmith: 'icons/jobs/Goldsmith.png',     // 3
  leatherworker: 'icons/jobs/Leatherworker.png', // 4
  weaver: 'icons/jobs/Weaver.png',           // 5
  alchemist: 'icons/jobs/Alchemist.png',     // 6
  culinarian: 'icons/jobs/Culinarian.png',   // 7
  // Gatherers
  miner: 'icons/jobs/Miner.png',             // 0, 1
  botanist: 'icons/jobs/Botanist.png',       // 2, 3
  fisher: 'icons/jobs/Fisher.png',           // 4, 5
};

// Map craftType to job icon
const CRAFT_TYPE_ICONS: Record<number, string> = {
  0: JOB_ICONS.carpenter,
  1: JOB_ICONS.blacksmith,
  2: JOB_ICONS.armorer,
  3: JOB_ICONS.goldsmith,
  4: JOB_ICONS.leatherworker,
  5: JOB_ICONS.weaver,
  6: JOB_ICONS.alchemist,
  7: JOB_ICONS.culinarian,
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

// Helper to render icon (either image or emoji)
function SourceIcon({ src, alt, emoji }: { src?: string; alt?: string; emoji?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || ''}
        className="w-8 h-8 object-contain"
        loading="lazy"
      />
    );
  }
  return <span className="text-2xl">{emoji || '📦'}</span>;
}

function formatPrice(price: number): string {
  return price.toLocaleString('zh-TW');
}

interface GatheringPointDisplay {
  placeName: string;
  x: number;
  y: number;
  level: number;
  timeRestriction?: boolean;
  startTime?: number;
  endTime?: number;
  gatheringType?: number;
}

interface SourceDisplay {
  type: string;
  iconUrl?: string;    // Image URL for icon
  iconEmoji?: string;  // Fallback emoji
  title: string;
  subtitle?: string;
  detail?: string;
  mobNames?: string[];
  totalMobs?: number;
  instanceNames?: string[];
  instanceContentTypes?: number[];
  totalInstances?: number;
  mapNames?: string[];
  totalMaps?: number;
  questId?: number;
  questName?: string;
  desynthItemIds?: number[];
  totalDesynthItems?: number;
  vendors?: VendorInfo[];
  currencyItemId?: number;
  currencyItemIcon?: number;  // Currency item icon ID
  currencyItemName?: string;  // Currency item name
  currencyAmount?: number;    // Amount of currency needed
  gatheringPoints?: GatheringPointDisplay[];
  voyageNames?: string[];
  totalVoyages?: number;
  // Venture data
  ventureQuantities?: VentureQuantity[];
  ventureCategory?: number; // 17 = Mining, 18 = Botany
}

// Helper to get icon URL for currency items
function getCurrencyIconUrl(currencyItemId: number): string | undefined {
  // Tomestones (28-46)
  if (currencyItemId >= 28 && currencyItemId <= 46) {
    return XIVAPI_ICONS.tomestone;
  }
  // GC Seals (25-27)
  if (currencyItemId >= 25 && currencyItemId <= 27) {
    return XIVAPI_ICONS.gcshop;
  }
  // MGP (29)
  if (currencyItemId === 29) {
    return 'https://xivapi.com/i/065000/065025.png';
  }
  // Wolf Marks (25)
  if (currencyItemId === 25) {
    return XIVAPI_ICONS.wolfmarks;
  }
  // Skybuilders' Scrip (28XXX range)
  if (currencyItemId >= 28000 && currencyItemId <= 28999) {
    return XIVAPI_ICONS.skybuilders;
  }
  return undefined;
}

// Helper to get instance icon based on content type
function getInstanceIcon(contentTypes?: number[]): string {
  if (!contentTypes || contentTypes.length === 0) return XIVAPI_ICONS.dungeon;

  // Check for different content types
  const hasRaid = contentTypes.some(t => t === 5);
  const hasTrial = contentTypes.some(t => t === 4);
  const hasUltimate = contentTypes.some(t => t === 28);
  const hasDeepDungeon = contentTypes.some(t => t === 21);

  if (hasUltimate) return XIVAPI_ICONS.ultimate;
  if (hasRaid) return XIVAPI_ICONS.raid;
  if (hasTrial) return XIVAPI_ICONS.trial;
  if (hasDeepDungeon) return XIVAPI_ICONS.deepdungeon;
  return XIVAPI_ICONS.dungeon;
}

export function ObtainView({ itemId, sources, recipes, gatheringPoints }: ObtainViewProps) {
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    zoneName: string;
    x: number;
    y: number;
    npcName?: string;
  }>({ isOpen: false, zoneName: '', x: 0, y: 0 });

  const [questCNNames, setQuestCNNames] = useState<Record<number, string>>({});
  const [instanceCNNames, setInstanceCNNames] = useState<Record<string, string>>({});

  // Load CN names for Huiji Wiki links
  useEffect(() => {
    loadQuestCNNames().then(setQuestCNNames);
    loadInstanceCNNames().then(setInstanceCNNames);
  }, []);

  const allSources: SourceDisplay[] = [];

  // Add crafting sources
  recipes.forEach((recipe) => {
    const iconPath = CRAFT_TYPE_ICONS[recipe.craftType];
    allSources.push({
      type: 'craft',
      iconUrl: iconPath ? `${import.meta.env.BASE_URL}${iconPath}` : undefined,
      iconEmoji: iconPath ? undefined : '🔨',
      title: '製作',
      subtitle: recipe.craftTypeName || '製作師',
      detail: `Lv.${recipe.recipeLevel}${recipe.stars > 0 ? ' ★'.repeat(recipe.stars) : ''}`,
    });
  });

  // Add gathering sources - group by gathering type and include all points
  const gatheringByType = new Map<number, GatheringPoint[]>();
  gatheringPoints.forEach((point) => {
    if (!gatheringByType.has(point.gatheringType)) {
      gatheringByType.set(point.gatheringType, []);
    }
    gatheringByType.get(point.gatheringType)!.push(point);
  });

  gatheringByType.forEach((points, gatheringType) => {
    const iconPath = GATHERING_TYPE_ICONS[gatheringType];
    const firstPoint = points[0];

    // Get min and max levels
    const levels = points.map(p => p.level);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const levelText = minLevel === maxLevel ? `Lv.${minLevel}` : `Lv.${minLevel}-${maxLevel}`;

    // Use gathering type name as title (e.g., 採掘, 伐木)
    const gatheringTypeName = firstPoint.gatheringTypeName || '採集';

    allSources.push({
      type: 'gather',
      iconUrl: iconPath ? `${import.meta.env.BASE_URL}${iconPath}` : undefined,
      iconEmoji: iconPath ? undefined : '📍',
      title: gatheringTypeName,
      detail: levelText,
      gatheringPoints: points.map(p => ({
        placeName: p.placeName,
        x: p.x,
        y: p.y,
        level: p.level,
        timeRestriction: p.timeRestriction,
        startTime: p.startTime,
        endTime: p.endTime,
        gatheringType: p.gatheringType,
      })),
    });
  });

  // Add other sources (shops, drops, ventures, etc.)
  sources.forEach((source) => {
    let detail = '';

    if (source.type === 'drop') {
      // Mob drop source
      allSources.push({
        type: source.type,
        iconEmoji: '👹',
        title: source.typeName,
        mobNames: source.mobNames,
        totalMobs: source.totalMobs,
      });
      return;
    }

    if (source.type === 'instance') {
      // Instance/dungeon drop source
      allSources.push({
        type: source.type,
        iconUrl: getInstanceIcon(source.instanceContentTypes),
        title: source.typeName,
        instanceNames: source.instanceNames,
        instanceContentTypes: source.instanceContentTypes,
        totalInstances: source.totalInstances,
      });
      return;
    }

    if (source.type === 'treasure') {
      // Treasure map source
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.treasure,
        title: source.typeName,
        mapNames: source.mapNames,
        totalMaps: source.totalMaps,
      });
      return;
    }

    if (source.type === 'quest') {
      // Quest reward source
      allSources.push({
        type: source.type,
        iconUrl: `${import.meta.env.BASE_URL}${LOCAL_ICONS.quest}`,
        title: source.typeName,
        questId: source.questId,
        questName: source.questName,
      });
      return;
    }

    if (source.type === 'desynth') {
      // Desynthesis source
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.desynth,
        title: source.typeName,
        desynthItemIds: source.desynthItemIds,
        totalDesynthItems: source.totalDesynthItems,
      });
      return;
    }

    if (source.type === 'vendor') {
      // Vendor/NPC shop source (Gil)
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.vendor,
        title: source.typeName,
        vendors: source.vendors,
      });
      return;
    }

    if (source.type === 'venture') {
      // Retainer venture
      allSources.push({
        type: source.type,
        iconUrl: `${import.meta.env.BASE_URL}${LOCAL_ICONS.venture}`,
        title: source.typeName,
        detail: source.ventureLevel ? `Lv.${source.ventureLevel}` : undefined,
        ventureQuantities: source.ventureQuantities,
        ventureCategory: source.ventureCategory,
      });
      return;
    }

    if (source.type === 'voyage') {
      // Voyages (Submarine/Airship exploration)
      allSources.push({
        type: source.type,
        iconUrl: `${import.meta.env.BASE_URL}${LOCAL_ICONS.voyage}`,
        title: source.typeName,
        voyageNames: source.voyageNames,
        totalVoyages: source.totalVoyages,
      });
      return;
    }

    // Shop sources (gilshop, gcshop, specialshop)
    if (source.currency === 'gil' && source.price) {
      detail = `${formatPrice(source.price)} Gil`;
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.vendor,
        title: source.typeName,
        detail,
        vendors: source.vendors,
      });
      return;
    }

    if (source.currency === 'gc_seals' && source.price) {
      detail = `${formatPrice(source.price)} 軍票`;
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.gcshop,
        title: source.typeName,
        detail,
      });
      return;
    }

    if (source.currencyItemId && source.price) {
      const currencyItem = getItemById(source.currencyItemId);
      allSources.push({
        type: source.type,
        iconUrl: XIVAPI_ICONS.trade,
        title: source.typeName,
        currencyItemId: source.currencyItemId,
        currencyItemIcon: currencyItem?.icon,
        currencyItemName: currencyItem?.name || '貨幣',
        currencyAmount: source.price,
        vendors: source.vendors,
      });
      return;
    }

    // Fallback for any other source types
    allSources.push({
      type: source.type,
      iconEmoji: '📦',
      title: source.typeName,
      detail,
      vendors: source.vendors, // Include vendors for specialshop sources too
    });
  });

  if (allSources.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--ffxiv-muted)]">
        <div className="text-4xl mb-3">❓</div>
        <p>暫無取得方式資料</p>
        <p className="text-sm mt-1 mb-4">此物品可能來自以下來源：</p>
        <ul className="text-sm text-left max-w-xs mx-auto space-y-1">
          <li>• 副本/迷宮掉落</li>
          <li>• 藏寶圖獎勵</li>
          <li>• 任務獎勵</li>
          <li>• F.A.T.E. 獎勵</li>
          <li>• 其他特殊來源</li>
        </ul>
        <p className="text-xs mt-4">
          <a
            href={`https://ffxivteamcraft.com/db/zh/item/${itemId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--ffxiv-highlight)] hover:underline"
          >
            在 Teamcraft 查看完整資料 →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
        共 {allSources.length} 種取得方式
      </div>

      {allSources.map((source, index) => (
        <div
          key={`${source.type}-${index}`}
          className="flex items-start gap-3 p-3 bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)] hover:border-[var(--ffxiv-highlight)] transition-colors"
        >
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <SourceIcon src={source.iconUrl} alt={source.title} emoji={source.iconEmoji} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--ffxiv-text)]">
                {source.title}
              </span>
              {source.subtitle && (
                <span className="text-sm text-[var(--ffxiv-muted)]">
                  ({source.subtitle})
                </span>
              )}
            </div>
            {source.detail && (
              <div className="text-sm text-[var(--ffxiv-muted)] mt-0.5">
                {source.detail}
              </div>
            )}
            {/* Currency item for exchange sources */}
            {source.currencyItemId && source.currencyAmount && (
              <div className="flex items-center gap-2 mt-1">
                <Link
                  to={`/item/${source.currencyItemId}`}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[var(--ffxiv-card)] rounded hover:bg-[var(--ffxiv-accent)] transition-colors"
                >
                  {source.currencyItemIcon && (
                    <img
                      src={getItemIconUrl(source.currencyItemIcon)}
                      alt={source.currencyItemName}
                      className="w-5 h-5"
                      loading="lazy"
                    />
                  )}
                  <span className="text-sm">{source.currencyItemName}</span>
                  <CopyButton text={source.currencyItemName || ''} />
                </Link>
                <span className="text-sm text-[var(--ffxiv-highlight)]">
                  x{formatPrice(source.currencyAmount)}
                </span>
              </div>
            )}
            {/* Mob names for drop sources */}
            {source.mobNames && source.mobNames.length > 0 && (
              <div className="text-sm text-[var(--ffxiv-muted)] mt-1">
                <div className="flex flex-wrap gap-1">
                  {source.mobNames.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[var(--ffxiv-card)] rounded text-xs"
                    >
                      {name}
                    </span>
                  ))}
                  {source.totalMobs && source.totalMobs > 5 && (
                    <span className="px-2 py-0.5 text-xs text-[var(--ffxiv-muted)]">
                      ...還有 {source.totalMobs - 5} 個怪物
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Instance names for dungeon/raid sources */}
            {source.instanceNames && source.instanceNames.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {source.instanceNames.map((name, i) => {
                  const cnName = instanceCNNames[name];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm font-medium">{name}</span>
                      <CopyButton text={name} />
                      {cnName && (
                        <a
                          href={`https://ff14.huijiwiki.com/wiki/${encodeURIComponent(cnName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded text-xs transition-colors"
                        >
                          前往灰機
                        </a>
                      )}
                    </div>
                  );
                })}
                {source.totalInstances && source.totalInstances > 5 && (
                  <span className="text-sm text-[var(--ffxiv-muted)]">
                    ...還有 {source.totalInstances - 5} 個副本
                  </span>
                )}
              </div>
            )}
            {/* Map/coffer names for treasure sources */}
            {source.mapNames && source.mapNames.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {source.mapNames.map((name, i) => {
                  const treasureItem = getItemByName(name);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {treasureItem ? (
                        <>
                          <img
                            src={getItemIconUrl(treasureItem.icon)}
                            alt=""
                            className="w-6 h-6"
                          />
                          <Link
                            to={`/item/${treasureItem.id}`}
                            className="text-sm text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline"
                          >
                            {name}
                          </Link>
                          <CopyButton text={name} />
                        </>
                      ) : (
                        <span className="text-sm">{name}</span>
                      )}
                    </div>
                  );
                })}
                {source.totalMaps && source.totalMaps > 5 && (
                  <span className="text-sm text-[var(--ffxiv-muted)]">
                    ...還有 {source.totalMaps - 5} 個寶箱
                  </span>
                )}
              </div>
            )}
            {/* Quest name for quest reward sources */}
            {source.questName && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium">
                  {source.questName}
                </span>
                <CopyButton text={source.questName} />
                {source.questId && questCNNames[source.questId] && (
                  <a
                    href={`https://ff14.huijiwiki.com/wiki/任务:${encodeURIComponent(questCNNames[source.questId])}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded text-xs transition-colors"
                  >
                    前往灰機
                  </a>
                )}
              </div>
            )}
            {/* Gathering points with coordinates */}
            {source.gatheringPoints && source.gatheringPoints.length > 0 && (
              <div className="text-sm mt-2 space-y-2">
                {source.gatheringPoints.map((point, i) => {
                  const jobIconPath = point.gatheringType !== undefined ? GATHERING_TYPE_ICONS[point.gatheringType] : undefined;
                  return (
                    <div key={i} className="bg-[var(--ffxiv-bg)] rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {jobIconPath && (
                            <img
                              src={`${import.meta.env.BASE_URL}${jobIconPath}`}
                              alt=""
                              className="w-5 h-5"
                            />
                          )}
                          <span className="font-medium">{point.placeName}</span>
                        </div>
                        <span className="text-xs text-[var(--ffxiv-muted)]">Lv.{point.level}</span>
                      </div>
                      {(point.x !== undefined && point.y !== undefined && (point.x > 0 || point.y > 0)) || point.timeRestriction ? (
                        <div className="text-xs text-[var(--ffxiv-muted)] mt-1">
                          {point.x !== undefined && point.y !== undefined && (point.x > 0 || point.y > 0) && (
                            <span className="text-[var(--ffxiv-highlight)]">
                              X: {point.x.toFixed(1)} - Y: {point.y.toFixed(1)}
                            </span>
                          )}
                          {point.timeRestriction && point.startTime !== undefined && point.endTime !== undefined && (
                            <span className={point.x !== undefined && point.y !== undefined && (point.x > 0 || point.y > 0) ? "ml-2 text-yellow-400" : "text-yellow-400"}>
                              ⏰ {String(point.startTime).padStart(2, '0')}:00 - {String(point.endTime).padStart(2, '0')}:00 ET
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Voyage destination names */}
            {source.voyageNames && source.voyageNames.length > 0 && (
              <div className="text-sm text-[var(--ffxiv-muted)] mt-1">
                <div className="flex flex-wrap gap-1">
                  {source.voyageNames.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[var(--ffxiv-card)] rounded text-xs"
                    >
                      {name}
                    </span>
                  ))}
                  {source.totalVoyages && source.totalVoyages > 5 && (
                    <span className="px-2 py-0.5 text-xs text-[var(--ffxiv-muted)]">
                      ...還有 {source.totalVoyages - 5} 個航點
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Venture quantity thresholds */}
            {source.ventureQuantities && source.ventureQuantities.length > 0 && (
              <div className="text-sm mt-2 space-y-1">
                {source.ventureQuantities.map((q, i) => {
                  const statName = q.stat === 'perception' ? '鑑別力' : '獲得力';
                  const threshold = q.value !== undefined ? q.value : 0;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--ffxiv-muted)]">{statName} &gt; {threshold}</span>
                      <span className="text-[var(--ffxiv-highlight)] font-medium">x{q.quantity}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Desynth items */}
            {source.desynthItemIds && source.desynthItemIds.length > 0 && (
              <div className="text-sm text-[var(--ffxiv-muted)] mt-1">
                <div className="flex flex-wrap gap-1">
                  {source.desynthItemIds.map((desynthItemId) => {
                    const desynthItem = getItemById(desynthItemId);
                    if (!desynthItem) return null;
                    return (
                      <div key={desynthItemId} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--ffxiv-card)] rounded text-xs">
                        <Link
                          to={`/item/${desynthItemId}`}
                          className="flex items-center gap-1 hover:text-[var(--ffxiv-accent)] transition-colors"
                        >
                          <img
                            src={getItemIconUrl(desynthItem.icon)}
                            alt={desynthItem.name}
                            className="w-4 h-4"
                            loading="lazy"
                          />
                          <span>{desynthItem.name}</span>
                        </Link>
                        <CopyButton text={desynthItem.name} />
                      </div>
                    );
                  })}
                  {source.totalDesynthItems && source.totalDesynthItems > 10 && (
                    <span className="px-2 py-0.5 text-xs text-[var(--ffxiv-muted)]">
                      ...還有 {source.totalDesynthItems - 10} 個物品
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Vendor info */}
            {source.vendors && source.vendors.length > 0 && (
              <div className="text-sm mt-2 space-y-2">
                {source.vendors.map((vendor, i) => (
                  <div key={i} className="bg-[var(--ffxiv-bg)] rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{vendor.npcName}</span>
                      {vendor.price !== undefined && (
                        <span className="text-yellow-400">{formatPrice(vendor.price)} Gil</span>
                      )}
                    </div>
                    {vendor.zoneName && (
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-[var(--ffxiv-muted)]">
                          {vendor.zoneName}
                          {vendor.x && vendor.y && (
                            <span className="ml-1 text-[var(--ffxiv-highlight)]">
                              X: {vendor.x.toFixed(1)} - Y: {vendor.y.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {vendor.x && vendor.y && (
                          <button
                            onClick={() => setMapModal({
                              isOpen: true,
                              zoneName: vendor.zoneName,
                              x: vendor.x!,
                              y: vendor.y!,
                              npcName: vendor.npcName,
                            })}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] rounded transition-colors"
                            title="顯示地圖"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            地圖
                          </button>
                        )}
                      </div>
                    )}
                    {vendor.aetheryteName && (
                      <div className="text-xs text-blue-400 mt-0.5">
                        🔷 {vendor.aetheryteName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Recipe ingredients section */}
      {recipes.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-[var(--ffxiv-muted)] mb-3">
            製作材料
          </h4>
          {recipes.map((recipe, recipeIndex) => (
            <div key={recipe.id || recipeIndex} className="space-y-1">
              {recipe.ingredients.map((ing, i) => {
                const item = getItemById(ing.itemId);
                if (!item) return null;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-[var(--ffxiv-bg)] rounded"
                  >
                    <Link
                      to={`/item/${ing.itemId}`}
                      className="flex items-center gap-2 flex-1 min-w-0 hover:text-[var(--ffxiv-accent)] transition-colors"
                    >
                      <div className="w-6 h-6 bg-[var(--ffxiv-card)] rounded overflow-hidden flex-shrink-0">
                        <img
                          src={getItemIconUrl(item.icon)}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-sm truncate">{item.name}</span>
                    </Link>
                    <CopyButton text={item.name} />
                    <span className="text-sm text-[var(--ffxiv-muted)] flex-shrink-0">
                      x{ing.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* External link for more complete data */}
      <div className="mt-6 pt-4 border-t border-[var(--ffxiv-accent)]">
        <p className="text-xs text-[var(--ffxiv-muted)] text-center">
          部分來源（如副本掉落、藏寶圖獎勵）需要社群貢獻資料。
          <a
            href={`https://ffxivteamcraft.com/db/zh/item/${itemId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--ffxiv-highlight)] hover:underline ml-1"
          >
            在 Teamcraft 查看完整資料 →
          </a>
        </p>
      </div>

      {/* Map modal for NPC locations */}
      <MapModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal({ ...mapModal, isOpen: false })}
        zoneName={mapModal.zoneName}
        x={mapModal.x}
        y={mapModal.y}
        npcName={mapModal.npcName}
      />
    </div>
  );
}
