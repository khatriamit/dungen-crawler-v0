import { ItemData } from '../types';

/**
 * Item Database
 * All items in the game are defined here
 */
export const ITEMS: Record<string, ItemData> = {
  // ============================================================
  // GEMS (Currency)
  // ============================================================
  gem_small: {
    id: 'gem_small',
    name: 'Ruby Shard',
    description: 'A small ruby fragment. Worth 10 gold.',
    type: 'gem',
    rarity: 'common',
    icon: 'gem_red_small',
    stackable: true,
    maxStack: 999,
    value: 10,
  },
  gem_medium: {
    id: 'gem_medium',
    name: 'Sapphire',
    description: 'A gleaming blue sapphire. Worth 50 gold.',
    type: 'gem',
    rarity: 'uncommon',
    icon: 'gem_blue',
    stackable: true,
    maxStack: 999,
    value: 50,
  },
  gem_large: {
    id: 'gem_large',
    name: 'Emerald',
    description: 'A brilliant green emerald. Worth 100 gold.',
    type: 'gem',
    rarity: 'rare',
    icon: 'gem_green',
    stackable: true,
    maxStack: 999,
    value: 100,
  },

  // ============================================================
  // CONSUMABLES
  // ============================================================
  potion_health_small: {
    id: 'potion_health_small',
    name: 'Minor Health Potion',
    description: 'Restores 25 HP.',
    type: 'consumable',
    rarity: 'common',
    icon: 'potion_red',
    stackable: true,
    maxStack: 20,
    value: 15,
    effects: [{ type: 'heal', value: 25 }],
  },
  potion_health_medium: {
    id: 'potion_health_medium',
    name: 'Health Potion',
    description: 'Restores 50 HP.',
    type: 'consumable',
    rarity: 'uncommon',
    icon: 'potion_red_large',
    stackable: true,
    maxStack: 10,
    value: 40,
    effects: [{ type: 'heal', value: 50 }],
  },
  potion_strength: {
    id: 'potion_strength',
    name: 'Strength Elixir',
    description: 'Increases attack by 10 for 30 seconds.',
    type: 'consumable',
    rarity: 'rare',
    icon: 'potion_orange',
    stackable: true,
    maxStack: 5,
    value: 75,
    effects: [{ type: 'buff', stat: 'attack', value: 10, duration: 30000 }],
  },

  // ============================================================
  // WEAPONS
  // ============================================================
  sword_rusty: {
    id: 'sword_rusty',
    name: 'Rusty Sword',
    description: 'A worn blade. Better than nothing.',
    type: 'weapon',
    rarity: 'common',
    icon: 'sword_rusty',
    stackable: false,
    maxStack: 1,
    value: 20,
    effects: [{ type: 'buff', stat: 'attack', value: 5 }],
  },
  sword_iron: {
    id: 'sword_iron',
    name: 'Iron Sword',
    description: 'A reliable iron blade.',
    type: 'weapon',
    rarity: 'uncommon',
    icon: 'sword_iron',
    stackable: false,
    maxStack: 1,
    value: 80,
    effects: [{ type: 'buff', stat: 'attack', value: 12 }],
  },
  sword_shadow: {
    id: 'sword_shadow',
    name: 'Shadowbane',
    description: 'A blade forged in darkness. Whispers of ancient power.',
    type: 'weapon',
    rarity: 'epic',
    icon: 'sword_shadow',
    stackable: false,
    maxStack: 1,
    value: 500,
    effects: [{ type: 'buff', stat: 'attack', value: 25 }],
  },

  // ============================================================
  // KEYS
  // ============================================================
  key_boss: {
    id: 'key_boss',
    name: 'Boss Key',
    description: 'Opens the door to the dungeon boss.',
    type: 'key',
    rarity: 'rare',
    icon: 'key_gold',
    stackable: false,
    maxStack: 1,
    value: 0,
  },
};

/**
 * Get item by ID with type safety
 */
export function getItem(id: string): ItemData | undefined {
  return ITEMS[id];
}

/**
 * Get all items of a specific type
 */
export function getItemsByType(type: ItemData['type']): ItemData[] {
  return Object.values(ITEMS).filter((item) => item.type === type);
}

/**
 * Get all items of a specific rarity
 */
export function getItemsByRarity(rarity: ItemData['rarity']): ItemData[] {
  return Object.values(ITEMS).filter((item) => item.rarity === rarity);
}
