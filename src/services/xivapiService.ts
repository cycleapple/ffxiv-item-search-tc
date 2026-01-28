// XIVAPI service for item icons

const XIVAPI_BASE = 'https://xivapi.com';

/**
 * Get item icon URL from XIVAPI
 * Icon IDs follow a specific pattern for folder structure
 */
export function getItemIconUrl(iconId: number, hq = false): string {
  // Icon path format: /i/XXXYYY/XXXYYY.png where XXX is the folder (iconId / 1000 * 1000)
  const folder = Math.floor(iconId / 1000) * 1000;
  const folderStr = folder.toString().padStart(6, '0');
  const iconStr = iconId.toString().padStart(6, '0');

  const suffix = hq ? '_hr1' : '';
  return `${XIVAPI_BASE}/i/${folderStr}/${iconStr}${suffix}.png`;
}

/**
 * Get a placeholder icon for items without icons
 */
export function getPlaceholderIconUrl(): string {
  return `${XIVAPI_BASE}/i/000000/000000.png`;
}

/**
 * Get job icon URL
 */
export function getJobIconUrl(jobId: number): string {
  // Job icons are in the 062000 range
  const iconId = 62000 + jobId;
  return getItemIconUrl(iconId);
}
