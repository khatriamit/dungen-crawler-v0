/**
 * Core type definitions for Dungen Raider
 * These types form the foundation for all game systems
 */

// ============================================================
// GAME CONSTANTS
// ============================================================

export const GAME_CONFIG = {
  WIDTH: 960,
  HEIGHT: 640,
  TILE_SIZE: 32,
  SCALE: 2,
} as const;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  HOME_MAP: 'HomeMapScene',
  DUNGEON: 'DungeonScene',
  DEN: 'DenScene',
  UI: 'UIScene',
} as const;

// ============================================================
// ENTITY STATS
// ============================================================

export interface EntityStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface PlayerStats extends EntityStats {
  gems: number;
  experience: number;
  level: number;
}

export interface EnemyStats extends EntityStats {
  detectionRange: number;
  attackRange: number;
  attackCooldown: number;
}

// ============================================================
// ITEMS
// ============================================================

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'consumable' | 'gem' | 'key' | 'armor';

export interface ItemData {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  stackable: boolean;
  maxStack: number;
  value: number;
  effects?: ItemEffect[];
}

export interface ItemEffect {
  type: 'heal' | 'damage' | 'buff' | 'debuff';
  stat?: keyof EntityStats;
  value: number;
  duration?: number; // in milliseconds, undefined = instant
}

export interface InventorySlot {
  item: ItemData | null;
  quantity: number;
}

// ============================================================
// ENEMIES
// ============================================================

export type EnemyType = 'minion' | 'elite' | 'boss';
export type AIState = 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat';

export interface EnemyData {
  id: string;
  name: string;
  type: EnemyType;
  stats: EnemyStats;
  sprite: string;
  lootTable: LootEntry[];
  behaviors: AIState[];
}

export interface LootEntry {
  itemId: string;
  dropChance: number; // 0-1
  minQuantity: number;
  maxQuantity: number;
}

// ============================================================
// LEVELS & DUNGEON
// ============================================================

export type LevelStatus = 'locked' | 'unlocked' | 'completed';

export interface LevelData {
  id: number;
  name: string;
  description: string;
  status: LevelStatus;
  difficulty: number;
  requiredLevel: number;
  bossId: string;
  roomCount: number;
  rewards: LootEntry[];
  position: { x: number; y: number }; // Position on world map
}

export interface RoomData {
  id: string;
  type: 'start' | 'normal' | 'treasure' | 'boss';
  enemies: string[]; // Enemy IDs
  exits: RoomExit[];
  cleared: boolean;
}

export interface RoomExit {
  direction: 'north' | 'south' | 'east' | 'west';
  targetRoomId: string;
  locked: boolean;
}

// ============================================================
// COMBAT
// ============================================================

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCritical: boolean;
  isBlocked: boolean;
}

export interface CombatEvent {
  type: 'attack' | 'hit' | 'miss' | 'death' | 'heal';
  attackerId: string;
  targetId: string;
  damage?: DamageResult;
  timestamp: number;
}

// ============================================================
// GAME EVENTS
// ============================================================

export const GAME_EVENTS = {
  // Player events
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  PLAYER_DIED: 'player:died',
  PLAYER_LEVEL_UP: 'player:levelup',
  
  // Combat events
  COMBAT_HIT: 'combat:hit',
  COMBAT_MISS: 'combat:miss',
  ENEMY_DIED: 'combat:enemydied',
  
  // Inventory events
  ITEM_PICKED_UP: 'inventory:pickup',
  ITEM_USED: 'inventory:used',
  ITEM_DROPPED: 'inventory:dropped',
  INVENTORY_CHANGED: 'inventory:changed',
  
  // Dungeon events
  ROOM_ENTERED: 'dungeon:roomenter',
  ROOM_CLEARED: 'dungeon:roomcleared',
  LEVEL_COMPLETED: 'dungeon:levelcomplete',
  
  // UI events
  TOGGLE_INVENTORY: 'ui:toggleinventory',
  SHOW_DIALOG: 'ui:showdialog',
  HIDE_DIALOG: 'ui:hidedialog',
} as const;

// ============================================================
// SAVE DATA (for blockchain abstraction)
// ============================================================

export interface SaveData {
  playerId: string;
  playerStats: PlayerStats;
  inventory: InventorySlot[];
  unlockedLevels: number[];
  completedLevels: number[];
  totalGemsCollected: number;
  totalEnemiesDefeated: number;
  timestamp: number;
}

export interface RunResult {
  levelId: number;
  completed: boolean;
  gemsCollected: number;
  enemiesDefeated: number;
  bossDefeated: boolean;
  lootObtained: ItemData[];
  duration: number;
}
