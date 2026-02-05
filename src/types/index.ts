// Item types
export interface Item {
  id: number;
  name: string;
  description: string;
  icon: number;
  itemLevel: number;
  equipLevel: number;
  rarity: number;
  categoryId: number;
  categoryName: string;
  canBeHq: boolean;
  stackSize: number;
  isUntradable: boolean;
  classJobCategory?: number;
  // Flags for quick filtering
  isCraftable?: boolean;
  isGatherable?: boolean;
  // Patch version (e.g., "2.3", "7.0")
  patch?: string;
  // Equipment stats (only for equippable items)
  equipStats?: EquipmentStats;
  // Food/medicine effects (for consumables)
  foodEffects?: FoodEffects;
}

// Equipment stats for weapons and armor
export interface EquipmentStats {
  // Weapon stats
  physicalDamage?: number;
  magicDamage?: number;
  delay?: number;        // Attack speed in ms
  autoAttack?: number;   // Calculated: damage / 3 * delay / 1000
  // Defense stats
  physicalDefense?: number;
  magicDefense?: number;
  blockRate?: number;
  blockStrength?: number;
  // Base params (stats)
  stats: ItemStat[];
  // HQ bonus stats (if canBeHq)
  hqStats?: ItemStat[];
  // Equipment info
  classJobCategoryName?: string;  // e.g., "GLA PLD"
  repairClassId?: number;
  repairClassName?: string;       // e.g., "BSM"
  materiaSlots?: number;
  isAdvancedMeldingPermitted?: boolean;
  dyeCount?: number;
  isUnique?: boolean;
  sellPrice?: number;
  gcSealPrice?: number;           // Grand Company seal value
}

export interface ItemStat {
  id: number;
  name: string;
  value: number;
}

// Food/medicine effects for consumables
export interface FoodEffects {
  expBonus: number;           // EXP bonus percentage (e.g., 3 = 3%)
  bonuses: FoodBonus[];       // Stat bonuses
}

export interface FoodBonus {
  paramId: number;            // BaseParam ID
  paramName: string;          // Localized stat name
  isRelative: boolean;        // True = percentage, False = flat value
  value: number;              // NQ value (percentage or flat)
  max: number;                // NQ max cap
  valueHq: number;            // HQ value
  maxHq: number;              // HQ max cap
}

export interface ItemCategory {
  id: number;
  name: string;
}

export interface ClassJob {
  id: number;
  name: string;
  abbreviation: string;
}

export interface ClassJobCategory {
  id: number;
  name: string;
  jobs: number[];
}

// Recipe types
export interface Recipe {
  id: number;
  itemId: number;
  craftType: number;
  craftTypeName: string;
  recipeLevel: number;
  stars: number;
  ingredients: RecipeIngredient[];
  resultAmount: number;
  // Crafting requirements
  requiredCraftsmanship?: number;
  requiredControl?: number;
  // Recipe level details
  classJobLevel?: number;
  difficulty?: number;    // Progress required
  quality?: number;       // Quality cap
  durability?: number;
  // Master recipe book requirement
  secretRecipeBook?: number;  // Item ID of required master book
  // Material quality factor (determines HQ ingredient quality contribution)
  materialQualityFactor?: number;
}

export interface RecipeIngredient {
  itemId: number;
  amount: number;
}

// Gathering types
export interface GatheringPoint {
  id: number;
  itemId: number;
  gatheringType: number;
  gatheringTypeName: string;
  level: number;
  stars?: string;
  placeNameId: number;
  placeName: string;
  mapId: number;
  x: number;
  y: number;
  radius?: number;
  // Node type flags
  legendary?: boolean;
  ephemeral?: boolean;
  // Timed node info
  timeRestriction?: boolean;
  spawns?: number[];
  duration?: number;
  startTime?: number;
  endTime?: number;
  // Requirements
  folklore?: number;
  perceptionReq?: number;
}

// Market data types (Universalis API)
export interface MarketData {
  itemID: number;
  worldID: number;
  lastUploadTime: number;
  listings: MarketListing[];
  recentHistory: MarketHistory[];
  currentAveragePrice: number;
  currentAveragePriceNQ: number;
  currentAveragePriceHQ: number;
  regularSaleVelocity: number;
  nqSaleVelocity: number;
  hqSaleVelocity: number;
  averagePrice: number;
  averagePriceNQ: number;
  averagePriceHQ: number;
  minPrice: number;
  minPriceNQ: number;
  minPriceHQ: number;
  maxPrice: number;
  maxPriceNQ: number;
  maxPriceHQ: number;
  stackSizeHistogram: Record<string, number>;
  stackSizeHistogramNQ: Record<string, number>;
  stackSizeHistogramHQ: Record<string, number>;
  listingsCount: number;
  recentHistoryCount: number;
  unitsForSale: number;
  unitsSold: number;
}

export interface MarketListing {
  listingID: string;
  hq: boolean;
  pricePerUnit: number;
  quantity: number;
  total: number;
  retainerName: string;
  retainerCity: number;
  lastReviewTime: number;
  worldName?: string;  // Available when querying data center
  worldID?: number;    // Available when querying data center
}

export interface MarketHistory {
  hq: boolean;
  pricePerUnit: number;
  quantity: number;
  timestamp: number;
  buyerName: string;
  worldName?: string;  // Available when querying data center
  worldID?: number;    // Available when querying data center
}

// World/Server types
export interface World {
  id: number;
  name: string;
}

export interface DataCenter {
  name: string;
  region: string;
  worlds: World[];
}

// Search/Filter types
export interface SearchFilters {
  query: string;
  categoryId: number | null;
  minLevel: number;
  maxLevel: number;
  minEquipLevel: number;
  maxEquipLevel: number;
  classJobId: number | null;
  selectedJobs: string[];         // Selected job abbreviations for "worn by" filter
  craftableOnly: boolean;
  gatherableOnly: boolean;
  canBeHq: boolean | null;        // null = any, true = HQ only, false = NQ only
  tradeable: boolean | null;      // null = any, true = tradeable, false = untradeable
  rarity: number | null;          // 1-4 (white, green, blue, purple)
  patch: string | null;           // e.g., "7.0", "6.5"
}

export interface SearchResult {
  item: Item;
  score: number;
}

// Data files structure
export interface ItemsData {
  items: Record<number, Item>;
  categories: ItemCategory[];
}

export interface RecipesData {
  recipes: Record<number, Recipe[]>; // keyed by itemId
  craftTypes: { id: number; name: string }[];
}

export interface GatheringData {
  points: Record<number, GatheringPoint[]>; // keyed by itemId
  gatheringTypes: { id: number; name: string }[];
  places: Record<number, string>;
}

// Item source types (how to obtain)
export interface ItemSource {
  type: 'gilshop' | 'gcshop' | 'specialshop' | 'craft' | 'gather' | 'duty' | 'quest' | 'drop' | 'venture' | 'voyage' | 'desynth' | 'instance' | 'treasure' | 'vendor';
  typeName: string;
  price?: number;
  currency?: string;
  currencyItemId?: number;
  // For mob drops
  mobIds?: number[];
  mobNames?: string[];
  totalMobs?: number;
  // For instance drops (dungeons, raids, trials)
  instanceNames?: string[];
  instanceContentTypes?: number[];  // 2=Dungeon, 4=Trial, 5=Raid, 28=Ultimate
  totalInstances?: number;
  // For treasure map drops
  mapNames?: string[];
  totalMaps?: number;
  // For quest rewards
  questId?: number;
  questName?: string;
  // For desynthesis
  desynthItemIds?: number[];
  totalDesynthItems?: number;
  // For vendor/NPC shops
  vendors?: VendorInfo[];
  // For voyage (submarine/airship)
  voyageNames?: string[];
  totalVoyages?: number;
  // For retainer ventures
  ventureLevel?: number;
  ventureQuantities?: VentureQuantity[];
  ventureCategory?: number; // 17 = Mining, 18 = Botany
}

export interface VentureQuantity {
  quantity: number;
  stat: 'perception' | 'gathering';
  value?: number; // Required stat value (undefined = > 0)
}

export interface VendorInfo {
  npcName: string;
  price: number;
  zoneName: string;
  x?: number;
  y?: number;
  aetheryteName?: string;
}

export interface SourcesData {
  sources: Record<number, ItemSource[]>; // keyed by itemId
}

// Mob position data for monster drop maps
export interface MobPositionEntry {
  x: number;
  y: number;
  level: number;
}

export interface MobMapGroup {
  mapId: number;
  zoneName: string;
  mapPath: string;
  sizeFactor: number;
  positions: MobPositionEntry[];
}

export interface MobPositionData {
  [bnpcNameId: string]: {
    positions: MobMapGroup[];
  };
}

// Simplified listing info for tooltip display
export interface ListingInfo {
  price: number;
  quantity: number;
  server: string;
  hq: boolean;
  lastReviewTime: number;
}

// Crafting tree node for price calculation
export interface CraftingTreeNode {
  item: Item;
  recipe: Recipe | null;           // If craftable
  quantity: number;                // Required amount
  marketPriceNQ: number | null;    // NQ market price per unit
  marketPriceHQ: number | null;    // HQ market price per unit
  serverNQ: string;                // Server with cheapest NQ price
  serverHQ: string;                // Server with cheapest HQ price
  craftCost: number | null;        // Total craft cost
  children: CraftingTreeNode[];    // Child materials
  depth: number;                   // Tree depth level
  isCollapsed?: boolean;           // UI collapse state
  listings?: ListingInfo[];        // Recent listings for tooltip
  lastUploadTime?: number;         // Market data last upload time (Unix timestamp in seconds)
}

// Price check list item for tracking items to compare prices
export interface PriceCheckListItem {
  itemId: number;
  quantity: number;
  addedAt: number;
}
