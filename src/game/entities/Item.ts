import Phaser from 'phaser';
import { ItemData, ItemRarity } from '../types';

/**
 * Item Entity
 * 
 * Collectible item on the ground with:
 * - Visual representation based on rarity
 * - Pickup collision
 * - Floating animation
 * - Magnetic attraction to player
 */

export interface ItemConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  itemData: ItemData;
  quantity: number;
}

export class Item extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  public readonly itemData: ItemData;
  public quantity: number;
  
  private sprite!: Phaser.GameObjects.Graphics;
  private glowSprite!: Phaser.GameObjects.Graphics;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private quantityText: Phaser.GameObjects.Text | null = null;
  
  private floatOffset = 0;
  private readonly MAGNET_RANGE = 60;
  private readonly MAGNET_SPEED = 200;
  private isMagneting = false;

  constructor(config: ItemConfig) {
    super(config.scene, config.x, config.y);
    
    this.itemData = config.itemData;
    this.quantity = config.quantity;
    
    // Random float offset for variety
    this.floatOffset = Math.random() * Math.PI * 2;
    
    // Create visuals
    this.createVisuals();
    
    // Add to scene
    config.scene.add.existing(this);
    config.scene.physics.add.existing(this);
    
    // Setup physics
    this.setupPhysics();
    
    // Set depth
    this.setDepth(5);
    
    // Spawn animation
    this.playSpawnAnimation();
  }

  /**
   * Create visual components
   */
  private createVisuals(): void {
    // Shadow
    this.shadowSprite = this.scene.add.ellipse(0, 10, 16, 6, 0x000000, 0.2);
    this.add(this.shadowSprite);
    
    // Glow effect based on rarity
    this.glowSprite = this.scene.add.graphics();
    this.drawGlow();
    this.add(this.glowSprite);
    
    // Main item sprite
    this.sprite = this.scene.add.graphics();
    this.drawItem();
    this.add(this.sprite);
    
    // Quantity text for stackable items
    if (this.itemData.stackable && this.quantity > 1) {
      this.quantityText = this.scene.add.text(8, 4, `x${this.quantity}`, {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      });
      this.quantityText.setOrigin(0.5);
      this.add(this.quantityText);
    }
  }

  /**
   * Draw glow effect based on rarity
   */
  private drawGlow(): void {
    const color = this.getRarityColor();
    const glowSize = this.getRarityGlowSize();
    
    this.glowSprite.clear();
    
    if (this.itemData.rarity !== 'common') {
      this.glowSprite.fillStyle(color, 0.2);
      this.glowSprite.fillCircle(0, 0, glowSize);
      this.glowSprite.fillStyle(color, 0.1);
      this.glowSprite.fillCircle(0, 0, glowSize + 5);
    }
  }

  /**
   * Draw the item sprite
   */
  private drawItem(): void {
    this.sprite.clear();
    
    const color = this.getRarityColor();
    
    switch (this.itemData.type) {
      case 'gem':
        this.drawGem(color);
        break;
      case 'consumable':
        this.drawPotion(color);
        break;
      case 'weapon':
        this.drawWeapon(color);
        break;
      case 'key':
        this.drawKey(color);
        break;
      default:
        this.drawDefault(color);
    }
  }

  /**
   * Draw gem shape
   */
  private drawGem(color: number): void {
    // Diamond shape
    this.sprite.fillStyle(color);
    this.sprite.beginPath();
    this.sprite.moveTo(0, -8);
    this.sprite.lineTo(6, 0);
    this.sprite.lineTo(0, 8);
    this.sprite.lineTo(-6, 0);
    this.sprite.closePath();
    this.sprite.fill();
    
    // Highlight
    this.sprite.fillStyle(0xffffff, 0.4);
    this.sprite.beginPath();
    this.sprite.moveTo(0, -6);
    this.sprite.lineTo(3, -1);
    this.sprite.lineTo(0, 0);
    this.sprite.lineTo(-3, -1);
    this.sprite.closePath();
    this.sprite.fill();
    
    // Outline
    this.sprite.lineStyle(1, this.darkenColor(color));
    this.sprite.beginPath();
    this.sprite.moveTo(0, -8);
    this.sprite.lineTo(6, 0);
    this.sprite.lineTo(0, 8);
    this.sprite.lineTo(-6, 0);
    this.sprite.closePath();
    this.sprite.stroke();
  }

  /**
   * Draw potion shape
   */
  private drawPotion(color: number): void {
    // Bottle body
    this.sprite.fillStyle(color, 0.8);
    this.sprite.fillRoundedRect(-5, -2, 10, 12, 3);
    
    // Bottle neck
    this.sprite.fillStyle(0x8b7355);
    this.sprite.fillRect(-3, -6, 6, 5);
    
    // Cork
    this.sprite.fillStyle(0x6b5335);
    this.sprite.fillRect(-2, -8, 4, 3);
    
    // Liquid highlight
    this.sprite.fillStyle(0xffffff, 0.3);
    this.sprite.fillRect(-3, 0, 2, 6);
    
    // Outline
    this.sprite.lineStyle(1, this.darkenColor(color));
    this.sprite.strokeRoundedRect(-5, -2, 10, 12, 3);
  }

  /**
   * Draw weapon shape
   */
  private drawWeapon(color: number): void {
    // Blade
    this.sprite.fillStyle(0xaaaaaa);
    this.sprite.fillRect(-2, -10, 4, 14);
    
    // Blade tip
    this.sprite.beginPath();
    this.sprite.moveTo(-2, -10);
    this.sprite.lineTo(0, -14);
    this.sprite.lineTo(2, -10);
    this.sprite.closePath();
    this.sprite.fill();
    
    // Guard
    this.sprite.fillStyle(color);
    this.sprite.fillRect(-6, 3, 12, 3);
    
    // Handle
    this.sprite.fillStyle(0x6b5335);
    this.sprite.fillRect(-2, 5, 4, 8);
    
    // Pommel
    this.sprite.fillStyle(color);
    this.sprite.fillCircle(0, 14, 3);
    
    // Blade shine
    this.sprite.fillStyle(0xffffff, 0.4);
    this.sprite.fillRect(-1, -8, 1, 10);
  }

  /**
   * Draw key shape
   */
  private drawKey(color: number): void {
    // Key head (circle)
    this.sprite.fillStyle(color);
    this.sprite.fillCircle(0, -4, 6);
    this.sprite.fillStyle(0x000000, 0.3);
    this.sprite.fillCircle(0, -4, 3);
    
    // Key shaft
    this.sprite.fillStyle(color);
    this.sprite.fillRect(-2, 0, 4, 12);
    
    // Key teeth
    this.sprite.fillRect(2, 6, 4, 2);
    this.sprite.fillRect(2, 10, 3, 2);
    
    // Outline
    this.sprite.lineStyle(1, this.darkenColor(color));
    this.sprite.strokeCircle(0, -4, 6);
  }

  /**
   * Draw default item shape
   */
  private drawDefault(color: number): void {
    this.sprite.fillStyle(color);
    this.sprite.fillRect(-6, -6, 12, 12);
    
    this.sprite.lineStyle(1, this.darkenColor(color));
    this.sprite.strokeRect(-6, -6, 12, 12);
  }

  /**
   * Get color based on rarity
   */
  private getRarityColor(): number {
    switch (this.itemData.rarity) {
      case 'common': return 0x888888;
      case 'uncommon': return 0x44aa44;
      case 'rare': return 0x4488ff;
      case 'epic': return 0xaa44aa;
      case 'legendary': return 0xffaa00;
      default: return 0x888888;
    }
  }

  /**
   * Get glow size based on rarity
   */
  private getRarityGlowSize(): number {
    switch (this.itemData.rarity) {
      case 'uncommon': return 12;
      case 'rare': return 14;
      case 'epic': return 16;
      case 'legendary': return 20;
      default: return 0;
    }
  }

  /**
   * Darken a color for outlines
   */
  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) - 40);
    const g = Math.max(0, ((color >> 8) & 0xff) - 40);
    const b = Math.max(0, (color & 0xff) - 40);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Setup physics body
   */
  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    body.setOffset(-10, -10);
    body.setCollideWorldBounds(true);
    body.setDrag(200, 200);
    body.setMaxVelocity(300, 300);
  }

  /**
   * Play spawn animation
   */
  private playSpawnAnimation(): void {
    // Start small and pop out
    this.setScale(0);
    this.setAlpha(0);
    
    // Random direction burst
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 30;
    const startX = this.x;
    const startY = this.y;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * 100,
      Math.sin(angle) * 100 - 50
    );
    
    // Scale and fade in
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Update item each frame
   */
  update(delta: number, playerX: number, playerY: number): void {
    // Floating animation
    const floatY = Math.sin((this.scene.time.now * 0.003) + this.floatOffset) * 3;
    this.sprite.y = floatY;
    this.glowSprite.y = floatY;
    if (this.quantityText) {
      this.quantityText.y = floatY + 4;
    }
    
    // Shadow size based on height
    const shadowScale = 1 - Math.abs(floatY) * 0.03;
    this.shadowSprite.setScale(shadowScale, shadowScale * 0.4);
    
    // Glow pulse for rare+ items
    if (this.itemData.rarity !== 'common') {
      const glowAlpha = 0.8 + Math.sin(this.scene.time.now * 0.005) * 0.2;
      this.glowSprite.setAlpha(glowAlpha);
    }
    
    // Magnetic attraction to player
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    
    if (distToPlayer < this.MAGNET_RANGE) {
      this.isMagneting = true;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const speed = this.MAGNET_SPEED * (1 - distToPlayer / this.MAGNET_RANGE);
      
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
    } else if (this.isMagneting) {
      this.isMagneting = false;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
  }

  /**
   * Play pickup animation and destroy
   */
  pickup(): void {
    // Disable physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);
    
    // Pickup animation
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      y: this.y - 20,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
    
    // Sparkle effect
    this.createPickupParticles();
  }

  /**
   * Create pickup sparkle effect
   */
  private createPickupParticles(): void {
    const color = this.getRarityColor();
    
    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y);
      particle.fillStyle(color);
      particle.fillCircle(0, 0, 2);
      
      const angle = (i / 6) * Math.PI * 2;
      const distance = 20;
      
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance - 10,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Get item value (for selling)
   */
  getValue(): number {
    return this.itemData.value * this.quantity;
  }

  /**
   * Get display name with quantity
   */
  getDisplayName(): string {
    if (this.quantity > 1) {
      return `${this.itemData.name} x${this.quantity}`;
    }
    return this.itemData.name;
  }
}
