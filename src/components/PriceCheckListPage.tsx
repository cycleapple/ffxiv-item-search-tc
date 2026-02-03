// Price check list page component
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePriceCheckList } from '../hooks/usePriceCheckList';
import { usePriceCheckListData, type QualityFilter } from '../hooks/usePriceCheckListData';
import { useOwnedMaterials } from '../hooks/useOwnedMaterials';
import { PriceCheckListItemComponent } from './PriceCheckListItem';
import { PriceCheckTreeView } from './PriceCheckTreeView';
import type { ImportMode } from '../contexts/PriceCheckListContext';
import type { PriceCheckListItem } from '../types';

type ViewMode = 'list' | 'tree';

export function PriceCheckListPage() {
  const navigate = useNavigate();
  const { list, removeItem, clearList, updateQuantity, importList } = usePriceCheckList();
  const { ownedMaterials, setOwned, clearAll: clearOwned } = useOwnedMaterials();
  const [showCrystals, setShowCrystals] = useState(false);
  const [showOwned, setShowOwned] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('both');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importData, setImportData] = useState<PriceCheckListItem[] | null>(null);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate export text
  const exportText = JSON.stringify(list.map(item => ({
    itemId: item.itemId,
    quantity: item.quantity,
  })));

  // Copy export text to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = exportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Parse import text
  const handleParseImport = () => {
    setImportError(null);
    try {
      const json = JSON.parse(importText.trim());
      // Support both raw array and wrapped format
      const items = Array.isArray(json) ? json : json.items;
      if (!Array.isArray(items)) {
        setImportError('無效的格式，需要是陣列');
        return;
      }
      // Validate items have required fields
      const validItems = items.filter((item: unknown): item is PriceCheckListItem =>
        typeof item === 'object' && item !== null && 'itemId' in item && typeof (item as { itemId: unknown }).itemId === 'number'
      ).map(item => ({
        itemId: item.itemId,
        quantity: item.quantity || 1,
        addedAt: item.addedAt || Date.now(),
      }));

      if (validItems.length === 0) {
        setImportError('沒有找到有效的物品資料');
        return;
      }

      setImportData(validItems);
    } catch {
      setImportError('無法解析，請確認是有效的 JSON 格式');
    }
  };

  // Handle import with selected mode
  const handleImport = (mode: ImportMode) => {
    if (!importData) return;
    const result = importList(importData, mode);
    setImportResult(result);
  };

  // Close modals and reset state
  const closeExportModal = () => {
    setShowExportModal(false);
    setCopied(false);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportText('');
    setImportData(null);
    setImportResult(null);
    setImportError(null);
  };

  const {
    items,
    loading,
    error,
    refresh,
  } = usePriceCheckListData(list, showCrystals, qualityFilter);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回搜尋
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--ffxiv-text)]">
          查價清單 ({list.length})
        </h1>
        <div className="flex items-center gap-2">
          {/* Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-sm text-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-highlight)]/10 rounded transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            匯入
          </button>
          {/* Export button */}
          {list.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 text-sm text-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-highlight)]/10 rounded transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              匯出
            </button>
          )}
          {/* Clear button */}
          {list.length > 0 && (
            <button
              onClick={clearList}
              className="px-3 py-1.5 text-sm text-[var(--ffxiv-error)] hover:bg-[var(--ffxiv-error)]/10 rounded transition-colors"
            >
              清空清單
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      {list.length > 0 && (
        <div className="flex items-center justify-between p-4 mb-4 bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-[var(--ffxiv-bg)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--ffxiv-accent)] text-white'
                    : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  清單
                </span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-[var(--ffxiv-accent)] text-white'
                    : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  樹狀
                </span>
              </button>
            </div>

            {/* Quality filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--ffxiv-muted)]">品質:</label>
              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
                className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--ffxiv-highlight)]"
              >
                <option value="both">NQ + HQ (取便宜)</option>
                <option value="nq">只看 NQ</option>
                <option value="hq">只看 HQ</option>
              </select>
            </div>

            {/* Show crystals toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showCrystals}
                onChange={(e) => setShowCrystals(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
              />
              <span className="text-[var(--ffxiv-muted)]">顯示水晶</span>
            </label>

            {/* Show owned toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOwned}
                onChange={(e) => setShowOwned(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
              />
              <span className="text-[var(--ffxiv-muted)]">擁有數量</span>
            </label>
          </div>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="text-sm text-[var(--ffxiv-highlight)] hover:underline disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理價格'}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && list.length > 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ffxiv-highlight)] border-t-transparent"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-8 text-[var(--ffxiv-muted)]">{error}</div>
      )}

      {/* Empty state */}
      {list.length === 0 && (
        <div className="text-center py-16 bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)]">
          <svg className="w-20 h-20 mx-auto text-[var(--ffxiv-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="text-lg text-[var(--ffxiv-muted)] mb-2">清單是空的</div>
          <div className="text-sm text-[var(--ffxiv-muted)] mb-4">
            在搜尋結果或物品詳情頁點擊「加入查價」來新增物品
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded-lg transition-colors"
          >
            開始搜尋物品
          </Link>
        </div>
      )}

      {/* Content based on view mode */}
      {!loading && list.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {items.map((data) => (
                <PriceCheckListItemComponent
                  key={data.listItem.itemId}
                  data={data}
                  showCrystals={showCrystals}
                  qualityFilter={qualityFilter}
                  onRemove={removeItem}
                />
              ))}
            </div>
          ) : (
            <PriceCheckTreeView
              items={items}
              qualityFilter={qualityFilter}
              onRemove={removeItem}
              ownedMaterials={ownedMaterials}
              onOwnedChange={setOwned}
              onOwnedClear={clearOwned}
              onQuantityChange={updateQuantity}
              showOwned={showOwned}
            />
          )}
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeExportModal}>
          <div
            className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] p-6 max-w-lg w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--ffxiv-text)] mb-4">
              匯出查價清單
            </h2>

            <p className="text-sm text-[var(--ffxiv-muted)] mb-3">
              複製以下內容分享給其他人：
            </p>

            <div className="relative">
              <textarea
                readOnly
                value={exportText}
                className="w-full h-32 p-3 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded-lg text-sm font-mono text-[var(--ffxiv-text)] resize-none focus:outline-none focus:border-[var(--ffxiv-highlight)]"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    已複製
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    複製
                  </>
                )}
              </button>
              <button
                onClick={closeExportModal}
                className="px-4 py-2 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeImportModal}>
          <div
            className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] p-6 max-w-lg w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--ffxiv-text)] mb-4">
              匯入查價清單
            </h2>

            {!importResult ? (
              !importData ? (
                <>
                  <p className="text-sm text-[var(--ffxiv-muted)] mb-3">
                    貼上匯出的清單內容：
                  </p>

                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='[{"itemId":12345,"quantity":1},...]'
                    className="w-full h-32 p-3 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded-lg text-sm font-mono text-[var(--ffxiv-text)] resize-none focus:outline-none focus:border-[var(--ffxiv-highlight)] placeholder:text-[var(--ffxiv-muted)]/50"
                  />

                  {importError && (
                    <p className="text-sm text-[var(--ffxiv-error)] mt-2">{importError}</p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleParseImport}
                      disabled={!importText.trim()}
                      className="flex-1 py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      解析
                    </button>
                    <button
                      onClick={closeImportModal}
                      className="px-4 py-2 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--ffxiv-muted)] mb-4">
                    即將匯入 <span className="text-[var(--ffxiv-highlight)] font-medium">{importData.length}</span> 個物品。
                    {list.length > 0 && ` 目前清單有 ${list.length} 個物品。`}
                  </p>

                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => handleImport('replace')}
                      className="w-full p-3 text-left rounded-lg border border-[var(--ffxiv-border)] hover:border-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-bg)] transition-colors"
                    >
                      <div className="font-medium text-[var(--ffxiv-text)]">覆蓋</div>
                      <div className="text-xs text-[var(--ffxiv-muted)]">清空現有清單，使用匯入的資料取代</div>
                    </button>

                    <button
                      onClick={() => handleImport('merge')}
                      className="w-full p-3 text-left rounded-lg border border-[var(--ffxiv-border)] hover:border-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-bg)] transition-colors"
                    >
                      <div className="font-medium text-[var(--ffxiv-text)]">合併</div>
                      <div className="text-xs text-[var(--ffxiv-muted)]">新增不存在的物品，重複的物品會累加數量</div>
                    </button>
                  </div>

                  <button
                    onClick={() => setImportData(null)}
                    className="w-full py-2 text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
                  >
                    返回
                  </button>
                </>
              )
            ) : (
              <>
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto text-[var(--ffxiv-success)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-[var(--ffxiv-text)] font-medium mb-2">匯入完成</div>
                  <div className="text-sm text-[var(--ffxiv-muted)] space-y-1">
                    {importResult.added > 0 && <div>新增 {importResult.added} 個物品</div>}
                    {importResult.updated > 0 && <div>更新 {importResult.updated} 個物品</div>}
                    {importResult.skipped > 0 && <div>跳過 {importResult.skipped} 個重複物品</div>}
                  </div>
                </div>

                <button
                  onClick={closeImportModal}
                  className="w-full py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded-lg transition-colors"
                >
                  確定
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
