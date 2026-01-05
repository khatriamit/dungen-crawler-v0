import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, GAME_EVENTS, InventorySlot, ItemData } from '../types';

/**
 * UIScene - Overlay UI for inventory and notifications
 * 
 * Runs parallel to DungeonScene
 */
export class UIScene extends Phaser.Scene {
  private inventoryContainer!: Phaser.GameObjects.Container;
  private isInventoryOpen = false;
  private inventorySlots: Phaser.GameObjects.Container[] = [];
  private selectedSlotIndex = -1;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create(): void {
    this.createInventoryPanel();
    this.setupEvents();
  }

  /**
   * Create inventory panel (hidden by default)
   */
  private createInventoryPanel(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;

    this.inventoryContainer = this.add.container(centerX, centerY);
    this.inventoryContainer.setVisible(false);
    this.inventoryContainer.setDepth(300);

    // Panel background
    const panelWidth = 420;
    const panelHeight = 350;
    
    // Darken background
    const darkBg = this.add.graphics();
    darkBg.fillStyle(0x000000, 0.6);
    darkBg.fillRect(-GAME_CONFIG.WIDTH/2, -GAME_CONFIG.HEIGHT/2, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    this.inventoryContainer.add(darkBg);
    
    // Main panel
    const bg = this.add.graphics();
    bg.fillStyle(0x12101a, 0.98);
    bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 12);
    bg.lineStyle(2, 0x5a5a7a);
    bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 12);
    bg.lineStyle(1, 0x8b7355, 0.3);
    bg.strokeRoundedRect(-panelWidth/2 + 5, -panelHeight/2 + 5, panelWidth - 10, panelHeight - 10, 10);
    this.inventoryContainer.add(bg);

    // Title
    const title = this.add.text(0, -panelHeight/2 + 25, '⚔ INVENTORY ⚔', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#8b7355',
    });
    title.setOrigin(0.5);
    this.inventoryContainer.add(title);

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x3a3a5a);
    divider.lineBetween(-panelWidth/2 + 20, -panelHeight/2 + 50, panelWidth/2 - 20, -panelHeight/2 + 50);
    this.inventoryContainer.add(divider);

    // Create inventory grid (5x4)
    const slotSize = 55;
    const slotGap = 8;
    const cols = 5;
    const rows = 4;
    const gridWidth = cols * slotSize + (cols - 1) * slotGap;
    const gridHeight = rows * slotSize + (rows - 1) * slotGap;
    const startX = -gridWidth / 2;
    const startY = -gridHeight / 2 + 40;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const slotIndex = row * cols + col;
        const slotX = startX + col * (slotSize + slotGap) + slotSize / 2;
        const slotY = startY + row * (slotSize + slotGap) + slotSize / 2;

        const slotContainer = this.createInventorySlot(slotX, slotY, slotSize, slotIndex);
        this.inventoryContainer.add(slotContainer);
        this.inventorySlots.push(slotContainer);
      }
    }

    // Quick use hint
    const quickUseHint = this.add.text(0, panelHeight/2 - 60, 'First 5 slots mapped to keys 1-5', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#5a5a7a',
    });
    quickUseHint.setOrigin(0.5);
    this.inventoryContainer.add(quickUseHint);

    // Close hint
    const closeHint = this.add.text(0, panelHeight/2 - 35, 'Press I or ESC to close', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#6a6a8a',
    });
    closeHint.setOrigin(0.5);
    this.inventoryContainer.add(closeHint);
  }

  /**
   * Create a single inventory slot
   */
  private createInventorySlot(x: number, y: number, size: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Slot background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
    bg.lineStyle(1, 0x3a3a5a);
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 4);
    container.add(bg);

    // Quick slot number (1-5)
    if (index < 5) {
      const numText = this.add.text(-size/2 + 4, -size/2 + 2, (index + 1).toString(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#5a5a7a',
      });
      container.add(numText);
    }

    // Item icon placeholder (will be updated)
    const itemIcon = this.add.graphics();
    itemIcon.setName('itemIcon');
    container.add(itemIcon);

    // Quantity text
    const quantityText = this.add.text(size/2 - 5, size/2 - 5, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    quantityText.setOrigin(1, 1);
    quantityText.setName('quantity');
    container.add(quantityText);

    // Store slot index
    container.setData('slotIndex', index);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, size, size);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4e, 0.95);
      bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
      bg.lineStyle(2, 0x5a5a7a);
      bg.strokeRoundedRect(-size/2, -size/2, size, size, 4);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a2e, 0.9);
      bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
      bg.lineStyle(1, 0x3a3a5a);
      bg.strokeRoundedRect(-size/2, -size/2, size, size, 4);
    });

    hitArea.on('pointerdown', () => {
      this.onSlotClick(index);
    });

    return container;
  }

  /**
   * Handle slot click
   */
  private onSlotClick(index: number): void {
    // For now, just emit use event for consumables
    this.game.events.emit('inventory:slotclick', index);
  }

  /**
   * Update inventory display
   */
  updateInventory(slots: InventorySlot[]): void {
    for (let i = 0; i < this.inventorySlots.length && i < slots.length; i++) {
      const container = this.inventorySlots[i];
      const slot = slots[i];
      
      const itemIcon = container.getByName('itemIcon') as Phaser.GameObjects.Graphics | null;
      const quantityText = container.getByName('quantity') as Phaser.GameObjects.Text | null;
      
      if (!itemIcon || !quantityText) continue;
      
      itemIcon.clear();
      
      if (slot.item) {
        // Draw item icon based on type
        this.drawItemIcon(itemIcon, slot.item);
        
        // Show quantity for stackable items
        if (slot.item.stackable && slot.quantity > 1) {
          quantityText.setText(slot.quantity.toString());
        } else {
          quantityText.setText('');
        }
      } else {
        quantityText.setText('');
      }
    }
  }

  /**
   * Draw item icon
   */
  private drawItemIcon(graphics: Phaser.GameObjects.Graphics, item: ItemData): void {
    const color = this.getRarityColor(item.rarity);
    
    switch (item.type) {
      case 'gem':
        graphics.fillStyle(color);
        graphics.beginPath();
        graphics.moveTo(0, -12);
        graphics.lineTo(10, 0);
        graphics.lineTo(0, 12);
        graphics.lineTo(-10, 0);
        graphics.closePath();
        graphics.fill();
        graphics.fillStyle(0xffffff, 0.3);
        graphics.beginPath();
        graphics.moveTo(0, -8);
        graphics.lineTo(4, -2);
        graphics.lineTo(0, 0);
        graphics.lineTo(-4, -2);
        graphics.closePath();
        graphics.fill();
        break;
        
      case 'consumable':
        graphics.fillStyle(color, 0.8);
        graphics.fillRoundedRect(-8, -4, 16, 18, 4);
        graphics.fillStyle(0x8b7355);
        graphics.fillRect(-5, -10, 10, 7);
        graphics.fillStyle(0x6b5335);
        graphics.fillRect(-4, -14, 8, 5);
        break;
        
      case 'weapon':
        graphics.fillStyle(0xaaaaaa);
        graphics.fillRect(-3, -16, 6, 22);
        graphics.beginPath();
        graphics.moveTo(-3, -16);
        graphics.lineTo(0, -22);
        graphics.lineTo(3, -16);
        graphics.closePath();
        graphics.fill();
        graphics.fillStyle(color);
        graphics.fillRect(-10, 4, 20, 5);
        graphics.fillStyle(0x6b5335);
        graphics.fillRect(-3, 8, 6, 12);
        break;
        
      case 'key':
        graphics.fillStyle(color);
        graphics.fillCircle(0, -6, 10);
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillCircle(0, -6, 5);
        graphics.fillStyle(color);
        graphics.fillRect(-3, 2, 6, 18);
        graphics.fillRect(3, 10, 6, 3);
        graphics.fillRect(3, 16, 5, 3);
        break;
        
      default:
        graphics.fillStyle(color);
        graphics.fillRect(-10, -10, 20, 20);
    }
  }

  /**
   * Get color based on rarity
   */
  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'common': return 0x888888;
      case 'uncommon': return 0x44aa44;
      case 'rare': return 0x4488ff;
      case 'epic': return 0xaa44aa;
      case 'legendary': return 0xffaa00;
      default: return 0x888888;
    }
  }

  /**
   * Toggle inventory visibility
   */
  toggleInventory(): void {
    this.isInventoryOpen = !this.isInventoryOpen;
    
    if (this.isInventoryOpen) {
      this.inventoryContainer.setVisible(true);
      this.inventoryContainer.setAlpha(0);
      this.inventoryContainer.setScale(0.9);
      
      this.tweens.add({
        targets: this.inventoryContainer,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.inventoryContainer,
        alpha: 0,
        scale: 0.9,
        duration: 150,
        onComplete: () => {
          this.inventoryContainer.setVisible(false);
        },
      });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEvents(): void {
    // Toggle inventory
    this.game.events.on(GAME_EVENTS.TOGGLE_INVENTORY, this.toggleInventory, this);
    
    // Inventory changed
    this.game.events.on(GAME_EVENTS.INVENTORY_CHANGED, this.updateInventory, this);
    
    // ESC to close inventory
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.isInventoryOpen) {
        this.toggleInventory();
      }
    });
    
    // I to toggle inventory
    this.input.keyboard!.on('keydown-I', () => {
      this.toggleInventory();
    });
  }

  /**
   * Check if inventory is open
   */
  isOpen(): boolean {
    return this.isInventoryOpen;
  }
}
