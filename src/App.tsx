// Main App component
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { ItemList } from './components/ItemList';
import { SettingsModal } from './components/SettingsModal';
import { useItemData } from './hooks/useItemData';
import { useSearch } from './hooks/useSearch';
import { PriceCheckListProvider, usePriceCheckList } from './contexts/PriceCheckListContext';
import { AlarmProvider, useAlarms } from './contexts/AlarmContext';
import { EorzeanClock } from './components/EorzeanClock';

// Lazy-loaded route components
const ItemDetail = lazy(() => import('./components/ItemDetail').then(m => ({ default: m.ItemDetail })));
const CraftingSimulator = lazy(() => import('./components/crafting').then(m => ({ default: m.CraftingSimulator })));
const PriceCheckListPage = lazy(() => import('./components/PriceCheckListPage').then(m => ({ default: m.PriceCheckListPage })));
const AlarmsPage = lazy(() => import('./components/AlarmsPage').then(m => ({ default: m.AlarmsPage })));

function HomePage() {
  const { categories, loading, error } = useItemData();
  const { filters, results, totalResults, isSearching, hasSearched, hasMore, updateQuery, updateFilters, resetFilters, loadMore } = useSearch();

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">載入資料時發生錯誤</div>
        <div className="text-sm text-[var(--ffxiv-muted)]">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <SearchBar
          value={filters.query}
          onChange={updateQuery}
          placeholder="搜尋物品名稱..."
        />
      </div>

      {/* Filters (always visible) */}
      <div className="mb-4">
        <FilterPanel
          filters={filters}
          categories={categories}
          onFilterChange={updateFilters}
          onReset={resetFilters}
        />
      </div>

      {/* Results */}
      <ItemList
        results={results}
        totalResults={totalResults}
        loading={loading || isSearching}
        hasSearched={hasSearched}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}

// Header component that uses the price list context
function Header({ onSettingsOpen }: { onSettingsOpen: () => void }) {
  const { itemCount } = usePriceCheckList();
  const { alarmCount } = useAlarms();

  return (
    <header className="bg-[var(--ffxiv-bg-secondary)] border-b border-[var(--ffxiv-border)] sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold text-[var(--ffxiv-text)]">
              FFXIV 繁中物品搜尋
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://cycleapple.github.io/xiv-tc-toolbox/"
              className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
            >
              返回工具箱
            </a>
            <a
              href="https://discord.gg/X556xjySDG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
            >
              加入Discord社群
            </a>
            <a
              href="https://portaly.cc/thecy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
            >
              支持作者
            </a>
            <EorzeanClock />
            <Link
              to="/alarms"
              className="relative p-2 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/10 rounded transition-colors"
              title="採集鬧鐘"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {alarmCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {alarmCount > 99 ? '99+' : alarmCount}
                </span>
              )}
            </Link>
            <Link
              to="/pricelist"
              className="relative p-2 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/10 rounded transition-colors"
              title="查價清單"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--ffxiv-highlight)] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={onSettingsOpen}
              className="p-2 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/10 rounded transition-colors"
              title="設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { loading } = useItemData();

  return (
    <div className="min-h-screen bg-[var(--ffxiv-bg)] flex flex-col">
      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Header */}
      <Header onSettingsOpen={() => setSettingsOpen(true)} />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)] mb-4"></div>
            <div className="text-[var(--ffxiv-muted)]">載入物品資料中...</div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)] mb-4"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/craft/:itemId" element={<CraftingSimulator />} />
              <Route path="/pricelist" element={<PriceCheckListPage />} />
              <Route path="/alarms" element={<AlarmsPage />} />
            </Routes>
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--ffxiv-border)] mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="text-center text-xs text-[var(--ffxiv-muted)]">
            <p className="mb-1">FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All rights reserved.</p>
            <p>
              Credit:{' '}
              <a
                href="https://universalis.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ffxiv-accent)] transition-colors"
              >
                Universalis
              </a>
              {' · '}
              <a
                href="https://xivapi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ffxiv-accent)] transition-colors"
              >
                XIVAPI
              </a>
              {' · '}
              <a
                href="https://github.com/Tnze/ffxiv-best-craft"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ffxiv-accent)] transition-colors"
              >
                ffxiv-best-craft
              </a>
              {' · '}
              <a
                href="https://ffxivteamcraft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ffxiv-accent)] transition-colors"
              >
                Teamcraft
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/ffxiv-item-search-tc">
      <AlarmProvider>
        <PriceCheckListProvider>
          <AppContent />
        </PriceCheckListProvider>
      </AlarmProvider>
    </BrowserRouter>
  );
}

export default App;
