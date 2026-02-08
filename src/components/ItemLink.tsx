import { Link } from 'react-router-dom';
import { useDetailNavigation } from '../contexts/DetailNavigationContext';
import type { ReactNode, MouseEvent } from 'react';

interface ItemLinkProps {
  itemId: number;
  className?: string;
  children: ReactNode;
}

export function ItemLink({ itemId, className, children }: ItemLinkProps) {
  const detailNav = useDetailNavigation();

  if (detailNav) {
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      detailNav.navigateToItem(itemId);
    };

    return (
      <a
        href={`/item/${itemId}`}
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={`/item/${itemId}`} className={className}>
      {children}
    </Link>
  );
}
