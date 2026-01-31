// Prefetch helpers for lazy-loaded route components

let itemDetailPrefetched = false;

export function prefetchItemDetail() {
  if (itemDetailPrefetched) return;
  itemDetailPrefetched = true;
  import('./components/ItemDetail');
}
