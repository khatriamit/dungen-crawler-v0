import { SaveService } from './SaveService';
import { ItemData } from '../types';

/**
 * EconomyService - Handles all in-game economic transactions
 * 
 * Abstracted for future blockchain integration:
 * - addGems() -> Mint tokens
 * - spendGems() -> Burn/transfer tokens
 * - buyItem() -> NFT purchase
 * - sellItem() -> NFT sale
 */

class EconomyServiceImpl {
  /**
   * Get current gem balance
   */
  getGems(): number {
    const saveData = SaveService.getSaveData();
    return saveData?.playerStats.gems ?? 0;
  }

  /**
   * Add gems to player balance
   */
  addGems(amount: number): boolean {
    if (amount <= 0) return false;

    const saveData = SaveService.getSaveData();
    if (!saveData) return false;

    saveData.playerStats.gems += amount;
    console.log(`[Economy] Added ${amount} gems. New balance: ${saveData.playerStats.gems}`);
    return true;
  }

  /**
   * Spend gems from player balance
   */
  spendGems(amount: number): boolean {
    if (amount <= 0) return false;

    const saveData = SaveService.getSaveData();
    if (!saveData) return false;

    if (saveData.playerStats.gems < amount) {
      console.log('[Economy] Insufficient gems');
      return false;
    }

    saveData.playerStats.gems -= amount;
    console.log(`[Economy] Spent ${amount} gems. New balance: ${saveData.playerStats.gems}`);
    return true;
  }

  /**
   * Check if player can afford an amount
   */
  canAfford(amount: number): boolean {
    return this.getGems() >= amount;
  }

  /**
   * Buy an item from shop (future: NFT purchase)
   */
  async buyItem(item: ItemData, quantity: number = 1): Promise<boolean> {
    const totalCost = item.value * quantity;
    
    if (!this.canAfford(totalCost)) {
      console.log('[Economy] Cannot afford item:', item.name);
      return false;
    }

    // Deduct gems
    this.spendGems(totalCost);
    
    // TODO: Add item to inventory via InventoryService
    console.log(`[Economy] Purchased ${quantity}x ${item.name} for ${totalCost} gems`);
    return true;
  }

  /**
   * Sell an item (future: NFT sale)
   */
  async sellItem(item: ItemData, quantity: number = 1): Promise<boolean> {
    // Items sell for half their value
    const sellPrice = Math.floor(item.value * 0.5) * quantity;
    
    // TODO: Remove item from inventory via InventoryService
    
    // Add gems
    this.addGems(sellPrice);
    console.log(`[Economy] Sold ${quantity}x ${item.name} for ${sellPrice} gems`);
    return true;
  }

  /**
   * Calculate loot value
   */
  calculateLootValue(items: { item: ItemData; quantity: number }[]): number {
    return items.reduce((total, { item, quantity }) => {
      return total + item.value * quantity;
    }, 0);
  }

  /**
   * Convert gems to display format
   */
  formatGems(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }
}

// Export singleton instance
export const EconomyService = new EconomyServiceImpl();
