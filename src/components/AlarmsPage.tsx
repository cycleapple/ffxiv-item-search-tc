import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAlarms, type AlarmEntry } from '../contexts/AlarmContext';
import { EorzeanClock } from './EorzeanClock';
import { MapModal } from './MapModal';
import { getNextSpawnInfo, formatCountdown, type SpawnInfo } from '../utils/eorzeanClock';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { getGatheringPointsForItem } from '../hooks/useItemData';

// Cache for zone map name by ID
let zoneMapNameByIdCache: Record<number, string> | null = null;

async function loadZoneMapNameById(): Promise<Record<number, string>> {
  if (zoneMapNameByIdCache) return zoneMapNameByIdCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`);
    const data = await res.json();
    const maps = (data.maps || {}) as Record<string, { id: number }>;
    zoneMapNameByIdCache = {};
    Object.entries(maps).forEach(([name, info]) => {
      if (info.id) {
        zoneMapNameByIdCache![info.id] = name;
      }
    });
    return zoneMapNameByIdCache;
  } catch {
    return {};
  }
}

interface AlarmWithInfo {
  alarm: AlarmEntry;
  bestSpawn: SpawnInfo;
}

const COLLAPSED_STORAGE_KEY = 'ffxiv-gathering-alarms-collapsed';

function loadCollapsed(): Set<string> {
  try {
    const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

export function AlarmsPage() {
  const { alarms, groups, toggleGroup, createGroup, deleteGroup, renameGroup, removeAlarm, moveAlarm } = useAlarms();
  const [tick, setTick] = useState(0);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsed);
  const [mapNameById, setMapNameById] = useState<Record<number, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(collapsedGroups)));
    } catch { /* ignore */ }
  }, [collapsedGroups]);

  const toggleCollapsed = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    zoneName: string;
    mapId?: number;
    x: number;
    y: number;
  }>({ isOpen: false, zoneName: '', x: 0, y: 0 });

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadZoneMapNameById().then(setMapNameById);
  }, []);

  // Compute sorted alarms with spawn info
  const sortedAlarms: AlarmWithInfo[] = alarms.map(alarm => {
    const infos = getNextSpawnInfo(alarm.spawns, alarm.duration);
    const active = infos.find(i => i.active);
    const nearest = infos.reduce((best, i) => (!best || i.countdown < best.countdown) ? i : best, infos[0]);
    return { alarm, bestSpawn: active || nearest };
  }).sort((a, b) => {
    if (a.bestSpawn.active && !b.bestSpawn.active) return -1;
    if (!a.bestSpawn.active && b.bestSpawn.active) return 1;
    return a.bestSpawn.countdown - b.bestSpawn.countdown;
  });

  void tick;

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup(newGroupName.trim());
    setNewGroupName('');
  };

  const startRename = (groupId: string, currentName: string) => {
    setEditingGroup(groupId);
    setEditName(currentName);
  };

  const handleRename = (groupId: string) => {
    if (editName.trim()) {
      renameGroup(groupId, editName.trim());
    }
    setEditingGroup(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">採集鬧鐘</h2>
          <EorzeanClock />
        </div>
        <span className="text-sm text-[var(--ffxiv-muted)]">
          共 {alarms.length} 個鬧鐘
        </span>
      </div>

      {/* New group input */}
      <div className="flex gap-2">
        <input
          className="px-2 py-1 text-sm bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded outline-none focus:border-[var(--ffxiv-accent)]"
          placeholder="新群組名稱"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
        />
        <button
          onClick={handleCreateGroup}
          className="px-3 py-1 text-sm bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] rounded transition-colors"
        >
          新增群組
        </button>
      </div>

      {/* Grouped alarms list */}
      {alarms.length === 0 ? (
        <div className="text-center py-12 text-[var(--ffxiv-muted)]">
          <div className="text-4xl mb-3">🔔</div>
          <p>尚未設定任何鬧鐘</p>
          <p className="text-sm mt-1">在物品的採集資訊中點擊鈴鐺圖示即可加入</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const groupAlarms = sortedAlarms.filter(a => a.alarm.groupId === group.id);
            const isCollapsed = collapsedGroups.has(group.id);
            const muted = !group.enabled;
            const hasActive = groupAlarms.some(a => a.bestSpawn.active);

            return (
              <div
                key={group.id}
                className="rounded border border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] overflow-hidden"
              >
                {/* Group header (clickable to collapse/expand) */}
                <div
                  onClick={() => toggleCollapsed(group.id)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--ffxiv-bg)] transition-colors select-none"
                >
                  <svg
                    className={`w-4 h-4 text-[var(--ffxiv-muted)] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                    className="flex-shrink-0"
                    title={group.enabled ? '點擊靜音' : '點擊啟用'}
                  >
                    {group.enabled ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[var(--ffxiv-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>
                  {editingGroup === group.id ? (
                    <input
                      className="flex-1 bg-transparent border-b border-[var(--ffxiv-accent)] text-sm outline-none"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onBlur={() => handleRename(group.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(group.id); if (e.key === 'Escape') setEditingGroup(null); }}
                      autoFocus
                    />
                  ) : (
                    <span className={`flex-1 text-sm font-medium ${muted ? 'text-[var(--ffxiv-muted)]' : ''}`}>
                      {group.name}
                      {hasActive && <span className="ml-2 text-xs text-green-400">● 採集中</span>}
                    </span>
                  )}
                  <span className="text-xs text-[var(--ffxiv-muted)]">
                    {groupAlarms.length} 個鬧鐘
                  </span>
                  {editingGroup !== group.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(group.id, group.name); }}
                      className="p-1 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
                      title="重新命名"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  {group.id !== 'default' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                      className="p-1 text-[var(--ffxiv-muted)] hover:text-red-400 transition-colors"
                      title="刪除群組（鬧鐘將移至預設）"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Group body (alarms) */}
                {!isCollapsed && (
                  <div className="border-t border-[var(--ffxiv-border)] p-2 space-y-2">
                    {groupAlarms.length === 0 ? (
                      <div className="text-center py-3 text-xs text-[var(--ffxiv-muted)]">
                        此群組沒有鬧鐘
                      </div>
                    ) : groupAlarms.map(({ alarm, bestSpawn }) => {
                      const item = getItemById(alarm.itemId);

            // Resolve location: prefer stored data, fall back to gathering point lookup
            let locPlace = alarm.placeName;
            let locMapId = alarm.mapId;
            let locX = alarm.x;
            let locY = alarm.y;
            if (!locPlace || !locX || !locY) {
              const pts = getGatheringPointsForItem(alarm.itemId);
              const match = pts.find(p => p.id === alarm.pointId);
              if (match) {
                locPlace = locPlace || match.placeName;
                locMapId = locMapId || match.mapId;
                locX = locX || match.x;
                locY = locY || match.y;
              }
            }
            const hasLocation = locPlace && locX && locY;

            return (
              <div
                key={`${alarm.itemId}-${alarm.pointId}`}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  bestSpawn.active
                    ? 'border-green-500/60 bg-green-900/10 animate-[alarm-pulse_2s_ease-in-out_infinite]'
                    : 'bg-[var(--ffxiv-bg)] border-[var(--ffxiv-border)]'
                } ${muted ? 'opacity-50' : ''}`}
              >
                {/* Item icon */}
                {item && (
                  <Link to={`/item/${item.id}`} className="flex-shrink-0">
                    <img
                      src={getItemIconUrl(item.icon)}
                      alt={item.name}
                      className="w-10 h-10 rounded"
                    />
                  </Link>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item ? (
                      <Link
                        to={`/item/${item.id}`}
                        className="font-medium truncate hover:text-[var(--ffxiv-accent)] transition-colors"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="font-medium">物品 #{alarm.itemId}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-[var(--ffxiv-muted)]">
                      ET {alarm.spawns.map(h => `${String(h).padStart(2, '0')}:00`).join(' / ')}
                    </span>
                    <select
                      value={alarm.groupId}
                      onChange={e => moveAlarm(alarm.itemId, alarm.pointId, e.target.value)}
                      className="text-xs bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded px-1 py-0.5 outline-none cursor-pointer"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Location info */}
                  {hasLocation && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--ffxiv-muted)]">
                        {locMapId && mapNameById[locMapId] && mapNameById[locMapId] !== locPlace
                          ? `${mapNameById[locMapId]} - ${locPlace}`
                          : locPlace}
                      </span>
                      <span className="text-xs text-[var(--ffxiv-highlight)]">
                        X: {locX!.toFixed(1)} Y: {locY!.toFixed(1)}
                      </span>
                      <button
                        onClick={() => setMapModal({
                          isOpen: true,
                          zoneName: locPlace!,
                          mapId: locMapId,
                          x: locX!,
                          y: locY!,
                        })}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] rounded transition-colors"
                        title="顯示地圖"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        地圖
                      </button>
                    </div>
                  )}
                </div>

                {/* Countdown */}
                <div className="flex-shrink-0 text-right">
                  {bestSpawn.active ? (
                    <div className="text-right">
                      <span className="text-green-400 font-mono text-sm">採集中</span>
                      <div className="text-green-400/70 font-mono text-xs">
                        剩餘 {formatCountdown(Math.floor((1 - bestSpawn.progress) * alarm.duration * 175 / 60))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[var(--ffxiv-muted)] font-mono text-sm">
                      {formatCountdown(bestSpawn.countdown)}
                    </span>
                  )}
                  <div
                    className="h-1 rounded mt-1"
                    style={{ width: 80, backgroundColor: 'var(--ffxiv-border)' }}
                  >
                    <div
                      className="h-full rounded transition-[width] duration-1000"
                      style={{
                        width: `${bestSpawn.progress * 100}%`,
                        backgroundColor: bestSpawn.active ? '#22c55e' : '#6b7280',
                      }}
                    />
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeAlarm(alarm.itemId, alarm.pointId)}
                  className="flex-shrink-0 p-1 text-[var(--ffxiv-muted)] hover:text-red-400 transition-colors"
                  title="移除鬧鐘"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Map modal */}
      <MapModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal({ ...mapModal, isOpen: false })}
        zoneName={mapModal.zoneName}
        mapId={mapModal.mapId}
        x={mapModal.x}
        y={mapModal.y}
      />
    </div>
  );
}
