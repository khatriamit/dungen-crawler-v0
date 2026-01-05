import { EnemyData } from '../types';

/**
 * Enemy Database
 * All enemies in the game are defined here
 */
export const ENEMIES: Record<string, EnemyData> = {
  // ============================================================
  // LEVEL 1 - CRYPT MINIONS
  // ============================================================
  skeleton_basic: {
    id: 'skeleton_basic',
    name: 'Skeleton Warrior',
    type: 'minion',
    sprite: 'enemy_skeleton',
    stats: {
      health: 30,
      maxHealth: 30,
      attack: 8,
      defense: 2,
      speed: 60,
      detectionRange: 150,
      attackRange: 40,
      attackCooldown: 1200,
    },
    lootTable: [
      { itemId: 'gem_small', dropChance: 0.6, minQuantity: 1, maxQuantity: 3 },
      { itemId: 'potion_health_small', dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    ],
    behaviors: ['idle', 'patrol', 'chase', 'attack'],
  },

  zombie_shambler: {
    id: 'zombie_shambler',
    name: 'Shambling Corpse',
    type: 'minion',
    sprite: 'enemy_zombie',
    stats: {
      health: 50,
      maxHealth: 50,
      attack: 12,
      defense: 0,
      speed: 35,
      detectionRange: 120,
      attackRange: 35,
      attackCooldown: 1800,
    },
    lootTable: [
      { itemId: 'gem_small', dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
      { itemId: 'potion_health_small', dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    behaviors: ['idle', 'chase', 'attack'],
  },

  ghost_wisp: {
    id: 'ghost_wisp',
    name: 'Vengeful Wisp',
    type: 'minion',
    sprite: 'enemy_ghost',
    stats: {
      health: 20,
      maxHealth: 20,
      attack: 15,
      defense: 0,
      speed: 90,
      detectionRange: 200,
      attackRange: 50,
      attackCooldown: 1000,
    },
    lootTable: [
      { itemId: 'gem_medium', dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      { itemId: 'gem_small', dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
    ],
    behaviors: ['patrol', 'chase', 'attack', 'retreat'],
  },

  // ============================================================
  // ELITE ENEMIES
  // ============================================================
  skeleton_knight: {
    id: 'skeleton_knight',
    name: 'Skeleton Knight',
    type: 'elite',
    sprite: 'enemy_skeleton_elite',
    stats: {
      health: 80,
      maxHealth: 80,
      attack: 18,
      defense: 8,
      speed: 50,
      detectionRange: 180,
      attackRange: 45,
      attackCooldown: 1500,
    },
    lootTable: [
      { itemId: 'gem_medium', dropChance: 0.7, minQuantity: 1, maxQuantity: 2 },
      { itemId: 'potion_health_medium', dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      { itemId: 'sword_iron', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    ],
    behaviors: ['patrol', 'chase', 'attack'],
  },

  // ============================================================
  // BOSSES
  // ============================================================
  boss_crypt_lord: {
    id: 'boss_crypt_lord',
    name: 'The Crypt Lord',
    type: 'boss',
    sprite: 'boss_cryptlord',
    stats: {
      health: 300,
      maxHealth: 300,
      attack: 25,
      defense: 10,
      speed: 45,
      detectionRange: 300,
      attackRange: 60,
      attackCooldown: 2000,
    },
    lootTable: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 3, maxQuantity: 5 },
      { itemId: 'gem_medium', dropChance: 1.0, minQuantity: 5, maxQuantity: 10 },
      { itemId: 'potion_health_medium', dropChance: 0.8, minQuantity: 2, maxQuantity: 3 },
      { itemId: 'sword_shadow', dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: 'key_boss', dropChance: 1.0, minQuantity: 1, maxQuantity: 1 },
    ],
    behaviors: ['idle', 'chase', 'attack'],
  },

  boss_shadow_knight: {
    id: 'boss_shadow_knight',
    name: 'Shadow Knight Malkor',
    type: 'boss',
    sprite: 'boss_shadowknight',
    stats: {
      health: 500,
      maxHealth: 500,
      attack: 35,
      defense: 15,
      speed: 60,
      detectionRange: 350,
      attackRange: 55,
      attackCooldown: 1600,
    },
    lootTable: [
      { itemId: 'gem_large', dropChance: 1.0, minQuantity: 5, maxQuantity: 8 },
      { itemId: 'potion_strength', dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
      { itemId: 'sword_shadow', dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
    ],
    behaviors: ['patrol', 'chase', 'attack', 'retreat'],
  },
};

/**
 * Get enemy by ID with type safety
 */
export function getEnemy(id: string): EnemyData | undefined {
  return ENEMIES[id];
}

/**
 * Get all enemies of a specific type
 */
export function getEnemiesByType(type: EnemyData['type']): EnemyData[] {
  return Object.values(ENEMIES).filter((enemy) => enemy.type === type);
}

/**
 * Get enemies suitable for a specific difficulty level
 */
export function getEnemiesForDifficulty(difficulty: number): EnemyData[] {
  return Object.values(ENEMIES).filter((enemy) => {
    if (enemy.type === 'boss') return false;
    const power = enemy.stats.health + enemy.stats.attack * 5;
    return power <= difficulty * 100;
  });
}
