import { createContext, useContext } from 'react';

interface DetailNavigationContextType {
  navigateToItem: (id: number) => void;
}

export const DetailNavigationContext = createContext<DetailNavigationContextType | null>(null);

export function useDetailNavigation() {
  return useContext(DetailNavigationContext);
}
