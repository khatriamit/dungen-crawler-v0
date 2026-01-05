import Phaser from 'phaser';
import { Player } from '../entities/Player';

/**
 * MovementSystem
 * 
 * Handles player input and movement:
 * - WASD / Arrow key input
 * - Diagonal movement normalization
 * - Attack input
 */

export class MovementSystem {
  private scene: Phaser.Scene;
  private player: Player | null = null;
  
  // Input keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private useItemKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInput();
  }

  /**
   * Set player reference
   */
  setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Setup input handlers
   */
  private setupInput(): void {
    // Arrow keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // WASD keys
    this.wasdKeys = {
      W: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    // Attack key (Space or J)
    this.attackKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Quick use item keys (1-5)
    for (let i = 1; i <= 5; i++) {
      const key = this.scene.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes[`ONE` as keyof typeof Phaser.Input.Keyboard.KeyCodes] + (i - 1)
      );
      this.useItemKeys.push(key);
    }
  }

  /**
   * Update movement each frame
   */
  update(): { velocityX: number; velocityY: number; isAttacking: boolean; itemSlot: number } {
    let velocityX = 0;
    let velocityY = 0;
    let isAttacking = false;
    let itemSlot = -1;
    
    // Horizontal movement
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocityX = -1;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocityX = 1;
    }
    
    // Vertical movement
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocityY = -1;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocityY = 1;
    }
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      velocityX /= length;
      velocityY /= length;
    }
    
    // Attack input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      isAttacking = true;
    }
    
    // Item use input
    for (let i = 0; i < this.useItemKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.useItemKeys[i])) {
        itemSlot = i;
        break;
      }
    }
    
    // Apply movement to player
    if (this.player) {
      if (velocityX === 0 && velocityY === 0) {
        this.player.stop();
      } else {
        this.player.move(velocityX, velocityY);
      }
    }
    
    return { velocityX, velocityY, isAttacking, itemSlot };
  }

  /**
   * Check if any movement key is pressed
   */
  isMoving(): boolean {
    return this.cursors.left.isDown || this.cursors.right.isDown ||
           this.cursors.up.isDown || this.cursors.down.isDown ||
           this.wasdKeys.W.isDown || this.wasdKeys.A.isDown ||
           this.wasdKeys.S.isDown || this.wasdKeys.D.isDown;
  }

  /**
   * Get current movement direction
   */
  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) x = -1;
    else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) x = 1;
    
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) y = -1;
    else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) y = 1;
    
    return { x, y };
  }

  /**
   * Disable input (during cutscenes, etc)
   */
  disable(): void {
    this.scene.input.keyboard!.enabled = false;
  }

  /**
   * Enable input
   */
  enable(): void {
    this.scene.input.keyboard!.enabled = true;
  }

  /**
   * Clean up
   */
  destroy(): void {
    // Keys are automatically cleaned up with scene
  }
}
