// Main App component
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { ItemList } from './components/ItemList';
import { ItemDetail } from './components/ItemDetail';
import { useItemData } from './hooks/useItemData';
import { useSearch } from './hooks/useSearch';

function HomePage() {
  const { categories, loading, error } = useItemData();
  const { filters, results, isSearching, hasSearched, updateQuery, updateFilters, resetFilters } = useSearch();

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
      <ItemList results={results} loading={loading || isSearching} hasSearched={hasSearched} />
    </div>
  );
}

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const { loading } = useItemData();

  useEffect(() => {
    if (!loading) {
      setDataLoaded(true);
    }
  }, [loading]);

  return (
    <BrowserRouter basename="/ffxiv-item-search-tc">
      <div className="min-h-screen bg-[var(--ffxiv-bg)] flex flex-col">
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
                >
                  工具箱
                </a>
                <a
                  href="https://universalis.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
                >
                  Universalis
                </a>
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
            </Routes>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--ffxiv-border)] mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="text-center text-xs text-[var(--ffxiv-muted)]">
              <p className="mb-1">FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All rights reserved.</p>
              <p>
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
                  href="https://github.com/miaki3457/ffxiv-datamining-tc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ffxiv-accent)] transition-colors"
                >
                  資料來源
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
