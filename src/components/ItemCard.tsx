// Item card component for search results
import { Link } from 'react-router-dom';
import type { Item } from '../types';
import { getItemIconUrl } from '../services/xivapiService';
import { CopyButton } from './CopyButton';
import { AddToPriceListButton } from './AddToPriceListButton';
import { AlarmButton } from './AlarmButton';
import { getGatheringPointsForItem } from '../hooks/useItemData';

interface ItemCardProps {
  item: Item;
}

function getRarityClass(rarity: number): string {
  switch (rarity) {
    case 1:
      return 'rarity-common';
    case 2:
      return 'rarity-uncommon';
    case 3:
      return 'rarity-rare';
    case 4:
      return 'rarity-relic';
    case 7:
      return 'rarity-aetherial';
    default:
      return 'rarity-common';
  }
}

export function ItemCard({ item }: ItemCardProps) {
  const iconUrl = getItemIconUrl(item.icon);

  return (
    <Link
      to={`/item/${item.id}`}
      className="block bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded-lg p-3 hover:border-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-card-hover)] transition-all shadow-[var(--ffxiv-shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-[var(--ffxiv-bg-tertiary)] rounded overflow-hidden">
          <img
            src={iconUrl}
            alt={item.name}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getItemIconUrl(0);
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className={`font-medium truncate ${getRarityClass(item.rarity)}`}>
                {item.name}
              </h3>
              <CopyButton text={item.name} />
            </div>
            <span className="flex-shrink-0 text-xs text-[var(--ffxiv-muted)]">
              Lv.{item.itemLevel}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ffxiv-muted)]">
            <span>{item.categoryName}</span>
            {item.isCraftable && (
              <span className="px-1.5 py-0.5 bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)] rounded">製作</span>
            )}
            {item.isGatherable && (
              <span className="px-1.5 py-0.5 bg-[var(--ffxiv-success)]/20 text-[var(--ffxiv-success)] rounded">採集</span>
            )}
            {item.canBeHq && (
              <span className="px-1.5 py-0.5 bg-[var(--ffxiv-highlight)]/20 text-[var(--ffxiv-highlight)] rounded">HQ</span>
            )}
            {!item.isUntradable && (
              <AddToPriceListButton itemId={item.id} variant="small" />
            )}
            {item.isGatherable && (() => {
              const timedPoints = getGatheringPointsForItem(item.id)
                .filter(p => p.spawns && p.spawns.length > 0 && p.duration);
              if (timedPoints.length === 0) return null;
              return timedPoints.map(p => (
                <AlarmButton
                  key={p.id}
                  itemId={p.itemId}
                  pointId={p.id}
                  spawns={p.spawns!}
                  duration={p.duration!}
                  placeName={p.placeName}
                  mapId={p.mapId}
                  x={p.x}
                  y={p.y}
                />
              ));
            })()}
          </div>
        </div>
      </div>
    </Link>
  );
}
