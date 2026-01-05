import Phaser from 'phaser';
import { LootEntry, ItemData, GAME_EVENTS } from '../types';
import { Item } from '../entities/Item';
import { Player } from '../entities/Player';
import { getItem } from '../data/items';

/**
 * LootSystem
 * 
 * Handles item drops and pickup:
 * - Roll loot from loot tables
 * - Spawn item entities
 * - Process pickups
 * - Emit loot events
 */

export class LootSystem {
  private scene: Phaser.Scene;
  private items: Item[] = [];
  private player: Player | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Listen for enemy deaths
    this.scene.game.events.on(GAME_EVENTS.ENEMY_DIED, this.onEnemyDied, this);
  }

  /**
   * Set player reference
   */
  setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Handle enemy death - roll and spawn loot
   */
  private onEnemyDied(enemy: { x: number; y: number }, lootTable: LootEntry[]): void {
    const droppedItems = this.rollLoot(lootTable);
    
    droppedItems.forEach((drop, index) => {
      // Slight delay between drops for visual effect
      this.scene.time.delayedCall(index * 50, () => {
        this.spawnItem(
          enemy.x + (Math.random() - 0.5) * 20,
          enemy.y + (Math.random() - 0.5) * 20,
          drop.item,
          drop.quantity
        );
      });
    });
  }

  /**
   * Roll loot from a loot table
   */
  rollLoot(lootTable: LootEntry[]): { item: ItemData; quantity: number }[] {
    const drops: { item: ItemData; quantity: number }[] = [];
    
    for (const entry of lootTable) {
      // Roll for drop
      if (Math.random() <= entry.dropChance) {
        const itemData = getItem(entry.itemId);
        if (itemData) {
          // Roll quantity
          const quantity = entry.minQuantity + 
            Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1));
          
          drops.push({ item: itemData, quantity });
        }
      }
    }
    
    return drops;
  }

  /**
   * Spawn an item at a position
   */
  spawnItem(x: number, y: number, itemData: ItemData, quantity: number = 1): Item {
    const item = new Item({
      scene: this.scene,
      x,
      y,
      itemData,
      quantity,
    });
    
    this.items.push(item);
    return item;
  }

  /**
   * Spawn multiple items from a loot table
   */
  spawnLootAt(x: number, y: number, lootTable: LootEntry[]): void {
    const drops = this.rollLoot(lootTable);
    
    drops.forEach((drop, index) => {
      const angle = (index / drops.length) * Math.PI * 2;
      const offset = 15;
      
      this.spawnItem(
        x + Math.cos(angle) * offset,
        y + Math.sin(angle) * offset,
        drop.item,
        drop.quantity
      );
    });
  }

  /**
   * Update all items
   */
  update(delta: number): void {
    if (!this.player) return;
    
    // Update each item
    for (const item of this.items) {
      item.update(delta, this.player.x, this.player.y);
    }
  }

  /**
   * Check for item pickups
   */
  checkPickups(): { item: ItemData; quantity: number }[] {
    if (!this.player) return [];
    
    const pickedUp: { item: ItemData; quantity: number }[] = [];
    const pickupRange = 25;
    
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        item.x, item.y
      );
      
      if (dist < pickupRange) {
        // Pick up the item
        pickedUp.push({
          item: item.itemData,
          quantity: item.quantity,
        });
        
        // Show pickup text
        this.showPickupText(item);
        
        // Play pickup animation
        item.pickup();
        
        // Remove from array
        this.items.splice(i, 1);
        
        // Emit event
        this.scene.game.events.emit(GAME_EVENTS.ITEM_PICKED_UP, item.itemData, item.quantity);
      }
    }
    
    return pickedUp;
  }

  /**
   * Show pickup notification text
   */
  private showPickupText(item: Item): void {
    const text = this.scene.add.text(item.x, item.y - 20, item.getDisplayName(), {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: this.getRarityTextColor(item.itemData.rarity),
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Get text color based on rarity
   */
  private getRarityTextColor(rarity: string): string {
    switch (rarity) {
      case 'common': return '#ffffff';
      case 'uncommon': return '#44ff44';
      case 'rare': return '#4488ff';
      case 'epic': return '#aa44ff';
      case 'legendary': return '#ffaa00';
      default: return '#ffffff';
    }
  }

  /**
   * Get all active items
   */
  getItems(): Item[] {
    return this.items;
  }

  /**
   * Clear all items
   */
  clear(): void {
    for (const item of this.items) {
      item.destroy();
    }
    this.items = [];
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.scene.game.events.off(GAME_EVENTS.ENEMY_DIED, this.onEnemyDied, this);
    this.clear();
  }
}
