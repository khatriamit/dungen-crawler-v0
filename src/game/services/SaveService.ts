import { SaveData, RunResult, PlayerStats, InventorySlot } from '../types';

/**
 * SaveService - Abstracted persistence layer
 * 
 * This service handles all save/load operations.
 * Currently uses localStorage, but designed for easy blockchain integration.
 * 
 * Future blockchain integration points:
 * - saveGame() -> commit to smart contract
 * - loadGame() -> read from chain state
 * - commitRun() -> record run results on-chain
 */

const STORAGE_KEY = 'dungen_raider_save';

const DEFAULT_PLAYER_STATS: PlayerStats = {
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 100,
  gems: 0,
  experience: 0,
  level: 1,
};

const DEFAULT_INVENTORY: InventorySlot[] = Array(20).fill(null).map(() => ({
  item: null,
  quantity: 0,
}));

class SaveServiceImpl {
  private saveData: SaveData | null = null;

  /**
   * Initialize the save service
   */
  async initialize(): Promise<void> {
    await this.loadGame();
  }

  /**
   * Create a new save file
   */
  async createNewSave(playerId: string): Promise<SaveData> {
    const newSave: SaveData = {
      playerId,
      playerStats: { ...DEFAULT_PLAYER_STATS },
      inventory: DEFAULT_INVENTORY.map((slot) => ({ ...slot })),
      unlockedLevels: [1],
      completedLevels: [],
      totalGemsCollected: 0,
      totalEnemiesDefeated: 0,
      timestamp: Date.now(),
    };

    this.saveData = newSave;
    await this.saveGame();
    return newSave;
  }

  /**
   * Load game from storage
   */
  async loadGame(): Promise<SaveData | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.saveData = JSON.parse(stored);
        return this.saveData;
      }
    } catch (error) {
      console.error('Failed to load save data:', error);
    }
    return null;
  }

  /**
   * Save game to storage
   */
  async saveGame(): Promise<boolean> {
    if (!this.saveData) return false;

    try {
      this.saveData.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saveData));
      console.log('[SaveService] Game saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Commit a dungeon run result
   * Future: This would record the run on-chain
   */
  async commitRun(result: RunResult): Promise<boolean> {
    if (!this.saveData) return false;

    // Update stats based on run
    this.saveData.totalGemsCollected += result.gemsCollected;
    this.saveData.totalEnemiesDefeated += result.enemiesDefeated;

    // Mark level as completed if boss was defeated
    if (result.completed && !this.saveData.completedLevels.includes(result.levelId)) {
      this.saveData.completedLevels.push(result.levelId);
      
      // Unlock next level
      const nextLevelId = result.levelId + 1;
      if (!this.saveData.unlockedLevels.includes(nextLevelId)) {
        this.saveData.unlockedLevels.push(nextLevelId);
      }
    }

    return this.saveGame();
  }

  /**
   * Get current save data
   */
  getSaveData(): SaveData | null {
    return this.saveData;
  }

  /**
   * Update player stats
   */
  updatePlayerStats(stats: Partial<PlayerStats>): void {
    if (this.saveData) {
      this.saveData.playerStats = { ...this.saveData.playerStats, ...stats };
    }
  }

  /**
   * Update inventory
   */
  updateInventory(inventory: InventorySlot[]): void {
    if (this.saveData) {
      this.saveData.inventory = inventory;
    }
  }

  /**
   * Check if a level is unlocked
   */
  isLevelUnlocked(levelId: number): boolean {
    return this.saveData?.unlockedLevels.includes(levelId) ?? false;
  }

  /**
   * Check if a level is completed
   */
  isLevelCompleted(levelId: number): boolean {
    return this.saveData?.completedLevels.includes(levelId) ?? false;
  }

  /**
   * Delete save data
   */
  async deleteSave(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    this.saveData = null;
  }

  /**
   * Check if save exists
   */
  hasSave(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}

// Export singleton instance
export const SaveService = new SaveServiceImpl();
