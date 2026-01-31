#!/usr/bin/env node
/**
 * Data processing script for FFXIV item search
 * Converts CSV files from ffxiv-datamining-tc to optimized JSON
 */

import { createReadStream, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Teamcraft data URLs
const TEAMCRAFT_DROP_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/drop-sources.json';
const TEAMCRAFT_MOBS = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/mobs.json';
const TEAMCRAFT_VENTURE_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/venture-sources.json';
const TEAMCRAFT_DESYNTH = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/desynth.json';
const TEAMCRAFT_INSTANCE_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/instance-sources.json';
const TEAMCRAFT_INSTANCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/instances.json';
const TEAMCRAFT_LOOT_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/loot-sources.json';
const TEAMCRAFT_QUEST_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/quest-sources.json';
const TEAMCRAFT_QUESTS = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/quests.json';
const TEAMCRAFT_ITEM_PATCH = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/item-patch.json';
const TEAMCRAFT_PATCH_NAMES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/patch-names.json';
const TEAMCRAFT_EXTRACTS = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/extracts/extracts.json';
const TEAMCRAFT_NPCS = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/npcs.json';
const TEAMCRAFT_PLACES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/places.json';
const TEAMCRAFT_AETHERYTES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/aetherytes.json';
const TEAMCRAFT_VOYAGE_SOURCES = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/voyage-sources.json';
const TEAMCRAFT_MAPS = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/maps.json';

// CN datamining for Huiji Wiki links
const CN_QUEST_CSV = 'https://raw.githubusercontent.com/thewakingsands/ffxiv-datamining-cn/master/Quest.csv';
const CN_CONTENT_FINDER_CSV = 'https://raw.githubusercontent.com/thewakingsands/ffxiv-datamining-cn/master/ContentFinderCondition.csv';

// Multilingual item names from datamining repos
const ITEM_CSV_EN = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/Item.csv';
const ITEM_CSV_JA = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/ja/Item.csv';
const ITEM_CSV_CN = 'https://raw.githubusercontent.com/thewakingsands/ffxiv-datamining-cn/master/Item.csv';

// Recipe level table for crafting simulator (from xivapi datamining - has more fields than TC repo)
const RECIPE_LEVEL_TABLE_CSV = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/RecipeLevelTable.csv';

// DataType enum from Teamcraft (for extracts.json)
const DataType = {
  CRAFTED_BY: 1,
  TRADE_SOURCES: 2,
  VENDORS: 3,
  REDUCED_FROM: 4,
  DESYNTHS: 5,
  INSTANCES: 6,
  GATHERED_BY: 7,
  GARDENING: 8,
  VOYAGES: 9,
  DROPS: 10,
  ALARMS: 11,
  MASTERBOOKS: 12,
  TREASURES: 13,
  FATES: 14,
  VENTURES: 15,
  QUESTS: 19,
};

// English datamining repo for name mapping
const EN_CONTENT_FINDER = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/ContentFinderCondition.csv';

// Garland Tools API for more comprehensive data
const GARLAND_ITEM_BASE = 'https://www.garlandtools.org/db/doc/item/en/3/';

/**
 * Fetch JSON from URL
 */
async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error fetching ${url}:`, error.message);
    return null;
  }
}

/**
 * Fetch and parse CSV from URL
 */
async function fetchCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch CSV ${url}: ${response.status}`);
      return [];
    }
    const text = await response.text();
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    // First line is headers
    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic cases)
      const values = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);

      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      records.push(record);
    }

    return records;
  } catch (error) {
    console.warn(`Error fetching CSV ${url}:`, error.message);
    return [];
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DATA_REPO_PATH = process.env.DATA_REPO_PATH || join(__dirname, '..', '..', 'ffxiv-datamining-tc');
const OUTPUT_PATH = join(__dirname, '..', 'public', 'data');

// Temporary storage for items-index (populated by processItems, finalized after processMultilingualNames)
let globalIndexFields = [];
let globalIndexItems = [];
let globalIndexCategories = [];

// Ensure output directory exists
if (!existsSync(OUTPUT_PATH)) {
  mkdirSync(OUTPUT_PATH, { recursive: true });
}

/**
 * Parse a CSV file and return rows as objects
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const headers = [];
    let headersParsed = false;
    let skipNextRow = false;

    if (!existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      resolve([]);
      return;
    }

    createReadStream(filePath, { encoding: 'utf-8' })
      .pipe(parse({ relaxColumnCount: true }))
      .on('data', (row) => {
        // First row contains column indices (skip)
        if (!headersParsed) {
          headersParsed = true;
          skipNextRow = true;
          return;
        }
        // Second row contains column names
        if (skipNextRow) {
          skipNextRow = false;
          headers.push(...row);
          return;
        }
        // Third row onwards is data
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        records.push(record);
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

/**
 * Process Item.csv
 */
async function processItems() {
  console.log('Processing items...');

  const items = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Item.csv'));
  const categories = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ItemUICategory.csv'));
  const recipes = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Recipe.csv'));
  const gatheringItems = await parseCSV(join(DATA_REPO_PATH, 'csv', 'GatheringItem.csv'));
  const baseParams = await parseCSV(join(DATA_REPO_PATH, 'csv', 'BaseParam.csv'));
  const classJobs = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ClassJob.csv'));
  const classJobCategories = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ClassJobCategory.csv'));
  const itemActions = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ItemAction.csv'));
  const itemFoods = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ItemFood.csv'));

  // Fetch patch data from Teamcraft
  console.log('Fetching patch data...');
  const [itemPatch, patchNames] = await Promise.all([
    fetchJSON(TEAMCRAFT_ITEM_PATCH),
    fetchJSON(TEAMCRAFT_PATCH_NAMES),
  ]);

  // Build patch version map (patchId -> version string)
  const patchVersionMap = new Map();
  if (patchNames) {
    for (const [patchId, patchInfo] of Object.entries(patchNames)) {
      if (patchInfo.version) {
        patchVersionMap.set(parseInt(patchId), patchInfo.version);
      }
    }
    console.log(`Loaded ${patchVersionMap.size} patch versions`);
  }

  // Build BaseParam map (stat ID -> name)
  const baseParamMap = new Map();
  baseParams.forEach((bp) => {
    const id = parseInt(bp['#'] || bp.key || '0');
    const name = (bp['Name'] || '').replace(/<hex:[^>]+>/g, '').trim();
    if (id > 0 && name) {
      baseParamMap.set(id, name);
    }
  });
  console.log(`Loaded ${baseParamMap.size} base params`);

  // Build ItemFood map (ID -> food bonus data)
  // ItemFood columns: EXPBonus%, BaseParam[0-2], IsRelative[0-2], Value[0-2], Max[0-2], Value{HQ}[0-2], Max{HQ}[0-2]
  const itemFoodMap = new Map();
  itemFoods.forEach((food) => {
    const id = parseInt(food['#'] || food.key || '0');
    if (id < 0) return;

    const expBonus = parseInt(food['EXPBonus%'] || '0');
    const bonuses = [];

    // Parse up to 3 bonus effects
    for (let i = 0; i < 3; i++) {
      const paramId = parseInt(food[`BaseParam[${i}]`] || '0');
      if (paramId <= 0) continue;

      const isRelative = food[`IsRelative[${i}]`] === 'True';
      const value = parseInt(food[`Value[${i}]`] || '0');
      const max = parseInt(food[`Max[${i}]`] || '0');
      const valueHq = parseInt(food[`Value{HQ}[${i}]`] || '0');
      const maxHq = parseInt(food[`Max{HQ}[${i}]`] || '0');

      if (value > 0 || valueHq > 0) {
        bonuses.push({
          paramId,
          paramName: baseParamMap.get(paramId) || `屬性${paramId}`,
          isRelative,
          value,
          max,
          valueHq,
          maxHq,
        });
      }
    }

    if (expBonus > 0 || bonuses.length > 0) {
      itemFoodMap.set(id, { expBonus, bonuses });
    }
  });
  console.log(`Loaded ${itemFoodMap.size} food effects`);

  // Build ItemAction -> ItemFood map (for food types 844=food, 845=medicine, 846=crafting medicine)
  // ItemAction Data[1] contains the ItemFood ID for these types
  const itemActionToFoodMap = new Map();
  itemActions.forEach((action) => {
    const id = parseInt(action['#'] || action.key || '0');
    const type = parseInt(action['Type'] || '0');

    // Type 844 = food, Type 845 = medicine, Type 846 = crafting medicine/syrup
    if (type === 844 || type === 845 || type === 846) {
      const itemFoodId = parseInt(action['Data[1]'] || '0');
      if (itemFoodId > 0 && itemFoodMap.has(itemFoodId)) {
        itemActionToFoodMap.set(id, itemFoodId);
      }
    }
  });
  console.log(`Linked ${itemActionToFoodMap.size} items to food effects`);

  // Build ClassJob map (ID -> abbreviation)
  const classJobMap = new Map();
  classJobs.forEach((cj) => {
    const id = parseInt(cj['#'] || cj.key || '0');
    const abbr = cj['Abbreviation'] || '';
    const name = cj['Name'] || '';
    if (id > 0) {
      classJobMap.set(id, { abbr, name });
    }
  });

  // Build ClassJobCategory map (ID -> job list string)
  const classJobCategoryMap = new Map();
  classJobCategories.forEach((cjc) => {
    const id = parseInt(cjc['#'] || cjc.key || '0');
    if (id <= 0) return;
    // Collect all jobs that are True for this category
    const jobs = [];
    classJobs.forEach((cj) => {
      const jobId = parseInt(cj['#'] || cj.key || '0');
      const abbr = cj['Abbreviation'] || '';
      if (jobId > 0 && abbr && cjc[abbr] === 'True') {
        jobs.push(abbr);
      }
    });
    if (jobs.length > 0) {
      classJobCategoryMap.set(id, jobs.join(' '));
    }
  });

  // Build category map
  const categoryMap = new Map();
  categories.forEach((cat) => {
    const id = parseInt(cat['#'] || cat.key || '0');
    const name = cat['Name'] || '';
    if (id > 0 && name) {
      categoryMap.set(id, { id, name });
    }
  });

  // Build craftable items set
  const craftableItems = new Set();
  recipes.forEach((recipe) => {
    const id = parseInt(recipe['#'] || recipe.key || '0');
    const itemId = parseInt(recipe['Item{Result}'] || recipe['ItemResult'] || '0');
    if (id > 0 && itemId > 0) {
      craftableItems.add(itemId);
    }
  });

  // Build gatherable items set
  const gatherableItems = new Set();
  gatheringItems.forEach((gi) => {
    const itemId = parseInt(gi['Item'] || '0');
    if (itemId > 0) {
      gatherableItems.add(itemId);
    }
  });

  // Process items
  const itemsOutput = {};
  let count = 0;
  let equipCount = 0;
  let foodCount = 0;

  items.forEach((item) => {
    const id = parseInt(item['#'] || item.key || '0');
    const name = (item['Name'] || '').trim();

    // Skip items without names or with invalid IDs
    if (id <= 0 || !name) return;

    const categoryId = parseInt(item['ItemUICategory'] || '0');
    const category = categoryMap.get(categoryId);

    // Get patch version for this item
    let patch = undefined;
    if (itemPatch && itemPatch[id]) {
      const patchId = itemPatch[id];
      patch = patchVersionMap.get(patchId);
    }

    const itemData = {
      id,
      name,
      description: (item['Description'] || '').trim(),
      icon: parseInt(item['Icon'] || '0'),
      itemLevel: parseInt(item['Level{Item}'] || item['LevelItem'] || '1'),
      equipLevel: parseInt(item['Level{Equip}'] || item['LevelEquip'] || '0'),
      rarity: parseInt(item['Rarity'] || '1'),
      categoryId,
      categoryName: category?.name || '其他',
      canBeHq: item['CanBeHq'] === 'True' || item['CanBeHq'] === '1',
      stackSize: parseInt(item['StackSize'] || '1'),
      isUntradable: item['IsUntradable'] === 'True' || item['IsUntradable'] === '1',
      classJobCategory: parseInt(item['ClassJobCategory'] || '0') || undefined,
      isCraftable: craftableItems.has(id),
      isGatherable: gatherableItems.has(id),
      patch,
    };

    // Extract equipment stats for equippable items
    const physDamage = parseInt(item['Damage{Phys}'] || '0');
    const magDamage = parseInt(item['Damage{Mag}'] || '0');
    const delay = parseInt(item['Delay<ms>'] || '0');
    const physDefense = parseInt(item['Defense{Phys}'] || '0');
    const magDefense = parseInt(item['Defense{Mag}'] || '0');
    const blockRate = parseInt(item['BlockRate'] || '0');
    const blockStrength = parseInt(item['Block'] || '0');
    const materiaSlots = parseInt(item['MateriaSlotCount'] || '0');
    const classJobCategoryId = parseInt(item['ClassJobCategory'] || '0');
    const repairClassId = parseInt(item['ClassJob{Repair}'] || '0');
    const dyeCount = parseInt(item['DyeCount'] || '0');
    const isUnique = item['IsUnique'] === 'True' || item['IsUnique'] === '1';
    const isAdvancedMeldingPermitted = item['IsAdvancedMeldingPermitted'] === 'True' || item['IsAdvancedMeldingPermitted'] === '1';

    // Collect base stats
    const stats = [];
    for (let i = 0; i < 6; i++) {
      const paramId = parseInt(item[`BaseParam[${i}]`] || '0');
      const paramValue = parseInt(item[`BaseParamValue[${i}]`] || '0');
      if (paramId > 0 && paramValue > 0) {
        const paramName = baseParamMap.get(paramId) || `屬性${paramId}`;
        stats.push({ id: paramId, name: paramName, value: paramValue });
      }
    }

    // Collect HQ bonus stats (special bonus params)
    const hqStats = [];
    for (let i = 0; i < 6; i++) {
      const paramId = parseInt(item[`BaseParam{Special}[${i}]`] || '0');
      const paramValue = parseInt(item[`BaseParamValue{Special}[${i}]`] || '0');
      if (paramId > 0 && paramValue > 0) {
        const paramName = baseParamMap.get(paramId) || `屬性${paramId}`;
        hqStats.push({ id: paramId, name: paramName, value: paramValue });
      }
    }

    // Only add equipStats if item has equipment-related stats
    const hasEquipStats = physDamage > 0 || magDamage > 0 || physDefense > 0 || magDefense > 0 ||
                          stats.length > 0 || materiaSlots > 0 || classJobCategoryId > 0;

    if (hasEquipStats) {
      const equipStats = {
        stats: stats,
      };

      // Add weapon stats
      if (physDamage > 0) equipStats.physicalDamage = physDamage;
      if (magDamage > 0) equipStats.magicDamage = magDamage;
      if (delay > 0) {
        equipStats.delay = delay;
        // Calculate auto-attack: damage / 3 * delay / 1000
        const damage = Math.max(physDamage, magDamage);
        if (damage > 0) {
          equipStats.autoAttack = parseFloat((damage / 3 * delay / 1000).toFixed(2));
        }
      }

      // Add defense stats
      if (physDefense > 0) equipStats.physicalDefense = physDefense;
      if (magDefense > 0) equipStats.magicDefense = magDefense;
      if (blockRate > 0) equipStats.blockRate = blockRate;
      if (blockStrength > 0) equipStats.blockStrength = blockStrength;

      // Add HQ stats if available and item can be HQ
      if (hqStats.length > 0 && itemData.canBeHq) {
        equipStats.hqStats = hqStats;
      }

      // Add class/job category name
      if (classJobCategoryId > 0 && classJobCategoryMap.has(classJobCategoryId)) {
        equipStats.classJobCategoryName = classJobCategoryMap.get(classJobCategoryId);
      }

      // Add repair class info
      if (repairClassId > 0 && classJobMap.has(repairClassId)) {
        equipStats.repairClassId = repairClassId;
        equipStats.repairClassName = classJobMap.get(repairClassId).abbr;
      }

      // Add other equipment info
      if (materiaSlots > 0) equipStats.materiaSlots = materiaSlots;
      if (isAdvancedMeldingPermitted) equipStats.isAdvancedMeldingPermitted = true;
      if (dyeCount > 0) equipStats.dyeCount = dyeCount;
      if (isUnique) equipStats.isUnique = true;

      itemData.equipStats = equipStats;
      equipCount++;
    }

    // Add food effects for consumables (food category 46, medicine category 44)
    const itemActionId = parseInt(item['ItemAction'] || '0');
    if (itemActionId > 0 && itemActionToFoodMap.has(itemActionId)) {
      const foodId = itemActionToFoodMap.get(itemActionId);
      const foodData = itemFoodMap.get(foodId);
      if (foodData) {
        itemData.foodEffects = {
          expBonus: foodData.expBonus,
          bonuses: foodData.bonuses,
        };
        foodCount++;
      }
    }

    itemsOutput[id] = itemData;
    count++;
  });

  // Get unique categories that are actually used
  const usedCategories = [...new Set(Object.values(itemsOutput).map((i) => i.categoryId))]
    .filter((id) => id > 0)
    .map((id) => categoryMap.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

  const output = {
    items: itemsOutput,
    categories: usedCategories,
  };

  writeFileSync(join(OUTPUT_PATH, 'items.json'), JSON.stringify(output));

  // Generate compact items-index.json for fast initial load
  // Includes multilingual names so only one fetch is needed
  // Format: { categories, fields: [...fieldNames], items: [[val,val,...], ...] }
  // Note: en/ja/cn fields are populated later by finalizeItemsIndex() after processMultilingualNames()
  const indexFields = ['id','name','icon','itemLevel','equipLevel','rarity','categoryId','categoryName','canBeHq','stackSize','isUntradable','isCraftable','isGatherable','patch'];
  const indexItems = Object.values(itemsOutput).map(item =>
    indexFields.map(f => {
      const v = item[f];
      if (v === true) return 1;
      if (v === false || v === undefined || v === null) return 0;
      return v;
    })
  );
  // Store temporarily; will be finalized with multi-names later
  globalIndexFields = indexFields;
  globalIndexItems = indexItems;
  globalIndexCategories = usedCategories;

  writeFileSync(join(OUTPUT_PATH, 'items.json'), JSON.stringify(output));
  console.log(`Processed ${count} items (${equipCount} with equipment stats, ${foodCount} with food effects), ${usedCategories.length} categories`);
}

/**
 * Process Recipe.csv
 */
async function processRecipes() {
  console.log('Processing recipes...');

  const recipes = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Recipe.csv'));
  const craftTypes = await parseCSV(join(DATA_REPO_PATH, 'csv', 'CraftType.csv'));
  const recipeLevelTable = await parseCSV(join(DATA_REPO_PATH, 'csv', 'RecipeLevelTable.csv'));
  const secretRecipeBooks = await parseCSV(join(DATA_REPO_PATH, 'csv', 'SecretRecipeBook.csv'));

  // Build craft type map
  const craftTypeMap = new Map();
  craftTypes.forEach((ct) => {
    const id = parseInt(ct['#'] || ct.key || '0');
    const name = ct['Name'] || '';
    if (name) {
      craftTypeMap.set(id, { id, name });
    }
  });

  // Build secret recipe book map (SecretRecipeBook ID -> Item ID)
  const secretRecipeBookMap = new Map();
  secretRecipeBooks.forEach((srb) => {
    const id = parseInt(srb['#'] || srb.key || '0');
    const itemId = parseInt(srb['Item'] || '0');
    if (id > 0 && itemId > 0) {
      secretRecipeBookMap.set(id, itemId);
    }
  });
  console.log(`Loaded ${secretRecipeBookMap.size} secret recipe book entries`);

  // Build recipe level table map (rlvl -> details)
  const recipeLevelMap = new Map();
  recipeLevelTable.forEach((rlt) => {
    const id = parseInt(rlt['#'] || rlt.key || '0');
    if (id > 0) {
      recipeLevelMap.set(id, {
        classJobLevel: parseInt(rlt['ClassJobLevel'] || '0'),
        stars: parseInt(rlt['Stars'] || '0'),
        suggestedCraftsmanship: parseInt(rlt['SuggestedCraftsmanship'] || '0'),
        difficulty: parseInt(rlt['Difficulty'] || '0'),
        quality: parseInt(rlt['Quality'] || '0'),
        durability: parseInt(rlt['Durability'] || '0'),
      });
    }
  });
  console.log(`Loaded ${recipeLevelMap.size} recipe level entries`);

  // Process recipes grouped by result item
  const recipesOutput = {};
  let count = 0;
  let masterBookCount = 0;

  recipes.forEach((recipe) => {
    const id = parseInt(recipe['#'] || recipe.key || '0');
    const itemId = parseInt(recipe['Item{Result}'] || recipe['ItemResult'] || '0');

    if (!id || id <= 0 || !itemId || itemId <= 0) return;

    const craftType = parseInt(recipe['CraftType'] || '0');
    const recipeLevelId = parseInt(recipe['RecipeLevelTable'] || recipe['RecipeLevel'] || '1');
    const secretRecipeBookId = parseInt(recipe['SecretRecipeBook'] || '0');
    // Convert SecretRecipeBook ID to actual Item ID using the mapping table
    const secretRecipeBook = secretRecipeBookId > 0 ? secretRecipeBookMap.get(secretRecipeBookId) : undefined;

    // Parse ingredients
    const ingredients = [];
    for (let i = 0; i < 10; i++) {
      const ingItemId = parseInt(recipe[`Item{Ingredient}[${i}]`] || recipe[`ItemIngredient[${i}]`] || '0');
      const ingAmount = parseInt(recipe[`Amount{Ingredient}[${i}]`] || recipe[`AmountIngredient[${i}]`] || '0');
      if (ingItemId > 0 && ingAmount > 0) {
        ingredients.push({ itemId: ingItemId, amount: ingAmount });
      }
    }

    if (ingredients.length === 0) return;

    // Get recipe level details
    const levelDetails = recipeLevelMap.get(recipeLevelId);

    // Get factors from recipe (default to 100 if not specified)
    const difficultyFactor = parseInt(recipe['DifficultyFactor'] || '100');
    const qualityFactor = parseInt(recipe['QualityFactor'] || '100');
    const durabilityFactor = parseInt(recipe['DurabilityFactor'] || '100');
    const materialQualityFactor = parseInt(recipe['MaterialQualityFactor'] || '0');

    // Calculate actual values by applying factors to recipe level base values
    const difficulty = levelDetails?.difficulty ? Math.floor(levelDetails.difficulty * difficultyFactor / 100) : undefined;
    const quality = levelDetails?.quality ? Math.floor(levelDetails.quality * qualityFactor / 100) : undefined;
    const durability = levelDetails?.durability ? Math.floor(levelDetails.durability * durabilityFactor / 100) : undefined;

    const recipeData = {
      id,
      itemId,
      craftType,
      craftTypeName: craftTypeMap.get(craftType)?.name || '',
      recipeLevel: recipeLevelId,
      stars: levelDetails?.stars || parseInt(recipe['Stars'] || '0'),
      ingredients,
      resultAmount: parseInt(recipe['Amount{Result}'] || recipe['AmountResult'] || '1'),
      // Crafting requirements
      requiredCraftsmanship: parseInt(recipe['RequiredCraftsmanship'] || '0') || undefined,
      requiredControl: parseInt(recipe['RequiredControl'] || '0') || undefined,
      // Recipe level details (with factors applied)
      classJobLevel: levelDetails?.classJobLevel || undefined,
      difficulty,
      quality,
      durability,
      // Master recipe book requirement (item ID)
      secretRecipeBook: secretRecipeBook || undefined,
      // Material quality factor (for HQ ingredient quality contribution)
      materialQualityFactor: materialQualityFactor > 0 ? materialQualityFactor : undefined,
    };

    if (secretRecipeBook) masterBookCount++;

    if (!recipesOutput[itemId]) {
      recipesOutput[itemId] = [];
    }
    recipesOutput[itemId].push(recipeData);
    count++;
  });

  const output = {
    recipes: recipesOutput,
    craftTypes: Array.from(craftTypeMap.values()),
  };

  writeFileSync(join(OUTPUT_PATH, 'recipes.json'), JSON.stringify(output));
  console.log(`Processed ${count} recipes (${masterBookCount} with master books)`);
}

/**
 * Process gathering data from Teamcraft extracts.json
 */
async function processGathering() {
  console.log('Processing gathering points from extracts...');

  // Fetch Teamcraft data for gathering
  console.log('Fetching gathering data from Teamcraft...');
  const [extracts, tcPlaces, tcMaps] = await Promise.all([
    fetchJSON(TEAMCRAFT_EXTRACTS),
    fetchJSON(TEAMCRAFT_PLACES),
    fetchJSON(TEAMCRAFT_MAPS),
  ]);

  // Load gathering types and place names from local CSV (Traditional Chinese)
  const gatheringTypes = await parseCSV(join(DATA_REPO_PATH, 'csv', 'GatheringType.csv'));
  const placeNames = await parseCSV(join(DATA_REPO_PATH, 'csv', 'PlaceName.csv'));

  // Build local place name map (Traditional Chinese)
  const localPlaceNameMap = new Map();
  placeNames.forEach((pn) => {
    const id = parseInt(pn['#'] || pn.key || '0');
    const name = pn['Name'] || '';
    if (id > 0 && name) {
      localPlaceNameMap.set(id, name);
    }
  });
  console.log(`Loaded ${localPlaceNameMap.size} local place names`);

  // Build gathering type map
  const gatheringTypeMap = new Map();
  gatheringTypes.forEach((gt) => {
    const id = parseInt(gt['#'] || gt.key || '0');
    const name = gt['Name'] || '';
    if (name) {
      gatheringTypeMap.set(id, { id, name });
    }
  });

  // Process gathering points from extracts
  const pointsOutput = {};
  let count = 0;

  for (const [itemId, itemData] of Object.entries(extracts)) {
    if (!itemData.sources) continue;

    // Find GATHERED_BY source (type 7)
    const gatherSource = itemData.sources.find(s => s.type === DataType.GATHERED_BY);
    if (!gatherSource || !gatherSource.data || !gatherSource.data.nodes) continue;

    const gatherData = gatherSource.data;
    const gatheringType = gatherData.type;
    const gatheringTypeName = gatheringTypeMap.get(gatheringType)?.name || '';

    pointsOutput[itemId] = [];

    for (const node of gatherData.nodes) {
      // Get zone name - prefer local Traditional Chinese, fallback to Teamcraft
      let placeName = '未知地點';
      let placeNameId = node.zoneId || 0;

      // Try to get placename_id from map if zoneId is not available
      if (!placeNameId && node.map && tcMaps && tcMaps[node.map]) {
        placeNameId = tcMaps[node.map].placename_id || 0;
      }

      // First try local Traditional Chinese place names
      if (placeNameId && localPlaceNameMap.has(placeNameId)) {
        placeName = localPlaceNameMap.get(placeNameId);
      } else if (placeNameId && tcPlaces && tcPlaces[placeNameId]) {
        // Fallback to Teamcraft data
        const place = tcPlaces[placeNameId];
        placeName = place.zh || place.ja || place.en || '未知地點';
      }

      const pointData = {
        id: node.id || node.base,
        gatheringType,
        gatheringTypeName,
        level: node.level || gatherData.level,
        stars: gatherData.stars_tooltip || '',
        placeNameId: node.zoneId || 0,
        placeName,
        x: node.x || 0,
        y: node.y || 0,
        mapId: node.map,
        radius: node.radius || 0,
        // Node type flags
        legendary: node.legendary || false,
        ephemeral: node.ephemeral || false,
        // Time restriction info
        timeRestriction: node.limited || (node.spawns && node.spawns.length > 0) || false,
        spawns: node.spawns || [],
        duration: node.duration || 0,
        // Folklore book requirement
        folklore: node.folklore || null,
        // Perception/Gathering requirements from gatherData
        perceptionReq: gatherData.perceptionReq || null,
      };

      // Avoid duplicate points
      const exists = pointsOutput[itemId].some(p => p.id === pointData.id);
      if (!exists) {
        pointsOutput[itemId].push({ ...pointData, itemId: parseInt(itemId) });
        count++;
      }
    }
  }

  const output = {
    points: pointsOutput,
    gatheringTypes: Array.from(gatheringTypeMap.values()),
  };

  writeFileSync(join(OUTPUT_PATH, 'gathering.json'), JSON.stringify(output));
  console.log(`Processed ${count} gathering point entries`);
}

/**
 * Process item sources (shops, vendors, drops, etc.)
 */
async function processSources() {
  console.log('Processing item sources...');

  // Load CSV source data
  const gilShopItems = await parseCSV(join(DATA_REPO_PATH, 'csv', 'GilShopItem.csv'));
  const gcScripShopItems = await parseCSV(join(DATA_REPO_PATH, 'csv', 'GCScripShopItem.csv'));
  const specialShop = await parseCSV(join(DATA_REPO_PATH, 'csv', 'SpecialShop.csv'));
  const items = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Item.csv'));
  const bnpcNames = await parseCSV(join(DATA_REPO_PATH, 'csv', 'BNpcName.csv'));

  // Fetch Teamcraft data for drops and other sources
  console.log('Fetching Teamcraft data...');
  const [dropSources, mobs, ventureSources, desynth, instanceSources, instances, lootSources, questSources, quests, extracts, tcNpcs, tcPlaces, tcAetherytes, voyageSources, tcMaps] = await Promise.all([
    fetchJSON(TEAMCRAFT_DROP_SOURCES),
    fetchJSON(TEAMCRAFT_MOBS),
    fetchJSON(TEAMCRAFT_VENTURE_SOURCES),
    fetchJSON(TEAMCRAFT_DESYNTH),
    fetchJSON(TEAMCRAFT_INSTANCE_SOURCES),
    fetchJSON(TEAMCRAFT_INSTANCES),
    fetchJSON(TEAMCRAFT_LOOT_SOURCES),
    fetchJSON(TEAMCRAFT_QUEST_SOURCES),
    fetchJSON(TEAMCRAFT_QUESTS),
    fetchJSON(TEAMCRAFT_EXTRACTS),
    fetchJSON(TEAMCRAFT_NPCS),
    fetchJSON(TEAMCRAFT_PLACES),
    fetchJSON(TEAMCRAFT_AETHERYTES),
    fetchJSON(TEAMCRAFT_VOYAGE_SOURCES),
    fetchJSON(TEAMCRAFT_MAPS),
  ]);

  // Build BNpc name map
  const bnpcNameMap = new Map();
  bnpcNames.forEach((bnpc) => {
    const id = parseInt(bnpc['#'] || bnpc.key || '0');
    const name = bnpc['Singular'] || bnpc['Name'] || '';
    if (id > 0 && name) {
      bnpcNameMap.set(id, name);
    }
  });

  // Build item price map (for gil shop)
  const itemPriceMap = new Map();
  items.forEach((item) => {
    const id = parseInt(item['#'] || item.key || '0');
    const price = parseInt(item['Price{Mid}'] || item['PriceMid'] || '0');
    if (id > 0 && price > 0) {
      itemPriceMap.set(id, price);
    }
  });

  const sourcesOutput = {};
  let count = 0;

  // Process Gil Shop items (NPC vendors)
  gilShopItems.forEach((gsi) => {
    const itemId = parseInt(gsi['Item'] || '0');
    if (itemId <= 0) return;

    if (!sourcesOutput[itemId]) {
      sourcesOutput[itemId] = [];
    }

    const price = itemPriceMap.get(itemId) || 0;
    sourcesOutput[itemId].push({
      type: 'gilshop',
      typeName: 'NPC商店',
      price: price,
      currency: 'gil',
    });
    count++;
  });

  // Process GC Scrip Shop items (Grand Company)
  gcScripShopItems.forEach((gcsi) => {
    const itemId = parseInt(gcsi['Item'] || '0');
    const cost = parseInt(gcsi['Cost{GCSeals}'] || gcsi['CostGCSeals'] || '0');
    if (itemId <= 0 || cost <= 0) return;

    if (!sourcesOutput[itemId]) {
      sourcesOutput[itemId] = [];
    }

    sourcesOutput[itemId].push({
      type: 'gcshop',
      typeName: '軍票商店',
      price: cost,
      currency: 'gc_seals',
    });
    count++;
  });

  // Note: Special Shop (tomestones, scrips, etc.) processing is now done via
  // extracts.json TRADE_SOURCES which has more accurate currency data

  // Process Teamcraft drop sources (mob drops)
  if (dropSources && mobs) {
    console.log('Processing mob drop data...');
    for (const [itemId, mobIds] of Object.entries(dropSources)) {
      if (!sourcesOutput[itemId]) {
        sourcesOutput[itemId] = [];
      }

      // Get mob names (limit to first 5 mobs to avoid too much data)
      const mobNames = mobIds.slice(0, 5).map((mobId) => {
        // Try Teamcraft mobs data first, then BNpcName
        const tcMob = mobs[mobId];
        if (tcMob && tcMob.en) {
          return bnpcNameMap.get(mobId) || tcMob.en;
        }
        return bnpcNameMap.get(mobId) || `怪物 #${mobId}`;
      });

      sourcesOutput[itemId].push({
        type: 'drop',
        typeName: '怪物掉落',
        mobIds: mobIds.slice(0, 5),
        mobNames: mobNames,
        totalMobs: mobIds.length,
      });
      count++;
    }
  }

  // Process venture and voyage data from extracts.json (more complete than individual files)
  if (extracts) {
    console.log('Processing venture and voyage data from extracts...');

    // Load submarine and airship exploration data for Traditional Chinese names
    const submarineExploration = await parseCSV(join(DATA_REPO_PATH, 'csv', 'SubmarineExploration.csv'));
    const airshipExploration = await parseCSV(join(DATA_REPO_PATH, 'csv', 'AirshipExplorationPoint.csv'));

    // Build submarine destination name map (ID -> Chinese name)
    const submarineNameMap = new Map();
    submarineExploration.forEach((se) => {
      const id = parseInt(se['#'] || se.key || '0');
      const destination = se['Destination'] || '';
      if (id > 0 && destination) {
        submarineNameMap.set(id, destination);
      }
    });
    console.log(`Loaded ${submarineNameMap.size} submarine destinations`);

    // Build airship destination name map (ID -> Chinese name)
    const airshipNameMap = new Map();
    airshipExploration.forEach((ae) => {
      const id = parseInt(ae['#'] || ae.key || '0');
      const name = ae['Name'] || '';
      if (id > 0 && name) {
        airshipNameMap.set(id, name);
      }
    });
    console.log(`Loaded ${airshipNameMap.size} airship destinations`);

    let ventureCount = 0;
    let voyageCount = 0;

    for (const [itemId, itemData] of Object.entries(extracts)) {
      if (!itemData.sources) continue;

      // Find VENTURES source (type 15)
      const ventureSource = itemData.sources.find(s => s.type === DataType.VENTURES);
      if (ventureSource && Array.isArray(ventureSource.data) && ventureSource.data.length > 0) {
        if (!sourcesOutput[itemId]) {
          sourcesOutput[itemId] = [];
        }

        const hasVenture = sourcesOutput[itemId].some(s => s.type === 'venture');
        if (!hasVenture) {
          // Get venture level info from first venture
          const firstVenture = ventureSource.data[0];

          // Extract quantity thresholds
          const ventureQuantities = firstVenture.quantities?.map(q => ({
            quantity: q.quantity,
            stat: q.stat || 'perception',
            value: q.value, // undefined means > 0
          })) || [];

          sourcesOutput[itemId].push({
            type: 'venture',
            typeName: '雇員探險',
            ventureLevel: firstVenture.lvl,
            ventureQuantities: ventureQuantities,
            ventureCategory: firstVenture.category, // 17 = Mining, 18 = Botany
          });
          ventureCount++;
          count++;
        }
      }

      // Find VOYAGES source (type 9)
      const voyageSource = itemData.sources.find(s => s.type === DataType.VOYAGES);
      if (voyageSource && Array.isArray(voyageSource.data) && voyageSource.data.length > 0) {
        if (!sourcesOutput[itemId]) {
          sourcesOutput[itemId] = [];
        }

        const hasVoyage = sourcesOutput[itemId].some(s => s.type === 'voyage');
        if (!hasVoyage) {
          // Extract voyage destination names with Traditional Chinese lookup
          const voyageNames = voyageSource.data.map(v => {
            if (!v.name) return '未知航點';

            const voyageId = v.name.id;
            const isSubmarine = v.type === 1;

            // Try to get Traditional Chinese name from local CSV
            let chineseName = null;
            if (isSubmarine && submarineNameMap.has(voyageId)) {
              chineseName = submarineNameMap.get(voyageId);
            } else if (!isSubmarine && airshipNameMap.has(voyageId)) {
              chineseName = airshipNameMap.get(voyageId);
            }

            // Return Chinese if available, otherwise fallback to Japanese then English
            return chineseName || v.name.ja || v.name.en || '未知航點';
          }).slice(0, 5);

          sourcesOutput[itemId].push({
            type: 'voyage',
            typeName: '遠航探索',
            voyageNames,
            totalVoyages: voyageSource.data.length,
          });
          voyageCount++;
          count++;
        }
      }
    }

    console.log(`Processed ${ventureCount} items with venture sources`);
    console.log(`Processed ${voyageCount} items with voyage sources`);
  }

  // Process desynth data from extracts.json (more complete than desynth.json)
  if (extracts) {
    console.log('Processing desynthesis data from extracts...');
    let desynthCount = 0;
    for (const [itemId, itemData] of Object.entries(extracts)) {
      if (!itemData.sources) continue;

      // Find DESYNTHS source (type 5)
      const desynthSource = itemData.sources.find(s => s.type === DataType.DESYNTHS);
      if (desynthSource && Array.isArray(desynthSource.data) && desynthSource.data.length > 0) {
        if (!sourcesOutput[itemId]) {
          sourcesOutput[itemId] = [];
        }

        // Check if already has desynth source
        const hasDesynth = sourcesOutput[itemId].some(s => s.type === 'desynth');
        if (!hasDesynth) {
          sourcesOutput[itemId].push({
            type: 'desynth',
            typeName: '分解',
            desynthItemIds: desynthSource.data.slice(0, 10), // Limit to 10 items
            totalDesynthItems: desynthSource.data.length,
          });
          desynthCount++;
          count++;
        }
      }
    }
    console.log(`Processed ${desynthCount} items with desynth sources`);
  }

  // Process vendor data from extracts.json
  if (extracts && tcNpcs && tcPlaces && tcAetherytes) {
    console.log('Processing vendor data from extracts...');

    // Load TC NPC names
    const tcNpcNames = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ENpcResident.csv'));
    const npcNameMap = new Map();
    tcNpcNames.forEach((npc) => {
      const id = parseInt(npc['#'] || npc.key || '0');
      const name = npc['Singular'] || '';
      if (id > 0 && name) {
        npcNameMap.set(id, name);
      }
    });
    console.log(`Loaded ${npcNameMap.size} TC NPC names`);

    // Load TC Place names
    const tcPlaceNames = await parseCSV(join(DATA_REPO_PATH, 'csv', 'PlaceName.csv'));
    const placeNameMap = new Map();
    tcPlaceNames.forEach((place) => {
      const id = parseInt(place['#'] || place.key || '0');
      const name = place['Name'] || '';
      if (id > 0 && name) {
        placeNameMap.set(id, name);
      }
    });
    console.log(`Loaded ${placeNameMap.size} TC place names`);

    // Build aetheryte lookup by zone (only main aetherytes, type 0)
    const aetherytesByZone = new Map();
    for (const [, aetheryte] of Object.entries(tcAetherytes)) {
      if (aetheryte.type === 0 && aetheryte.zoneid) {
        const zoneId = aetheryte.zoneid;
        if (!aetherytesByZone.has(zoneId)) {
          aetherytesByZone.set(zoneId, []);
        }
        aetherytesByZone.get(zoneId).push({
          x: aetheryte.x,
          y: aetheryte.y,
          nameid: aetheryte.nameid,
        });
      }
    }

    // Find nearest aetheryte to coords
    function findNearestAetheryte(zoneId, x, y) {
      const aetherytes = aetherytesByZone.get(zoneId);
      if (!aetherytes || aetherytes.length === 0) return null;

      let nearest = null;
      let minDist = Infinity;
      for (const ae of aetherytes) {
        const dist = Math.sqrt(Math.pow(ae.x - x, 2) + Math.pow(ae.y - y, 2));
        if (dist < minDist) {
          minDist = dist;
          nearest = ae;
        }
      }
      return nearest;
    }

    let vendorCount = 0;
    for (const [itemId, itemData] of Object.entries(extracts)) {
      if (!itemData.sources) continue;

      // Find VENDORS source (type 3)
      const vendorSource = itemData.sources.find(s => s.type === DataType.VENDORS);
      if (vendorSource && Array.isArray(vendorSource.data) && vendorSource.data.length > 0) {
        // Process first vendor (limit to avoid too much data)
        const vendors = vendorSource.data.slice(0, 3).map(vendor => {
          const npcId = vendor.npcId;
          const npcData = tcNpcs[npcId];

          // Get NPC name (prefer TC local, fallback to Teamcraft EN)
          let npcName = npcNameMap.get(npcId) || '';
          if (!npcName && npcData) {
            npcName = npcData.ja || npcData.en || '';
          }

          // Get zone name
          const zoneId = vendor.zoneId;
          let zoneName = placeNameMap.get(zoneId) || '';
          if (!zoneName && tcPlaces[zoneId]) {
            zoneName = tcPlaces[zoneId].ja || tcPlaces[zoneId].en || '';
          }

          // Get coords
          const coords = vendor.coords || {};

          // Find nearest aetheryte
          let aetheryteName = '';
          if (coords.x && coords.y) {
            const nearest = findNearestAetheryte(zoneId, coords.x, coords.y);
            if (nearest && nearest.nameid) {
              aetheryteName = placeNameMap.get(nearest.nameid) || '';
              if (!aetheryteName && tcPlaces[nearest.nameid]) {
                aetheryteName = tcPlaces[nearest.nameid].ja || tcPlaces[nearest.nameid].en || '';
              }
            }
          }

          return {
            npcName,
            price: vendor.price,
            zoneName,
            x: coords.x,
            y: coords.y,
            aetheryteName,
          };
        }).filter(v => v.npcName); // Only include vendors with names

        if (vendors.length > 0) {
          if (!sourcesOutput[itemId]) {
            sourcesOutput[itemId] = [];
          }

          // Check if already has vendor source
          const hasVendor = sourcesOutput[itemId].some(s => s.type === 'vendor');
          if (!hasVendor) {
            sourcesOutput[itemId].push({
              type: 'vendor',
              typeName: 'NPC商店',
              vendors: vendors,
            });
            vendorCount++;
            count++;
          }
        }
      }
    }
    console.log(`Processed ${vendorCount} items with vendor sources`);

    // Process TRADE_SOURCES from extracts.json (special shops with tomestones, scrips, etc.)
    // This provides more accurate currency data than CSV parsing
    console.log('Processing trade sources from extracts...');
    let tradeCount = 0;
    const tradesOutput = {}; // currencyItemId -> [{itemId, amount, currencyAmount}]

    for (const [itemId, extractData] of Object.entries(extracts)) {
      if (!extractData.sources) continue;

      for (const source of extractData.sources) {
        if (source.type !== DataType.TRADE_SOURCES) continue;
        if (!source.data || !Array.isArray(source.data)) continue;

        for (const shopData of source.data) {
          if (!shopData.trades || !Array.isArray(shopData.trades)) continue;

          for (const trade of shopData.trades) {
            // Get what you receive
            const receiveItems = trade.items || [];
            const receiveItem = receiveItems.find(i => i.id === parseInt(itemId));
            if (!receiveItem) continue;

            // Get what you pay (currencies)
            const currencies = trade.currencies || [];
            if (currencies.length === 0) continue;

            // Use primary currency for sources display
            const primaryCurrency = currencies[0];
            const primaryCurrencyItemId = primaryCurrency.id;
            const primaryCurrencyAmount = primaryCurrency.amount;

            if (!primaryCurrencyItemId || !primaryCurrencyAmount) continue;

            // Add to sources for the item being received
            if (!sourcesOutput[itemId]) {
              sourcesOutput[itemId] = [];
            }

            // Check if already has this exact trade source
            const hasSource = sourcesOutput[itemId].some(s =>
              s.type === 'specialshop' &&
              s.currencyItemId === primaryCurrencyItemId &&
              s.price === primaryCurrencyAmount
            );

            if (!hasSource) {
              // Determine currency type name
              let currencyName = '兌換';
              if (primaryCurrencyItemId >= 28 && primaryCurrencyItemId <= 46) {
                currencyName = '神典石兌換';
              } else if (primaryCurrencyItemId === 25 || primaryCurrencyItemId === 26 || primaryCurrencyItemId === 27) {
                currencyName = '軍票兌換';
              } else if (primaryCurrencyItemId === 29) {
                currencyName = '金碟幣兌換';
              } else if (primaryCurrencyItemId >= 17833 && primaryCurrencyItemId <= 17840) {
                currencyName = '工票兌換';
              }

              // Get NPC vendor info
              const shopNpcs = shopData.npcs || [];
              const vendors = shopNpcs.map(npc => {
                const npcId = npc.id;
                let npcName = '';

                // Try to get TC NPC name first (from local CSV), then fall back to Teamcraft data
                npcName = npcNameMap.get(npcId) || '';
                if (!npcName && tcNpcs[npcId]) {
                  const npcData = tcNpcs[npcId];
                  npcName = npcData.ja || npcData.en || '';
                }

                // Get zone name
                const zoneId = npc.zoneId;
                let zoneName = placeNameMap.get(zoneId) || '';
                if (!zoneName && tcPlaces[zoneId]) {
                  zoneName = tcPlaces[zoneId].ja || tcPlaces[zoneId].en || '';
                }

                // Get coords
                const coords = npc.coords || {};

                // Find nearest aetheryte
                let aetheryteName = '';
                if (coords.x && coords.y) {
                  const nearest = findNearestAetheryte(zoneId, coords.x, coords.y);
                  if (nearest && nearest.nameid) {
                    aetheryteName = placeNameMap.get(nearest.nameid) || '';
                    if (!aetheryteName && tcPlaces[nearest.nameid]) {
                      aetheryteName = tcPlaces[nearest.nameid].ja || tcPlaces[nearest.nameid].en || '';
                    }
                  }
                }

                return {
                  npcName,
                  zoneName,
                  x: coords.x,
                  y: coords.y,
                  aetheryteName,
                };
              }).filter(v => v.npcName); // Only include vendors with names

              const sourceEntry = {
                type: 'specialshop',
                typeName: currencyName,
                price: primaryCurrencyAmount,
                currencyItemId: primaryCurrencyItemId,
                currency: 'item',
              };

              // Add vendor info if available
              if (vendors.length > 0) {
                sourceEntry.vendors = vendors;
              }

              sourcesOutput[itemId].push(sourceEntry);
              tradeCount++;
            }

            // Build reverse mapping: currency -> items you can buy
            // Loop through ALL currencies (not just primary) so items like
            // Thavnairian Mist that are used as secondary currencies show up
            // Store ALL currencies needed for the trade so UI can display full exchange info
            const allCurrencies = currencies.map(c => ({ id: c.id, amount: c.amount }));

            for (const currency of currencies) {
              const currencyItemId = currency.id;

              if (!currencyItemId) continue;

              if (!tradesOutput[currencyItemId]) {
                tradesOutput[currencyItemId] = [];
              }

              // Avoid duplicates (check by result itemId and all currencies)
              const currenciesKey = allCurrencies.map(c => `${c.id}:${c.amount}`).sort().join(',');
              const hasTrade = tradesOutput[currencyItemId].some(t => {
                const tKey = t.currencies.map(c => `${c.id}:${c.amount}`).sort().join(',');
                return t.itemId === parseInt(itemId) && tKey === currenciesKey;
              });

              if (!hasTrade) {
                tradesOutput[currencyItemId].push({
                  itemId: parseInt(itemId),
                  amount: receiveItem.amount || 1,
                  currencies: allCurrencies,
                });
              }
            }
          }
        }
      }
    }

    console.log(`Processed ${tradeCount} trade sources`);

    // Save trades output (what items can be bought with each currency)
    writeFileSync(join(OUTPUT_PATH, 'trades.json'), JSON.stringify(tradesOutput));
    console.log(`Saved trades data for ${Object.keys(tradesOutput).length} currencies`);
  }

  // Process Teamcraft instance sources (dungeons, trials, raids)
  if (instanceSources && instances) {
    console.log('Processing instance/dungeon drop data...');

    // Load Traditional Chinese instance names from ContentFinderCondition.csv
    // Map by ContentType + Content combination since Content alone is not unique
    // (same Content ID can exist for dungeons, chocobo racing, etc.)
    const tcContentFinder = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ContentFinderCondition.csv'));
    const tcInstanceNameMap = new Map(); // "ContentType-Content" -> TC name
    tcContentFinder.forEach((cfc) => {
      const contentId = parseInt(cfc['Content'] || '0');
      const contentType = parseInt(cfc['ContentType'] || '0');
      const name = cfc['Name'] || '';
      if (contentId > 0 && name) {
        // Create compound key: contentType-contentId
        const key = `${contentType}-${contentId}`;
        tcInstanceNameMap.set(key, name);
      }
    });
    console.log(`Loaded ${tcInstanceNameMap.size} TC instance names from local CSV (by ContentType-Content)`);

    // Load English instance names from xivapi datamining repo
    // Build EN name -> TC name mapping for fallback when compound key doesn't match
    console.log('Fetching English instance names for mapping...');
    const enContentFinder = await fetchCSV(EN_CONTENT_FINDER);
    const enToTcNameMap = new Map(); // EN name -> TC name
    enContentFinder.forEach((cfc) => {
      const contentId = parseInt(cfc['Content'] || '0');
      const contentType = parseInt(cfc['ContentType'] || '0');
      const enName = (cfc['Name'] || '').trim();
      const tcKey = `${contentType}-${contentId}`;
      const tcName = tcInstanceNameMap.get(tcKey);
      if (enName && tcName) {
        // Normalize EN name for matching (lowercase, remove special chars)
        const normalizedEn = enName.toLowerCase().replace(/[–—]/g, '-');
        enToTcNameMap.set(normalizedEn, tcName);
      }
    });
    console.log(`Built EN->TC mapping for ${enToTcNameMap.size} instances`);

    for (const [itemId, instanceIds] of Object.entries(instanceSources)) {
      if (!sourcesOutput[itemId]) {
        sourcesOutput[itemId] = [];
      }

      // Get instance names and content types (limit to first 5 to avoid too much data)
      const instanceNames = [];
      const instanceContentTypes = [];

      instanceIds.slice(0, 5).forEach((instanceId) => {
        const absId = Math.abs(instanceId);
        const instance = instances[absId];

        // Get content type from Teamcraft data
        const contentType = instance?.contentType || 0;
        if (contentType && !instanceContentTypes.includes(contentType)) {
          instanceContentTypes.push(contentType);
        }

        // Try TC name first using compound key (ContentType-Content)
        // Teamcraft instance ID corresponds to Content column in ContentFinderCondition
        const tcKey = `${contentType}-${absId}`;
        const tcName = tcInstanceNameMap.get(tcKey);
        if (tcName) {
          instanceNames.push(tcName);
          return;
        }

        // Fallback to Teamcraft instances data with EN->TC mapping
        if (instance && instance.en) {
          const normalizedEn = instance.en.toLowerCase().replace(/[–—]/g, '-');
          const mappedTcName = enToTcNameMap.get(normalizedEn);
          if (mappedTcName) {
            instanceNames.push(mappedTcName);
            return;
          }
          // Return English name if no TC translation found
          instanceNames.push(instance.en);
          return;
        }
        instanceNames.push(`副本 #${absId}`);
      });

      // Determine type name based on content types
      // 2=Dungeon, 4=Trial, 5=Raid, 28=Ultimate
      let typeName = '副本掉落';
      if (instanceContentTypes.includes(28)) {
        typeName = '絕境戰';
      } else if (instanceContentTypes.includes(5)) {
        typeName = '大型任務';
      } else if (instanceContentTypes.includes(4)) {
        typeName = '討伐戰';
      } else if (instanceContentTypes.includes(2)) {
        typeName = '迷宮挑戰';
      }

      // Check if already has instance source
      const hasInstance = sourcesOutput[itemId].some(s => s.type === 'instance');
      if (!hasInstance && instanceNames.length > 0) {
        sourcesOutput[itemId].push({
          type: 'instance',
          typeName: typeName,
          instanceNames: instanceNames,
          instanceContentTypes: instanceContentTypes,
          totalInstances: instanceIds.length,
        });
        count++;
      }
    }
  }

  // Process Teamcraft loot sources (treasure hunt maps)
  if (lootSources) {
    console.log('Processing treasure map data...');

    // Load items data to get map names
    let itemsData = {};
    try {
      const itemsPath = join(OUTPUT_PATH, 'items.json');
      const itemsJson = JSON.parse(readFileSync(itemsPath, 'utf-8'));
      itemsData = itemsJson.items || {};
      console.log(`Loaded ${Object.keys(itemsData).length} items for map name lookup`);
    } catch (e) {
      console.warn('Could not load items.json for map names:', e.message);
    }

    for (const [itemId, mapIds] of Object.entries(lootSources)) {
      if (!sourcesOutput[itemId]) {
        sourcesOutput[itemId] = [];
      }

      // Get map names (limit to first 5)
      const mapNames = mapIds.slice(0, 5).map((mapId) => {
        const mapItem = itemsData[mapId];
        return mapItem?.name || `地圖 #${mapId}`;
      }).filter(Boolean);

      // Check if already has treasure source
      const hasTreasure = sourcesOutput[itemId].some(s => s.type === 'treasure');
      if (!hasTreasure) {
        sourcesOutput[itemId].push({
          type: 'treasure',
          typeName: '藏寶圖',
          mapNames: mapNames,
          totalMaps: mapIds.length,
        });
        count++;
      }
    }
  }

  // Process Teamcraft quest sources (quest rewards)
  if (quests) {
    console.log('Processing quest reward data...');

    // Load TC quest names from Quest.csv
    const tcQuests = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Quest.csv'));
    const tcQuestNameMap = new Map(); // questId -> TC name
    tcQuests.forEach((q) => {
      const id = parseInt(q['#'] || q.key || '0');
      const name = q['Name'] || '';
      if (id > 0 && name) {
        tcQuestNameMap.set(id, name);
      }
    });
    console.log(`Loaded ${tcQuestNameMap.size} TC quest names from local CSV`);

    // Process quests.json to find items in rewards
    for (const [questId, questData] of Object.entries(quests)) {
      if (!questData.rewards || !Array.isArray(questData.rewards)) continue;

      for (const reward of questData.rewards) {
        const itemId = reward.id;
        if (!itemId || itemId <= 0) continue;

        if (!sourcesOutput[itemId]) {
          sourcesOutput[itemId] = [];
        }

        // Check if already has quest source
        const hasQuest = sourcesOutput[itemId].some(s => s.type === 'quest');
        if (hasQuest) continue;

        // Get quest name (prefer TC name, fallback to JP/EN)
        const qId = parseInt(questId);
        let questName = tcQuestNameMap.get(qId) || '';
        if (!questName && questData.name) {
          questName = questData.name.ja || questData.name.en || `任務 #${questId}`;
        }

        sourcesOutput[itemId].push({
          type: 'quest',
          typeName: '任務獎勵',
          questId: qId,
          questName: questName,
        });
        count++;
      }
    }
  }

  // Also process quest-sources.json for any missing items
  if (questSources && quests) {
    console.log('Processing additional quest sources...');
    for (const [itemId, questIds] of Object.entries(questSources)) {
      if (!sourcesOutput[itemId]) {
        sourcesOutput[itemId] = [];
      }

      // Check if already has quest source
      const hasQuest = sourcesOutput[itemId].some(s => s.type === 'quest');
      if (hasQuest) continue;

      // Get first quest info
      const questId = questIds[0];
      const questData = quests[questId];
      let questName = '';
      if (questData && questData.name) {
        questName = questData.name.ja || questData.name.en || `任務 #${questId}`;
      }

      sourcesOutput[itemId].push({
        type: 'quest',
        typeName: '任務獎勵',
        questId: parseInt(questId),
        questName: questName,
      });
      count++;
    }
  }

  // Deduplicate sources per item and remove old gilshop when vendor exists
  for (const itemId in sourcesOutput) {
    const sources = sourcesOutput[itemId];

    // Check if we have detailed vendor source
    const hasVendorSource = sources.some(s => s.type === 'vendor' && s.vendors && s.vendors.length > 0);

    // Filter out gilshop if vendor exists (vendor has more detailed info)
    let filteredSources = sources;
    if (hasVendorSource) {
      filteredSources = sources.filter(s => s.type !== 'gilshop');
    }

    // Deduplicate by type-price-currency-currencyItemId
    const seen = new Set();
    sourcesOutput[itemId] = filteredSources.filter((s) => {
      const key = `${s.type}-${s.price || ''}-${s.currency || ''}-${s.currencyItemId || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  writeFileSync(join(OUTPUT_PATH, 'sources.json'), JSON.stringify({ sources: sourcesOutput }));
  console.log(`Processed ${count} item sources`);

  // Also save desynth results (what items you get by desynthing) for "Used for" display
  if (desynth) {
    console.log('Saving desynth results data...');
    const desynthResults = {};
    for (const [sourceItemId, resultItemIds] of Object.entries(desynth)) {
      if (Array.isArray(resultItemIds) && resultItemIds.length > 0) {
        desynthResults[sourceItemId] = resultItemIds;
      }
    }
    writeFileSync(join(OUTPUT_PATH, 'desynth-results.json'), JSON.stringify({ results: desynthResults }));
    console.log(`Saved ${Object.keys(desynthResults).length} desynth result entries`);
  }
}

/**
 * Process map data - build zone name to map path mapping with sizeFactor and offset
 * Reference: https://github.com/xivapi/ffxiv-datamining/blob/master/docs/MapCoordinates.md
 */
async function processMapData() {
  console.log('Processing map data...');

  // Load Map.csv
  const mapData = await parseCSV(join(DATA_REPO_PATH, 'csv', 'Map.csv'));
  console.log(`Loaded ${mapData.length} map entries`);

  // Load PlaceName.csv for TC names
  const placeNames = await parseCSV(join(DATA_REPO_PATH, 'csv', 'PlaceName.csv'));
  const placeNameMap = new Map();
  placeNames.forEach((place) => {
    const id = parseInt(place['#'] || place.key || 0);
    const name = place['Name'] || place['0'] || '';
    if (id > 0 && name) {
      placeNameMap.set(id, name);
    }
  });
  console.log(`Loaded ${placeNameMap.size} place names`);

  // Load aetherytes from Teamcraft
  const aetherytes = await fetchJSON(TEAMCRAFT_AETHERYTES);
  console.log(`Loaded ${aetherytes?.length || 0} aetherytes from Teamcraft`);

  // Build map ID -> aetherytes lookup
  const aetherytesByMap = new Map();
  if (aetherytes) {
    aetherytes.forEach((ae) => {
      if (!ae.map || !ae.x || !ae.y) return;
      const mapId = ae.map;
      if (!aetherytesByMap.has(mapId)) {
        aetherytesByMap.set(mapId, []);
      }
      // Get TC name for aetheryte
      const name = placeNameMap.get(ae.nameid) || '';
      aetherytesByMap.get(mapId).push({
        id: ae.id,
        x: ae.x,
        y: ae.y,
        type: ae.type, // 0 = main aetheryte, 1 = aethernet shard
        name: name,
      });
    });
  }
  console.log(`Mapped aetherytes to ${aetherytesByMap.size} maps`);

  // Build zone name -> map info mapping
  // Map.csv structure:
  // - Row key (#): Numeric map ID
  // - Column 7 (Id): Map path like "s1f1/00"
  // - Column 8 (SizeFactor): Map scale factor (e.g., 100, 200)
  // - Column 9 (Offset{X}): X offset
  // - Column 10 (Offset{Y}): Y offset
  // - Column 12 (PlaceName): PlaceName ID
  const zoneMapPaths = {};
  let count = 0;

  mapData.forEach((map) => {
    // Get numeric map ID (row key)
    const numericMapId = parseInt(map['#'] || map.key || 0);

    // Get map path ID
    const mapId = map['Id'] || map['6'] || '';
    if (!mapId || mapId === 'default/00') return;

    // Get PlaceName ID
    const placeNameId = parseInt(map['PlaceName'] || map['11'] || 0);
    if (!placeNameId) return;

    // Get the TC name for this place
    const zoneName = placeNameMap.get(placeNameId);
    if (!zoneName) return;

    // Get sizeFactor and offsets
    const sizeFactor = parseInt(map['SizeFactor'] || map['7'] || 100);
    const offsetX = parseInt(map['Offset{X}'] || map['8'] || 0);
    const offsetY = parseInt(map['Offset{Y}'] || map['9'] || 0);

    // Convert map path format: "s1f1/00" -> "s1f1/s1f1.00"
    const parts = mapId.split('/');
    if (parts.length !== 2) return;
    const folder = parts[0];
    const index = parts[1];
    const xivApiPath = `${folder}/${folder}.${index}`;

    // Get aetherytes for this map
    const mapAetherytes = aetherytesByMap.get(numericMapId) || [];

    // Only add if not already present (first entry wins, usually the main map)
    if (!zoneMapPaths[zoneName]) {
      zoneMapPaths[zoneName] = {
        id: numericMapId,
        path: xivApiPath,
        sizeFactor: sizeFactor,
        offsetX: offsetX,
        offsetY: offsetY,
        aetherytes: mapAetherytes,
      };
      count++;
    }
  });

  // Write output
  writeFileSync(join(OUTPUT_PATH, 'zone-maps.json'), JSON.stringify({ maps: zoneMapPaths }));
  console.log(`Processed ${count} zone map mappings`);
}

/**
 * Process CN quest names for Huiji Wiki links
 * Creates a mapping from quest ID to CN quest name
 */
async function processQuestCNNames() {
  console.log('Processing CN quest names for Huiji Wiki links...');

  try {
    // Fetch CN Quest.csv from datamining-cn repo
    const response = await fetch(CN_QUEST_CSV);
    if (!response.ok) {
      console.warn('Failed to fetch CN Quest.csv:', response.status);
      return;
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Parse CSV - format: key,Name,Id,...
    // Skip header rows (first 4 lines)
    const questCNNames = {};
    let count = 0;

    for (let i = 4; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing for first two columns
      const match = line.match(/^(\d+),"([^"]*)"/);
      if (match) {
        const questId = parseInt(match[1]);
        // Clean FFXIV special characters (private use area Unicode) and trim
        const name = match[2]
          .replace(/[\uE000-\uF8FF]/g, '')  // Remove private use area characters
          .trim();
        if (questId && name) {
          questCNNames[questId] = name;
          count++;
        }
      }
    }

    writeFileSync(join(OUTPUT_PATH, 'quest-cn-names.json'), JSON.stringify(questCNNames));
    console.log(`Processed ${count} CN quest names`);
  } catch (error) {
    console.warn('Error processing CN quest names:', error.message);
  }
}

/**
 * Process CN instance names for Huiji Wiki links
 * Creates a mapping from TC instance name to CN instance name
 */
async function processInstanceCNNames() {
  console.log('Processing CN instance names for Huiji Wiki links...');

  try {
    // Load TC ContentFinderCondition.csv locally to get ID -> TC name
    const tcContentFinder = await parseCSV(join(DATA_REPO_PATH, 'csv', 'ContentFinderCondition.csv'));
    const idToTcName = new Map();
    tcContentFinder.forEach((cfc) => {
      const id = parseInt(cfc['#'] || cfc.key || '0');
      const name = (cfc['Name'] || '').trim();
      if (id > 0 && name) {
        idToTcName.set(id, name);
      }
    });
    console.log(`Loaded ${idToTcName.size} TC instance names`);

    // Fetch CN ContentFinderCondition.csv
    const response = await fetch(CN_CONTENT_FINDER_CSV);
    if (!response.ok) {
      console.warn('Failed to fetch CN ContentFinderCondition.csv:', response.status);
      return;
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Find Name column index (should be 44 based on structure)
    // Parse header to confirm
    const headerLine = lines[1] || '';
    const headers = headerLine.split(',');
    let nameIndex = headers.findIndex(h => h === 'Name');
    if (nameIndex === -1) nameIndex = 44; // fallback

    // Build ID -> CN name map
    const idToCnName = new Map();
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Parse CSV line
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current);

      const id = parseInt(cols[0] || '0');
      const name = (cols[nameIndex] || '')
        .replace(/[\uE000-\uF8FF]/g, '')  // Remove private use area characters
        .trim();

      if (id > 0 && name) {
        idToCnName.set(id, name);
      }
    }
    console.log(`Loaded ${idToCnName.size} CN instance names`);

    // Create TC name -> CN name mapping
    const instanceCNNames = {};
    let count = 0;
    for (const [id, tcName] of idToTcName) {
      const cnName = idToCnName.get(id);
      if (cnName) {
        instanceCNNames[tcName] = cnName;
        count++;
      }
    }

    writeFileSync(join(OUTPUT_PATH, 'instance-cn-names.json'), JSON.stringify(instanceCNNames));
    console.log(`Processed ${count} instance TC->CN name mappings`);
  } catch (error) {
    console.warn('Error processing CN instance names:', error.message);
  }
}

/**
 * Process multilingual item names (EN, JA, CN)
 * Creates a mapping file for search across languages
 */
async function processMultilingualNames() {
  console.log('Processing multilingual item names...');

  // Parse multilingual CSVs from remote
  // EN/JA format: Line 0 = headers, Line 1+ = data
  // CN format: Line 0 = indices, Line 1 = headers, Line 2 = types, Line 3+ = data
  const parseRemoteItemCSV = async (url, lang) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${lang} items: ${response.status}`);
        return new Map();
      }
      const text = await response.text();
      const lines = text.split('\n');
      if (lines.length < 2) return new Map();

      // Determine format by checking first line
      const firstLine = lines[0];
      const isCNFormat = firstLine.startsWith('key,') || /^[\d,]+$/.test(firstLine.split(',')[0]);

      let headers, dataStartLine;
      if (isCNFormat) {
        // CN format: Line 0 = indices, Line 1 = headers, Line 2+ = data (skip type row if exists)
        headers = lines[1].split(',').map(h => h.replace(/"/g, '').trim());
        dataStartLine = 3; // Skip index, header, and type rows
      } else {
        // EN/JA format: Line 0 = headers, Line 1+ = data
        headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        dataStartLine = 1;
      }

      const nameIndex = headers.indexOf('Name');
      const singularIndex = headers.indexOf('Singular');
      const idIndex = headers.indexOf('#');

      if (idIndex === -1 || (nameIndex === -1 && singularIndex === -1)) {
        console.warn(`Could not find required columns in ${lang} CSV (headers: ${headers.slice(0, 10).join(', ')}...)`);
        return new Map();
      }

      const names = new Map();
      for (let i = dataStartLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip lines that appear to be continuations of multiline fields
        if (!line.match(/^\d+,/)) continue;

        // Parse CSV line handling quoted strings
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current);

        const id = parseInt(values[idIndex] || '0');
        // Try Name column first, fall back to Singular column
        let name = (nameIndex !== -1 ? values[nameIndex] : '') || '';
        if (!name.trim() && singularIndex !== -1) {
          name = values[singularIndex] || '';
        }
        name = name.trim();

        if (id > 0 && name) {
          names.set(id, name);
        }
      }
      console.log(`Loaded ${names.size} ${lang} item names`);
      return names;
    } catch (error) {
      console.warn(`Error fetching ${lang} items:`, error.message);
      return new Map();
    }
  };

  // Fetch all language names in parallel
  const [enNames, jaNames, cnNames] = await Promise.all([
    parseRemoteItemCSV(ITEM_CSV_EN, 'EN'),
    parseRemoteItemCSV(ITEM_CSV_JA, 'JA'),
    parseRemoteItemCSV(ITEM_CSV_CN, 'CN'),
  ]);

  // Build combined multilingual names object
  // Only include items that have at least one non-TC name
  const multiNames = {};
  const allIds = new Set([...enNames.keys(), ...jaNames.keys(), ...cnNames.keys()]);

  for (const id of allIds) {
    const en = enNames.get(id);
    const ja = jaNames.get(id);
    const cn = cnNames.get(id);

    // Only add if at least one name exists
    if (en || ja || cn) {
      const entry = {};
      if (en) entry.en = en;
      if (ja) entry.ja = ja;
      if (cn) entry.cn = cn;
      multiNames[id] = entry;
    }
  }

  writeFileSync(join(OUTPUT_PATH, 'item-names-multi.json'), JSON.stringify(multiNames));
  console.log(`Processed ${Object.keys(multiNames).length} items with multilingual names`);
}

/**
 * Process recipe level table for crafting simulator
 * Creates recipe-levels.json with all fields required by WASM simulator
 */
async function processRecipeLevels() {
  console.log('Processing recipe level table...');

  try {
    const response = await fetch(RECIPE_LEVEL_TABLE_CSV);
    if (!response.ok) {
      console.warn(`Failed to fetch RecipeLevelTable.csv: ${response.status}`);
      return;
    }

    const text = await response.text();
    const lines = text.split('\n');
    if (lines.length < 2) {
      console.warn('RecipeLevelTable.csv is empty');
      return;
    }

    // First line is headers
    const headers = lines[0].split(',').map(h => h.trim());
    const idIndex = headers.indexOf('#');
    const qualityIndex = headers.indexOf('Quality');
    const suggestedCraftsmanshipIndex = headers.indexOf('SuggestedCraftsmanship');
    const difficultyIndex = headers.indexOf('Difficulty');
    const durabilityIndex = headers.indexOf('Durability');
    const conditionsFlagIndex = headers.indexOf('ConditionsFlag');
    const classJobLevelIndex = headers.indexOf('ClassJobLevel');
    const starsIndex = headers.indexOf('Stars');
    const progressDividerIndex = headers.indexOf('ProgressDivider');
    const qualityDividerIndex = headers.indexOf('QualityDivider');
    const progressModifierIndex = headers.indexOf('ProgressModifier');
    const qualityModifierIndex = headers.indexOf('QualityModifier');

    const recipeLevels = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');
      const id = parseInt(values[idIndex] || '0');
      if (id < 0) continue;

      // Build recipe level object with snake_case keys to match WASM expectations
      recipeLevels[id] = {
        id,
        class_job_level: parseInt(values[classJobLevelIndex] || '0'),
        stars: parseInt(values[starsIndex] || '0'),
        suggested_craftsmanship: parseInt(values[suggestedCraftsmanshipIndex] || '0'),
        suggested_control: null, // Not in CSV but required by WASM (accepts null)
        difficulty: parseInt(values[difficultyIndex] || '0'),
        quality: parseInt(values[qualityIndex] || '0'),
        progress_divider: parseInt(values[progressDividerIndex] || '50'),
        quality_divider: parseInt(values[qualityDividerIndex] || '30'),
        progress_modifier: parseInt(values[progressModifierIndex] || '100'),
        quality_modifier: parseInt(values[qualityModifierIndex] || '100'),
        durability: parseInt(values[durabilityIndex] || '40'),
        conditions_flag: parseInt(values[conditionsFlagIndex] || '15'),
      };
    }

    writeFileSync(join(OUTPUT_PATH, 'recipe-levels.json'), JSON.stringify(recipeLevels));
    console.log(`Processed ${Object.keys(recipeLevels).length} recipe level entries`);
  } catch (error) {
    console.warn('Error processing recipe levels:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting data processing...');
  console.log(`Data source: ${DATA_REPO_PATH}`);
  console.log(`Output path: ${OUTPUT_PATH}`);
  console.log('');

  if (!existsSync(join(DATA_REPO_PATH, 'csv'))) {
    console.error('Error: ffxiv-datamining-tc repository not found!');
    console.error('Please clone it or set DATA_REPO_PATH environment variable.');
    console.error('');
    console.error('To clone:');
    console.error('  git clone https://github.com/miaki3457/ffxiv-datamining-tc.git');
    process.exit(1);
  }

  try {
    await processItems();
    await processRecipes();
    await processGathering();
    await processSources();
    await processMapData();
    await processQuestCNNames();
    await processInstanceCNNames();
    await processMultilingualNames();
    // Finalize items-index.json with merged multilingual names
    {
      const multiPath = join(OUTPUT_PATH, 'item-names-multi.json');
      const multi = existsSync(multiPath) ? JSON.parse(readFileSync(multiPath, 'utf8')) : {};
      const mergedFields = [...globalIndexFields, 'en', 'ja', 'cn'];
      const mergedItems = globalIndexItems.map(row => {
        const id = row[0];
        const m = multi[id] || {};
        return [...row, m.en || '', m.ja || '', m.cn || ''];
      });
      const indexOutput = { categories: globalIndexCategories, fields: mergedFields, items: mergedItems };
      writeFileSync(join(OUTPUT_PATH, 'items-index.json'), JSON.stringify(indexOutput));
      console.log(`Generated items-index.json: ${(JSON.stringify(indexOutput).length / 1024 / 1024).toFixed(1)}MB (compact, with multilingual names)`);
    }
    await processRecipeLevels();
    console.log('');
    console.log('Data processing complete!');
  } catch (error) {
    console.error('Error processing data:', error);
    process.exit(1);
  }
}

main();
