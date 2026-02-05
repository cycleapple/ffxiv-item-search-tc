// Tooltip component showing recent market listings
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ListingInfo } from '../types';
import { formatPrice } from '../services/universalisApi';

interface ListingsTooltipProps {
  listings?: ListingInfo[];
  lastUploadTime?: number;
  children: React.ReactNode;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes}分鐘前`;
  if (hours < 24) return `${hours}小時前`;
  if (days < 7) return `${days}天前`;

  return new Date(timestamp * 1000).toLocaleDateString('zh-TW');
}

export function ListingsTooltip({ listings, lastUploadTime, children }: ListingsTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      let y = triggerRect.top - tooltipRect.height - 8;

      // Adjust if tooltip goes off screen horizontally
      if (x < 8) x = 8;
      if (x + tooltipRect.width > viewportWidth - 8) {
        x = viewportWidth - tooltipRect.width - 8;
      }

      // If tooltip goes off top, show below instead
      if (y < 8) {
        y = triggerRect.bottom + 8;
      }

      // If tooltip goes off bottom, adjust
      if (y + tooltipRect.height > viewportHeight - 8) {
        y = viewportHeight - tooltipRect.height - 8;
      }

      setPosition({ x, y });
    }
  }, [isVisible]);

  if (!listings || listings.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-[var(--ffxiv-bg-secondary)] border border-[var(--ffxiv-border)] rounded-lg shadow-lg p-3 min-w-[280px] max-w-[360px]"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <div className="text-xs text-[var(--ffxiv-muted)] mb-2">最近掛單 (按價格排序)</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--ffxiv-muted)] border-b border-[var(--ffxiv-border)]">
                <th className="text-left py-1 pr-2">價格</th>
                <th className="text-left py-1 pr-2">數量</th>
                <th className="text-left py-1 pr-2">伺服器</th>
                <th className="text-right py-1">更新</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, index) => (
                <tr
                  key={index}
                  className={`border-b border-[var(--ffxiv-border)]/50 ${
                    index === 0 ? 'text-[var(--ffxiv-highlight)]' : ''
                  }`}
                >
                  <td className="py-1.5 pr-2">
                    <span className={listing.hq ? 'text-yellow-400' : 'text-green-400'}>
                      {listing.hq && <span className="mr-1">HQ</span>}
                      {formatPrice(listing.price)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--ffxiv-muted)]">
                    x{listing.quantity}
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--ffxiv-text)]">
                    {listing.server}
                  </td>
                  <td className="py-1.5 text-right text-[var(--ffxiv-muted)]">
                    {formatRelativeTime(listing.lastReviewTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lastUploadTime && (
            <div className="text-xs text-[var(--ffxiv-muted)] mt-2 pt-2 border-t border-[var(--ffxiv-border)]/50 text-right">
              資料更新: {formatRelativeTime(lastUploadTime)}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
