// Settings modal component
import { useState, useEffect } from 'react';
import { useSettings, DEFAULT_CRAFTER_STATS, DEFAULT_TAB_ORDER } from '../hooks/useSettings';
import type { CrafterAttributes } from '../types/crafting';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    crafterStats,
    tabOrder,
    setCrafterStats,
    moveTabUp,
    moveTabDown,
    setTabOrder,
  } = useSettings();

  // Local state for form editing
  const [localStats, setLocalStats] = useState<CrafterAttributes>(crafterStats);

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalStats(crafterStats);
    }
  }, [isOpen, crafterStats]);

  if (!isOpen) return null;

  const handleSave = () => {
    setCrafterStats(localStats);
    onClose();
  };

  const handleReset = () => {
    setLocalStats(DEFAULT_CRAFTER_STATS);
    setTabOrder(DEFAULT_TAB_ORDER);
  };

  const handleStatChange = (key: keyof CrafterAttributes, value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalStats(prev => ({ ...prev, [key]: numValue }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--ffxiv-bg-secondary)] border border-[var(--ffxiv-border)] rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--ffxiv-border)]">
          <h2 className="text-lg font-bold text-[var(--ffxiv-text)]">設定</h2>
          <button
            onClick={onClose}
            className="text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Crafter Stats Section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              製作者屬性
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">等級</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={localStats.level}
                  onChange={(e) => handleStatChange('level', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded text-sm text-[var(--ffxiv-text)] focus:border-[var(--ffxiv-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">作業精度</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={localStats.craftsmanship}
                  onChange={(e) => handleStatChange('craftsmanship', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded text-sm text-[var(--ffxiv-text)] focus:border-[var(--ffxiv-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">加工精度</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={localStats.control}
                  onChange={(e) => handleStatChange('control', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded text-sm text-[var(--ffxiv-text)] focus:border-[var(--ffxiv-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">製作力 (CP)</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={localStats.craft_points}
                  onChange={(e) => handleStatChange('craft_points', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded text-sm text-[var(--ffxiv-text)] focus:border-[var(--ffxiv-accent)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tab Order Section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              物品頁面分頁順序
            </h3>
            <p className="text-xs text-[var(--ffxiv-muted)] mb-2">
              第一個分頁將作為預設顯示的分頁
            </p>
            <div className="space-y-1">
              {tabOrder.map((tab, index) => (
                <div
                  key={tab.id}
                  className="flex items-center gap-2 p-2 bg-[var(--ffxiv-bg)] rounded border border-[var(--ffxiv-border)]"
                >
                  {/* Order number */}
                  <span className="w-5 h-5 flex items-center justify-center text-xs bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)] rounded">
                    {index + 1}
                  </span>

                  {/* Tab name */}
                  <span className="flex-1 text-sm text-[var(--ffxiv-text)]">{tab.name}</span>

                  {/* Move buttons */}
                  <button
                    onClick={() => moveTabUp(index)}
                    disabled={index === 0}
                    className={`p-1 rounded transition-colors ${
                      index === 0
                        ? 'text-[var(--ffxiv-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/10'
                    }`}
                    title="上移"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveTabDown(index)}
                    disabled={index === tabOrder.length - 1}
                    className={`p-1 rounded transition-colors ${
                      index === tabOrder.length - 1
                        ? 'text-[var(--ffxiv-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/10'
                    }`}
                    title="下移"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--ffxiv-border)]">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
          >
            重置為預設
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-[var(--ffxiv-border)] rounded hover:bg-[var(--ffxiv-bg)] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded transition-colors"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
