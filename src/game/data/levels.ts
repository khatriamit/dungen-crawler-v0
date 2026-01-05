import { LevelData } from '../types';

/**
 * Level Database
 * All dungeon levels are defined here
 * Map layout: serpentine path from bottom-left to top-right
 */
export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: 'The Forgotten Crypt',
    description: 'An ancient burial ground where the dead refuse to rest.',
    status: 'unlocked',
    difficulty: 1,
    requiredLevel: 1,
    bossId: 'boss_crypt_lord',
    roomCount: 5,
    rewards: [
      { itemId: 'gem_medium', dropChance: 1.0, minQuantity: 5, maxQuantity: 10 },
    ],
    position: { x: 120, y: 520 },
  },
  {
    id: 2,
    name: 'Shadowed Halls',
    description: 'Once a grand castle, now home to malevolent spirits.',
    status: 'locked',
    difficulty: 1,
    requiredLevel: 2,
    bossId: 'boss_shadow_knight',
    roomCount: 6,
    rewards: [
      { itemId: 'gem_medium', dropChance: 1.0, minQuantity: 8, maxQuantity: 15 },
    ],
    position: { x: 250, y: 480 },
  },
  {
    id: 3,
    name: 'Goblin Warrens',
    description: 'A maze of tunnels infested with cunning goblins.',
    status: 'locked',
    difficulty: 2,
    requiredLevel: 3,
    bossId: 'boss_crypt_lord',
    roomCount: 7,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 2, maxQuantity: 4 },
    ],
    position: { x: 380, y: 520 },
  },
  {
    id: 4,
    name: 'The Bone Pit',
    description: 'Mountains of bones from a thousand battles past.',
    status: 'locked',
    difficulty: 2,
    requiredLevel: 4,
    bossId: 'boss_shadow_knight',
    roomCount: 7,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 3, maxQuantity: 5 },
    ],
    position: { x: 500, y: 450 },
  },
  {
    id: 5,
    name: 'Cursed Chapel',
    description: 'A holy place corrupted by dark rituals.',
    status: 'locked',
    difficulty: 3,
    requiredLevel: 5,
    bossId: 'boss_crypt_lord',
    roomCount: 8,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 4, maxQuantity: 6 },
    ],
    position: { x: 620, y: 380 },
  },
  {
    id: 6,
    name: 'Flooded Depths',
    description: 'Subterranean waters hide ancient terrors.',
    status: 'locked',
    difficulty: 3,
    requiredLevel: 6,
    bossId: 'boss_shadow_knight',
    roomCount: 9,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 5, maxQuantity: 8 },
    ],
    position: { x: 500, y: 300 },
  },
  {
    id: 7,
    name: 'The Inferno',
    description: 'Rivers of lava flow through this hellish domain.',
    status: 'locked',
    difficulty: 4,
    requiredLevel: 7,
    bossId: 'boss_crypt_lord',
    roomCount: 10,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 6, maxQuantity: 10 },
    ],
    position: { x: 380, y: 230 },
  },
  {
    id: 8,
    name: 'Frozen Tomb',
    description: 'Eternal ice preserves horrors best left forgotten.',
    status: 'locked',
    difficulty: 4,
    requiredLevel: 8,
    bossId: 'boss_shadow_knight',
    roomCount: 10,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 7, maxQuantity: 12 },
    ],
    position: { x: 250, y: 170 },
  },
  {
    id: 9,
    name: 'The Abyss',
    description: 'A pit of eternal darkness. Few who enter return.',
    status: 'locked',
    difficulty: 5,
    requiredLevel: 9,
    bossId: 'boss_crypt_lord',
    roomCount: 12,
    rewards: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 8, maxQuantity: 15 },
    ],
    position: { x: 500, y: 130 },
  },
  {
    id: 10,
    name: "Dragon's Throne",
    description: 'The final challenge. Only legends survive.',
    status: 'locked',
    difficulty: 5,
    requiredLevel: 10,
    bossId: 'boss_shadow_knight',
    roomCount: 15,
    rewards: [
      { itemId: 'sword_shadow', dropChance: 1.0, minQuantity: 1, maxQuantity: 1 },
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 15, maxQuantity: 25 },
    ],
    position: { x: 750, y: 100 },
  },
];

/**
 * Get level by ID
 */
export function getLevel(id: number): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}

/**
 * Get all unlocked levels
 */
export function getUnlockedLevels(): LevelData[] {
  return LEVELS.filter((level) => level.status !== 'locked');
}

/**
 * Check if a level can be unlocked based on player level
 */
export function canUnlockLevel(levelId: number, playerLevel: number): boolean {
  const level = getLevel(levelId);
  if (!level) return false;
  return playerLevel >= level.requiredLevel;
}

/**
 * Get the next locked level
 */
export function getNextLockedLevel(): LevelData | undefined {
  return LEVELS.find((level) => level.status === 'locked');
}
