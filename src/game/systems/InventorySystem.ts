import Phaser from 'phaser';
import { ItemData, InventorySlot, GAME_EVENTS } from '../types';
import { SaveService } from '../services/SaveService';
import { Player } from '../entities/Player';

/**
 * InventorySystem
 * 
 * Manages player inventory:
 * - Add/remove items
 * - Stack management
 * - Item usage
 * - Persistence
 */

export class InventorySystem {
  private scene: Phaser.Scene;
  private slots: InventorySlot[];
  private player: Player | null = null;
  private readonly MAX_SLOTS = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Initialize from save or create empty
    const saveData = SaveService.getSaveData();
    this.slots = saveData?.inventory ?? this.createEmptyInventory();
    
    // Listen for pickup events
    this.scene.game.events.on(GAME_EVENTS.ITEM_PICKED_UP, this.onItemPickedUp, this);
  }

  /**
   * Set player reference
   */
  setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Create empty inventory
   */
  private createEmptyInventory(): InventorySlot[] {
    return Array(this.MAX_SLOTS).fill(null).map(() => ({
      item: null,
      quantity: 0,
    }));
  }

  /**
   * Handle item pickup event
   */
  private onItemPickedUp(item: ItemData, quantity: number): void {
    const added = this.addItem(item, quantity);
    
    if (!added) {
      console.log('[Inventory] Full! Could not add:', item.name);
      // Could spawn item back on ground
    }
  }

  /**
   * Add item to inventory
   */
  addItem(item: ItemData, quantity: number = 1): boolean {
    // For stackable items, try to stack first
    if (item.stackable) {
      for (const slot of this.slots) {
        if (slot.item?.id === item.id && slot.quantity < item.maxStack) {
          const spaceAvailable = item.maxStack - slot.quantity;
          const toAdd = Math.min(quantity, spaceAvailable);
          
          slot.quantity += toAdd;
          quantity -= toAdd;
          
          if (quantity === 0) {
            this.emitChange();
            return true;
          }
        }
      }
    }
    
    // Find empty slot for remaining quantity
    while (quantity > 0) {
      const emptySlot = this.slots.find(slot => slot.item === null);
      
      if (!emptySlot) {
        return false; // Inventory full
      }
      
      emptySlot.item = item;
      emptySlot.quantity = Math.min(quantity, item.maxStack);
      quantity -= emptySlot.quantity;
    }
    
    this.emitChange();
    return true;
  }

  /**
   * Remove item from inventory
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    let remaining = quantity;
    
    // Remove from slots in reverse order (take from partial stacks first)
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      
      if (slot.item?.id === itemId) {
        const toRemove = Math.min(remaining, slot.quantity);
        slot.quantity -= toRemove;
        remaining -= toRemove;
        
        if (slot.quantity === 0) {
          slot.item = null;
        }
      }
    }
    
    if (remaining === 0) {
      this.emitChange();
      return true;
    }
    
    return false;
  }

  /**
   * Use item at slot index
   */
  useItem(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return false;
    }
    
    const slot = this.slots[slotIndex];
    if (!slot.item) return false;
    
    const item = slot.item;
    
    // Only consumables can be used
    if (item.type !== 'consumable') {
      return false;
    }
    
    // Apply item effects through player
    if (this.player) {
      this.player.useItem(item);
    }
    
    // Remove one from stack
    slot.quantity--;
    if (slot.quantity === 0) {
      slot.item = null;
    }
    
    this.emitChange();
    return true;
  }

  /**
   * Get item count
   */
  getItemCount(itemId: string): number {
    let count = 0;
    
    for (const slot of this.slots) {
      if (slot.item?.id === itemId) {
        count += slot.quantity;
      }
    }
    
    return count;
  }

  /**
   * Check if inventory has item
   */
  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getItemCount(itemId) >= quantity;
  }

  /**
   * Get slot at index
   */
  getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= this.slots.length) {
      return null;
    }
    return this.slots[index];
  }

  /**
   * Get all slots
   */
  getSlots(): InventorySlot[] {
    return [...this.slots];
  }

  /**
   * Get first slot with item
   */
  findItem(itemId: string): { slot: InventorySlot; index: number } | null {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].item?.id === itemId) {
        return { slot: this.slots[i], index: i };
      }
    }
    return null;
  }

  /**
   * Get all items of a type
   */
  getItemsByType(type: ItemData['type']): { item: ItemData; quantity: number; index: number }[] {
    const items: { item: ItemData; quantity: number; index: number }[] = [];
    
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.item?.type === type) {
        items.push({
          item: slot.item,
          quantity: slot.quantity,
          index: i,
        });
      }
    }
    
    return items;
  }

  /**
   * Swap slots
   */
  swapSlots(indexA: number, indexB: number): boolean {
    if (indexA < 0 || indexA >= this.slots.length ||
        indexB < 0 || indexB >= this.slots.length) {
      return false;
    }
    
    const temp = this.slots[indexA];
    this.slots[indexA] = this.slots[indexB];
    this.slots[indexB] = temp;
    
    this.emitChange();
    return true;
  }

  /**
   * Sort inventory by type then rarity
   */
  sort(): void {
    const typeOrder = ['weapon', 'armor', 'consumable', 'gem', 'key'];
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    
    this.slots.sort((a, b) => {
      // Empty slots go to end
      if (!a.item && !b.item) return 0;
      if (!a.item) return 1;
      if (!b.item) return -1;
      
      // Sort by type
      const typeA = typeOrder.indexOf(a.item.type);
      const typeB = typeOrder.indexOf(b.item.type);
      if (typeA !== typeB) return typeA - typeB;
      
      // Sort by rarity
      const rarityA = rarityOrder.indexOf(a.item.rarity);
      const rarityB = rarityOrder.indexOf(b.item.rarity);
      if (rarityA !== rarityB) return rarityA - rarityB;
      
      // Sort by name
      return a.item.name.localeCompare(b.item.name);
    });
    
    this.emitChange();
  }

  /**
   * Calculate total value of inventory
   */
  getTotalValue(): number {
    let total = 0;
    
    for (const slot of this.slots) {
      if (slot.item) {
        total += slot.item.value * slot.quantity;
      }
    }
    
    return total;
  }

  /**
   * Get number of used slots
   */
  getUsedSlots(): number {
    return this.slots.filter(slot => slot.item !== null).length;
  }

  /**
   * Check if inventory is full
   */
  isFull(): boolean {
    return this.getUsedSlots() >= this.MAX_SLOTS;
  }

  /**
   * Emit inventory change event
   */
  private emitChange(): void {
    this.scene.game.events.emit(GAME_EVENTS.INVENTORY_CHANGED, this.slots);
    
    // Save to persistent storage
    SaveService.updateInventory(this.slots);
  }

  /**
   * Save current inventory state
   */
  save(): void {
    SaveService.updateInventory(this.slots);
    SaveService.saveGame();
  }

  /**
   * Clear inventory
   */
  clear(): void {
    this.slots = this.createEmptyInventory();
    this.emitChange();
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.scene.game.events.off(GAME_EVENTS.ITEM_PICKED_UP, this.onItemPickedUp, this);
  }
}
