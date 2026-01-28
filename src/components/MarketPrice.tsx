// Market price component
import { useMarketData, useWorldSelector } from '../hooks/useMarketData';
import { formatPrice, formatRelativeTime } from '../services/universalisApi';

interface MarketPriceProps {
  itemId: number;
  isUntradable?: boolean;
}

export function MarketPrice({ itemId, isUntradable }: MarketPriceProps) {
  const { marketData, loading, error, selectedWorld, setSelectedWorld, refresh } =
    useMarketData(itemId);
  const { dataCenters } = useWorldSelector();

  if (isUntradable) {
    return (
      <div className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
        <div className="text-center text-[var(--ffxiv-muted)]">此物品無法交易</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
      {/* Server selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--ffxiv-muted)]">伺服器:</label>
          <select
            value={selectedWorld}
            onChange={(e) => setSelectedWorld(e.target.value)}
            className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-accent)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--ffxiv-highlight)]"
          >
            {dataCenters.map((dc) => (
              <optgroup key={dc.name} label={dc.region}>
                <option value={dc.name}>
                  {dc.name} (全伺服器)
                </option>
                {dc.worlds.map((world) => (
                  <option key={world.id} value={world.name}>
                    {world.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-[var(--ffxiv-highlight)] hover:underline disabled:opacity-50"
        >
          {loading ? '載入中...' : '重新整理'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--ffxiv-highlight)] border-t-transparent"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-4 text-[var(--ffxiv-muted)]">{error}</div>
      )}

      {/* Market data */}
      {marketData && !loading && (
        <div className="space-y-4">
          {/* Price summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--ffxiv-card)] rounded p-3">
              <div className="text-xs text-[var(--ffxiv-muted)] mb-1">最低價格 (NQ)</div>
              <div className="text-lg font-medium text-green-400">
                {marketData.minPriceNQ > 0 ? `${formatPrice(marketData.minPriceNQ)} gil` : '-'}
              </div>
            </div>
            <div className="bg-[var(--ffxiv-card)] rounded p-3">
              <div className="text-xs text-[var(--ffxiv-muted)] mb-1">最低價格 (HQ)</div>
              <div className="text-lg font-medium text-yellow-400">
                {marketData.minPriceHQ > 0 ? `${formatPrice(marketData.minPriceHQ)} gil` : '-'}
              </div>
            </div>
          </div>

          {/* Listings */}
          {marketData.listings && marketData.listings.length > 0 && (
            <div>
              <div className="text-sm text-[var(--ffxiv-muted)] mb-2">
                目前上架 ({marketData.listingsCount})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {marketData.listings.slice(0, 10).map((listing, i) => (
                  <div
                    key={listing.listingID || i}
                    className="flex items-center justify-between p-2 bg-[var(--ffxiv-card)] rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {listing.hq && (
                        <span className="text-yellow-400 text-xs">HQ</span>
                      )}
                      <span>x{listing.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--ffxiv-muted)]">
                        {listing.retainerName}
                      </span>
                      <span className="font-medium">
                        {formatPrice(listing.pricePerUnit)} gil
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent history */}
          {marketData.recentHistory && marketData.recentHistory.length > 0 && (
            <div>
              <div className="text-sm text-[var(--ffxiv-muted)] mb-2">近期交易</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {marketData.recentHistory.slice(0, 5).map((sale, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-[var(--ffxiv-card)] rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {sale.hq && <span className="text-yellow-400 text-xs">HQ</span>}
                      <span>x{sale.quantity}</span>
                      <span className="text-xs text-[var(--ffxiv-muted)]">
                        {formatRelativeTime(sale.timestamp)}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatPrice(sale.pricePerUnit)} gil
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last update time */}
          {marketData.lastUploadTime && (
            <div className="text-xs text-[var(--ffxiv-muted)] text-right">
              資料更新: {formatRelativeTime(marketData.lastUploadTime)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
