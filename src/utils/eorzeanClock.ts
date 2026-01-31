// 1 Eorzean hour = 175 real seconds
// 1 Eorzean day = 70 real minutes
const EORZEA_MULTIPLIER = 3600 / 175;

export interface EorzeanTime {
  hours: number;
  minutes: number;
  seconds: number;
}

export function getEorzeanTime(): EorzeanTime {
  const now = Date.now();
  const eorzeanMs = now * EORZEA_MULTIPLIER;
  const eorzeanSeconds = Math.floor(eorzeanMs / 1000);

  const hours = Math.floor(eorzeanSeconds / 3600) % 24;
  const minutes = Math.floor(eorzeanSeconds / 60) % 60;
  const seconds = eorzeanSeconds % 60;

  return { hours, minutes, seconds };
}

export interface SpawnInfo {
  /** Seconds until the window starts (0 if active) */
  countdown: number;
  /** Whether this window is currently active */
  active: boolean;
  /** Progress 0-1 (for active: how much time elapsed; for inactive: how close to spawn) */
  progress: number;
  /** The spawn start hour */
  startHour: number;
  /** The spawn end hour */
  endHour: number;
}

/**
 * For each spawn window, compute countdown / active status / progress.
 * @param spawns Array of Eorzean start hours (0-23)
 * @param duration Duration in Eorzean minutes
 */
export function getNextSpawnInfo(spawns: number[], duration: number): SpawnInfo[] {
  if (!spawns || spawns.length === 0) return [];

  const et = getEorzeanTime();
  const nowMinutes = et.hours * 60 + et.minutes + et.seconds / 60;
  const dayMinutes = 24 * 60; // 1440

  return spawns.map((startHour) => {
    const startMin = startHour * 60;
    const endMin = startMin + duration;
    const endHour = Math.floor(endMin / 60) % 24;

    // Check if currently inside the window (handle wrap-around)
    let active = false;
    let elapsed = 0;
    if (endMin <= dayMinutes) {
      // No wrap
      active = nowMinutes >= startMin && nowMinutes < endMin;
      elapsed = nowMinutes - startMin;
    } else {
      // Wraps past midnight
      active = nowMinutes >= startMin || nowMinutes < (endMin % dayMinutes);
      elapsed = nowMinutes >= startMin
        ? nowMinutes - startMin
        : nowMinutes + dayMinutes - startMin;
    }

    if (active) {
      const progress = Math.min(elapsed / duration, 1);
      return { countdown: 0, active: true, progress, startHour, endHour };
    }

    // Calculate time until next spawn
    let untilMinutes = startMin - nowMinutes;
    if (untilMinutes <= 0) untilMinutes += dayMinutes;

    // Convert Eorzean minutes to real seconds: 1 Ez minute = 175/60 real seconds
    const countdownSeconds = Math.floor(untilMinutes * (175 / 60));

    // Progress: how close we are (1 = just ended, 0 = about to spawn)
    // Use the gap between end of this window and next start as the total wait
    const gapMinutes = dayMinutes - duration; // total non-active time per cycle if single spawn
    const progress = gapMinutes > 0 ? 1 - (untilMinutes / gapMinutes) : 0;

    return {
      countdown: countdownSeconds,
      active: false,
      progress: Math.max(0, Math.min(1, progress)),
      startHour,
      endHour,
    };
  });
}

/** Get the smallest countdown across all spawn windows (real seconds). Returns 0 if active. */
export function getMinCountdown(spawns: number[], duration: number): number {
  const infos = getNextSpawnInfo(spawns, duration);
  if (infos.length === 0) return Infinity;
  if (infos.some(i => i.active)) return 0;
  return Math.min(...infos.map(i => i.countdown));
}

/** Format seconds into H:MM:SS */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
