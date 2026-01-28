// Equipment stats view component - displays weapon/armor stats like Teamcraft
import type { EquipmentStats, ItemStat } from '../types';

interface EquipmentStatsViewProps {
  equipStats: EquipmentStats;
  canBeHq?: boolean;
  equipLevel?: number;
  itemLevel?: number;
}

// Stat name translations
const STAT_NAMES: Record<number, string> = {
  1: '力量',
  2: '靈巧',
  3: '耐力',
  4: '智力',
  5: '精神',
  6: '信仰',
  7: '暴擊',
  8: '命中',
  9: '堅韌',
  10: '迴避',
  11: '招架',
  12: '直擊',
  13: '傷害魔法威力',
  14: '治療魔法威力',
  19: '技術力',
  20: '法術速度',
  21: '招架',
  22: '技速',
  27: '工匠性能',
  44: '信念',
  45: '採集力',
  46: '鑑別力',
  68: '作業精度',
  69: '加工精度',
  70: '控制力',
  71: '獲得力',
  72: '鑑別力',
  73: '採集力',
};

// Job abbreviation to XIVAPI job name mapping
// XIVAPI uses /cj/1/{jobname}.png format for job icons
const JOB_NAMES: Record<string, string> = {
  // Tank
  GLA: 'gladiator', PLD: 'paladin',
  MRD: 'marauder', WAR: 'warrior',
  DRK: 'darkknight',
  GNB: 'gunbreaker',
  // Healer
  CNJ: 'conjurer', WHM: 'whitemage',
  SCH: 'scholar',
  AST: 'astrologian',
  SGE: 'sage',
  // Melee DPS
  PGL: 'pugilist', MNK: 'monk',
  LNC: 'lancer', DRG: 'dragoon',
  ROG: 'rogue', NIN: 'ninja',
  SAM: 'samurai',
  RPR: 'reaper',
  VPR: 'viper',
  // Physical Ranged DPS
  ARC: 'archer', BRD: 'bard',
  MCH: 'machinist',
  DNC: 'dancer',
  // Magical Ranged DPS
  THM: 'thaumaturge', BLM: 'blackmage',
  ACN: 'arcanist', SMN: 'summoner',
  RDM: 'redmage',
  PCT: 'pictomancer',
  BLU: 'bluemage',
  // Crafters
  CRP: 'carpenter',
  BSM: 'blacksmith',
  ARM: 'armorer',
  GSM: 'goldsmith',
  LTW: 'leatherworker',
  WVR: 'weaver',
  ALC: 'alchemist',
  CUL: 'culinarian',
  // Gatherers
  MIN: 'miner',
  BTN: 'botanist',
  FSH: 'fisher',
};

// Job abbreviation to Traditional Chinese name mapping
const JOB_NAMES_TC: Record<string, string> = {
  // Tank
  GLA: '劍術士', PLD: '騎士',
  MRD: '斧術士', WAR: '戰士',
  DRK: '暗黑騎士',
  GNB: '絕槍戰士',
  // Healer
  CNJ: '幻術士', WHM: '白魔法師',
  SCH: '學者',
  AST: '占星術士',
  SGE: '賢者',
  // Melee DPS
  PGL: '格鬥士', MNK: '武僧',
  LNC: '槍術士', DRG: '龍騎士',
  ROG: '雙劍士', NIN: '忍者',
  SAM: '武士',
  RPR: '鐮刀師',
  VPR: '蝮蛇劍士',
  // Physical Ranged DPS
  ARC: '弓術士', BRD: '吟遊詩人',
  MCH: '機工士',
  DNC: '舞者',
  // Magical Ranged DPS
  THM: '咒術士', BLM: '黑魔法師',
  ACN: '祕術士', SMN: '召喚師',
  RDM: '赤魔法師',
  PCT: '繪靈法師',
  BLU: '青魔法師',
  // Crafters
  CRP: '木工師',
  BSM: '鍛造師',
  ARM: '甲冑師',
  GSM: '金工師',
  LTW: '皮革師',
  WVR: '裁縫師',
  ALC: '鍊金術師',
  CUL: '烹調師',
  // Gatherers
  MIN: '採礦師',
  BTN: '園藝師',
  FSH: '釣魚師',
};

// Get job icon URL from XIVAPI
function getJobIconUrl(abbr: string): string | null {
  const jobName = JOB_NAMES[abbr];
  if (!jobName) return null;
  return `https://xivapi.com/cj/1/${jobName}.png`;
}

// Parse job abbreviations from classJobCategoryName (e.g., "GLA PLD MRD WAR")
function parseJobAbbreviations(categoryName: string): string[] {
  return categoryName.split(/\s+/).filter(abbr => abbr && JOB_NAMES[abbr]);
}

// Format stat value display
function formatStatValue(value: number, hqBonus?: number): React.ReactNode {
  if (hqBonus && hqBonus > 0) {
    return (
      <span className="flex items-center gap-1">
        <span>{value}</span>
        <span className="text-[var(--ffxiv-highlight)]">(+{hqBonus})</span>
      </span>
    );
  }
  return value;
}

// Get stat name (prefer data name, fallback to our translations)
function getStatName(stat: ItemStat): string {
  return stat.name || STAT_NAMES[stat.id] || `屬性 ${stat.id}`;
}

// Job icon component
function JobIcon({ abbr, size = 20 }: { abbr: string; size?: number }) {
  const iconUrl = getJobIconUrl(abbr);
  if (!iconUrl) return null;

  const tcName = JOB_NAMES_TC[abbr] || abbr;

  return (
    <img
      src={iconUrl}
      alt={tcName}
      title={tcName}
      className="inline-block"
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export function EquipmentStatsView({ equipStats, canBeHq, equipLevel, itemLevel }: EquipmentStatsViewProps) {
  const hasWeaponStats = equipStats.physicalDamage || equipStats.magicDamage;
  const hasDefenseStats = equipStats.physicalDefense || equipStats.magicDefense;
  const hasStats = equipStats.stats && equipStats.stats.length > 0;

  // Build HQ bonus lookup
  const hqBonusMap = new Map<number, number>();
  if (canBeHq && equipStats.hqStats) {
    equipStats.hqStats.forEach(stat => {
      hqBonusMap.set(stat.id, stat.value);
    });
  }

  // Parse job abbreviations for icons
  const jobAbbrs = equipStats.classJobCategoryName
    ? parseJobAbbreviations(equipStats.classJobCategoryName)
    : [];

  return (
    <div className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-[var(--ffxiv-card)] border-b border-[var(--ffxiv-border)]">
        <h3 className="text-sm font-medium text-[var(--ffxiv-highlight)]">裝備屬性</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Job/Class restrictions with icons */}
        {equipStats.classJobCategoryName && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[var(--ffxiv-muted)]">職業</span>
            <div className="flex items-center gap-1 flex-wrap">
              {jobAbbrs.map((abbr) => (
                <JobIcon key={abbr} abbr={abbr} size={24} />
              ))}
            </div>
            {jobAbbrs.length === 0 && (
              <span className="text-sm font-medium">{equipStats.classJobCategoryName}</span>
            )}
          </div>
        )}

        {/* Levels row */}
        {(equipLevel || itemLevel) && (
          <div className="flex gap-6">
            {equipLevel !== undefined && equipLevel > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--ffxiv-muted)]">裝備等級</span>
                <span className="text-sm font-medium">{equipLevel}</span>
              </div>
            )}
            {itemLevel !== undefined && itemLevel > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--ffxiv-muted)]">品級</span>
                <span className="text-sm font-medium">{itemLevel}</span>
              </div>
            )}
          </div>
        )}

        {/* Weapon stats (Damage, Delay, Auto-attack) */}
        {hasWeaponStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {equipStats.physicalDamage && equipStats.physicalDamage > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">物理基本性能</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.physicalDamage}</div>
              </div>
            )}
            {equipStats.magicDamage && equipStats.magicDamage > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">魔法基本性能</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.magicDamage}</div>
              </div>
            )}
            {equipStats.autoAttack && equipStats.autoAttack > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">自動攻擊</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.autoAttack.toFixed(2)}</div>
              </div>
            )}
            {equipStats.delay && equipStats.delay > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">攻擊間隔</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{(equipStats.delay / 1000).toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {/* Defense stats */}
        {hasDefenseStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {equipStats.physicalDefense && equipStats.physicalDefense > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">物理防禦力</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.physicalDefense}</div>
              </div>
            )}
            {equipStats.magicDefense && equipStats.magicDefense > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">魔法防禦力</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.magicDefense}</div>
              </div>
            )}
            {equipStats.blockRate && equipStats.blockRate > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">格擋發動力</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.blockRate}</div>
              </div>
            )}
            {equipStats.blockStrength && equipStats.blockStrength > 0 && (
              <div className="bg-[var(--ffxiv-bg-tertiary)] rounded p-2">
                <div className="text-xs text-[var(--ffxiv-muted)]">格擋性能</div>
                <div className="text-lg font-bold text-[var(--ffxiv-text)]">{equipStats.blockStrength}</div>
              </div>
            )}
          </div>
        )}

        {/* Base params (stats) */}
        {hasStats && (
          <div className="space-y-2">
            <div className="text-xs text-[var(--ffxiv-muted)] uppercase tracking-wide">屬性</div>
            <div className="grid grid-cols-2 gap-2">
              {equipStats.stats.map((stat) => {
                const hqBonus = hqBonusMap.get(stat.id);
                return (
                  <div
                    key={stat.id}
                    className="flex items-center justify-between px-3 py-2 bg-[var(--ffxiv-bg-tertiary)] rounded"
                  >
                    <span className="text-sm text-[var(--ffxiv-text)]">{getStatName(stat)}</span>
                    <span className="text-sm font-medium text-[var(--ffxiv-highlight)]">
                      {formatStatValue(stat.value, hqBonus)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment info (materia, repair, etc.) */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {equipStats.materiaSlots !== undefined && equipStats.materiaSlots > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--ffxiv-muted)]">魔晶石孔數</span>
              <span className="font-medium">{equipStats.materiaSlots}</span>
              {equipStats.isAdvancedMeldingPermitted && (
                <span className="text-xs text-[var(--ffxiv-success)]">(可禁斷)</span>
              )}
            </div>
          )}
          {equipStats.repairClassName && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--ffxiv-muted)]">修理職業</span>
              <JobIcon abbr={equipStats.repairClassName} size={20} />
            </div>
          )}
          {equipStats.dyeCount !== undefined && equipStats.dyeCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--ffxiv-muted)]">可染色</span>
              <span className="font-medium">{equipStats.dyeCount > 1 ? `${equipStats.dyeCount} 部位` : '是'}</span>
            </div>
          )}
          {equipStats.isUnique && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--ffxiv-muted)]">稀有物品</span>
              <span className="font-medium text-[var(--ffxiv-warning)]">是</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
