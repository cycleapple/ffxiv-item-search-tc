// Add to price check list button component
import { usePriceCheckList } from '../hooks/usePriceCheckList';

interface AddToPriceListButtonProps {
  itemId: number;
  variant?: 'icon' | 'small' | 'button';
  className?: string;
}

export function AddToPriceListButton({ itemId, variant = 'icon', className = '' }: AddToPriceListButtonProps) {
  const { isInList, toggleItem } = usePriceCheckList();
  const inList = isInList(itemId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(itemId);
  };

  // Icon only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-1 rounded transition-colors ${
          inList
            ? 'text-[var(--ffxiv-highlight)] bg-[var(--ffxiv-highlight)]/20 hover:bg-[var(--ffxiv-highlight)]/30'
            : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-highlight)]/10'
        } ${className}`}
        title={inList ? '從清單移除' : '加入追蹤'}
      >
        <svg className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>
    );
  }

  // Small text variant
  if (variant === 'small') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
          inList
            ? 'text-[var(--ffxiv-highlight)] bg-[var(--ffxiv-highlight)]/20 hover:bg-[var(--ffxiv-highlight)]/30'
            : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-highlight)]/10'
        } ${className}`}
        title={inList ? '從清單移除' : '加入追蹤'}
      >
        <svg className="w-3.5 h-3.5" fill={inList ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        {inList ? '已加入' : '加入追蹤'}
      </button>
    );
  }

  // Full button variant
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        inList
          ? 'text-[var(--ffxiv-highlight)] bg-[var(--ffxiv-highlight)]/20 hover:bg-[var(--ffxiv-highlight)]/30 border border-[var(--ffxiv-highlight)]'
          : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-highlight)] hover:bg-[var(--ffxiv-highlight)]/10 border border-[var(--ffxiv-border)]'
      } ${className}`}
    >
      <svg className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      {inList ? '已加入追蹤清單' : '加入追蹤清單'}
    </button>
  );
}
