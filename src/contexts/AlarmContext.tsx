import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getNextSpawnInfo } from '../utils/eorzeanClock';

export interface AlarmEntry {
  itemId: number;
  pointId: number;
  spawns: number[];
  duration: number;
  groupId: string;
}

export interface AlarmGroup {
  id: string;
  name: string;
  enabled: boolean;
}

interface AlarmState {
  alarms: AlarmEntry[];
  groups: AlarmGroup[];
}

const STORAGE_KEY = 'ffxiv-gathering-alarms';
const DEFAULT_GROUP: AlarmGroup = { id: 'default', name: '預設', enabled: true };

function loadState(): AlarmState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.groups && parsed.groups.length > 0) return parsed;
      return { alarms: parsed.alarms || [], groups: [DEFAULT_GROUP] };
    }
  } catch (e) {
    console.error('Failed to load alarms:', e);
  }
  return { alarms: [], groups: [DEFAULT_GROUP] };
}

function saveState(state: AlarmState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save alarms:', e);
  }
}

interface AlarmContextValue {
  alarms: AlarmEntry[];
  groups: AlarmGroup[];
  addAlarm: (alarm: Omit<AlarmEntry, 'groupId'>, groupId?: string) => void;
  removeAlarm: (itemId: number, pointId: number) => void;
  isAlarmSet: (itemId: number, pointId: number) => boolean;
  moveAlarm: (itemId: number, pointId: number, newGroupId: string) => void;
  toggleGroup: (groupId: string) => void;
  createGroup: (name: string) => string;
  deleteGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  alarmCount: number;
}

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlarmState>(loadState);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Notification checker
  useEffect(() => {
    if (state.alarms.length === 0) return;

    const check = () => {
      state.alarms.forEach((alarm) => {
        const group = state.groups.find(g => g.id === alarm.groupId);
        if (!group?.enabled) return;

        const infos = getNextSpawnInfo(alarm.spawns, alarm.duration);
        infos.forEach((info) => {
          if (info.active || info.countdown > 15) return;
          const key = `${alarm.itemId}-${alarm.pointId}-${info.startHour}`;
          if (notifiedRef.current.has(key)) return;
          notifiedRef.current.add(key);

          // Clear after the window passes (duration in real seconds)
          const clearAfter = (alarm.duration * 175 / 60 + 60) * 1000;
          setTimeout(() => notifiedRef.current.delete(key), clearAfter);

          if (Notification.permission === 'granted') {
            new Notification('採集鬧鐘', {
              body: `物品 #${alarm.itemId} 即將出現！(ET ${String(info.startHour).padStart(2, '0')}:00)`,
              icon: `${import.meta.env.BASE_URL}favicon.ico`,
            });
          }
        });
      });
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [state.alarms, state.groups]);

  const addAlarm = useCallback((alarm: Omit<AlarmEntry, 'groupId'>, groupId?: string) => {
    setState(prev => {
      if (prev.alarms.some(a => a.itemId === alarm.itemId && a.pointId === alarm.pointId)) return prev;
      return {
        ...prev,
        alarms: [...prev.alarms, { ...alarm, groupId: groupId || 'default' }],
      };
    });
    // Request notification permission on first add
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const removeAlarm = useCallback((itemId: number, pointId: number) => {
    setState(prev => ({
      ...prev,
      alarms: prev.alarms.filter(a => !(a.itemId === itemId && a.pointId === pointId)),
    }));
  }, []);

  const isAlarmSet = useCallback((itemId: number, pointId: number): boolean => {
    return state.alarms.some(a => a.itemId === itemId && a.pointId === pointId);
  }, [state.alarms]);

  const moveAlarm = useCallback((itemId: number, pointId: number, newGroupId: string) => {
    setState(prev => ({
      ...prev,
      alarms: prev.alarms.map(a =>
        a.itemId === itemId && a.pointId === pointId ? { ...a, groupId: newGroupId } : a
      ),
    }));
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, enabled: !g.enabled } : g),
    }));
  }, []);

  const createGroup = useCallback((name: string): string => {
    const id = `group-${Date.now()}`;
    setState(prev => ({
      ...prev,
      groups: [...prev.groups, { id, name, enabled: true }],
    }));
    return id;
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    if (groupId === 'default') return;
    setState(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId),
      alarms: prev.alarms.map(a => a.groupId === groupId ? { ...a, groupId: 'default' } : a),
    }));
  }, []);

  const renameGroup = useCallback((groupId: string, name: string) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, name } : g),
    }));
  }, []);

  const alarmCount = useMemo(() => state.alarms.length, [state.alarms]);

  const value = useMemo(() => ({
    alarms: state.alarms,
    groups: state.groups,
    addAlarm,
    removeAlarm,
    isAlarmSet,
    moveAlarm,
    toggleGroup,
    createGroup,
    deleteGroup,
    renameGroup,
    alarmCount,
  }), [state.alarms, state.groups, addAlarm, removeAlarm, isAlarmSet, moveAlarm, toggleGroup, createGroup, deleteGroup, renameGroup, alarmCount]);

  return (
    <AlarmContext.Provider value={value}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarms(): AlarmContextValue {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarms must be used within an AlarmProvider');
  }
  return context;
}
