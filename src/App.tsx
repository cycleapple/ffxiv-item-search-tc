// Main App component
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { ItemList } from './components/ItemList';
import { ItemDetail } from './components/ItemDetail';
import { CraftingSimulator } from './components/crafting';
import { SettingsModal } from './components/SettingsModal';
import { useItemData } from './hooks/useItemData';
import { useSearch } from './hooks/useSearch';

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

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { loading } = useItemData();

  useEffect(() => {
    if (!loading) {
      setDataLoaded(true);
    }
  }, [loading]);

  return (
    <BrowserRouter basename="/ffxiv-item-search-tc">
      <div className="min-h-screen bg-[var(--ffxiv-bg)] flex flex-col">
        {/* Settings Modal */}
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Header */}
        <header className="bg-[var(--ffxiv-bg-secondary)] border-b border-[var(--ffxiv-border)] sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/ffxiv-item-search-tc/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold text-[var(--ffxiv-text)]">
                  FFXIV 繁中物品搜尋
                </h1>
              </a>
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
                <button
                  onClick={() => setSettingsOpen(true)}
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

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
          {!dataLoaded && loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)] mb-4"></div>
              <div className="text-[var(--ffxiv-muted)]">載入物品資料中...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/craft/:itemId" element={<CraftingSimulator />} />
            </Routes>
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
    </BrowserRouter>
  );
}

export default App;
