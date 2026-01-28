// Universalis API service for market data
import type { MarketData, DataCenter, World } from '../types';

const UNIVERSALIS_BASE = 'https://universalis.app/api/v2';

// 繁體中文伺服器 (Traditional Chinese servers)
export const DATA_CENTERS: DataCenter[] = [
  {
    name: '陸行鳥',
    region: '繁中服',
    worlds: [
      { id: 4028, name: '伊弗利特' },
      { id: 4029, name: '迦樓羅' },
      { id: 4030, name: '利維坦' },
      { id: 4031, name: '鳳凰' },
      { id: 4032, name: '奧汀' },
      { id: 4033, name: '巴哈姆特' },
      { id: 4034, name: '拉姆' },
      { id: 4035, name: '泰坦' },
    ],
  },
];

/**
 * Get all worlds as a flat list
 */
export function getAllWorlds(): World[] {
  return DATA_CENTERS.flatMap(dc => dc.worlds);
}

/**
 * Get market data for an item on a specific world
 */
export async function getMarketData(
  itemId: number,
  worldOrDc: string | number
): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `${UNIVERSALIS_BASE}/${worldOrDc}/${itemId}?listings=20&entries=20`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Item not found or not tradeable
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return null;
  }
}

/**
 * Get market data for multiple items
 */
export async function getMultipleMarketData(
  itemIds: number[],
  worldOrDc: string | number
): Promise<Record<number, MarketData>> {
  if (itemIds.length === 0) return {};

  // Universalis supports up to 100 items per request
  const chunks: number[][] = [];
  for (let i = 0; i < itemIds.length; i += 100) {
    chunks.push(itemIds.slice(i, i + 100));
  }

  const results: Record<number, MarketData> = {};

  for (const chunk of chunks) {
    try {
      const response = await fetch(
        `${UNIVERSALIS_BASE}/${worldOrDc}/${chunk.join(',')}?listings=5&entries=5`
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.items) {
        // Multiple items response
        for (const [id, itemData] of Object.entries(data.items)) {
          results[parseInt(id)] = itemData as MarketData;
        }
      } else if (data.itemID) {
        // Single item response
        results[data.itemID] = data;
      }
    } catch (error) {
      console.error('Failed to fetch market data for chunk:', error);
    }
  }

  return results;
}

/**
 * Format price with commas
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('zh-TW');
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;

  return new Date(timestamp * 1000).toLocaleDateString('zh-TW');
}

/**
 * Format timestamp to date and time (MM/DD HH:mm)
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}
