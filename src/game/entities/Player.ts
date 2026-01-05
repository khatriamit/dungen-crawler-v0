import Phaser from 'phaser';
import { PlayerStats, GAME_EVENTS, ItemData, EntityStats } from '../types';
import { SaveService } from '../services/SaveService';

/**
 * Player Entity
 * 
 * The main player character with:
 * - Physics-based movement
 * - Health and combat stats
 * - Attack capabilities
 * - Inventory integration
 * - Animation states
 */

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  texture: string;
}

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  // Visual components
  private sprite!: Phaser.GameObjects.Sprite;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private healthBar!: Phaser.GameObjects.Graphics;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  
  // Stats
  private stats: PlayerStats;
  private baseStats: PlayerStats;
  
  // Combat state
  private isAttacking = false;
  private attackCooldown = 0;
  private readonly ATTACK_COOLDOWN_MS = 400;
  private readonly ATTACK_RANGE = 50;
  private readonly KNOCKBACK_FORCE = 200;
  
  // Invincibility frames
  private isInvincible = false;
  private invincibilityTimer = 0;
  private readonly INVINCIBILITY_MS = 500;
  
  // Movement
  private facing: 'left' | 'right' | 'up' | 'down' = 'down';
  private isMoving = false;
  
  // Active buffs
  private activeBuffs: Map<string, { stat: keyof EntityStats; value: number; endTime: number }> = new Map();

  constructor(config: PlayerConfig) {
    super(config.scene, config.x, config.y);
    
    // Initialize stats from save or defaults
    const saveData = SaveService.getSaveData();
    this.baseStats = saveData?.playerStats ?? {
      health: 100,
      maxHealth: 100,
      attack: 15,
      defense: 5,
      speed: 150,
      gems: 0,
      experience: 0,
      level: 1,
    };
    this.stats = { ...this.baseStats };
    
    // Create visual components
    this.createVisuals(config.texture);
    
    // Add to scene
    config.scene.add.existing(this);
    config.scene.physics.add.existing(this);
    
    // Configure physics body
    this.setupPhysics();
    
    // Set depth for layering
    this.setDepth(10);
  }

  /**
   * Create all visual components
   */
  private createVisuals(texture: string): void {
    // Shadow under player
    this.shadowSprite = this.scene.add.ellipse(0, 18, 32, 12, 0x000000, 0.4);
    this.add(this.shadowSprite);
    
    // Main sprite - use hero frames if available
    if (this.scene.textures.exists('hero_frame_0')) {
      this.sprite = this.scene.add.sprite(0, -8, 'hero_frame_0');
      this.sprite.setDisplaySize(48, 56);
      // Start idle animation if it exists
      if (this.scene.anims.exists('hero_idle')) {
        this.sprite.play('hero_idle');
      }
    } else {
      this.sprite = this.scene.add.sprite(0, 0, texture);
    }
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);
    
    // Hit flash overlay (hidden by default)
    this.hitFlash = this.scene.add.rectangle(0, 0, 32, 32, 0xffffff, 0);
    this.add(this.hitFlash);
    
    // Health bar above player
    this.healthBar = this.scene.add.graphics();
    this.healthBar.setPosition(0, -25);
    this.add(this.healthBar);
    this.updateHealthBar();
  }

  /**
   * Setup physics body
   */
  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    body.setOffset(-10, -10);
    body.setCollideWorldBounds(true);
    body.setDrag(800, 800);
    body.setMaxVelocity(this.stats.speed, this.stats.speed);
  }

  /**
   * Update player each frame
   */
  update(delta: number): void {
    // Update cooldowns
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
    
    // Update invincibility
    if (this.isInvincible) {
      this.invincibilityTimer -= delta;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.sprite.setAlpha(1);
      } else {
        // Flashing effect during invincibility
        this.sprite.setAlpha(Math.sin(this.invincibilityTimer * 0.02) * 0.3 + 0.7);
      }
    }
    
    // Update buffs
    this.updateBuffs();
    
    // Update movement animation
    this.updateAnimation();
  }

  /**
   * Move player in a direction
   */
  move(velocityX: number, velocityY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = this.getEffectiveStat('speed');
    
    body.setVelocity(velocityX * speed, velocityY * speed);
    
    // Update facing direction - only track left/right for sprite flip
    // Keep separate facing for attack direction
    if (velocityX > 0) {
      this.facing = 'right';
    } else if (velocityX < 0) {
      this.facing = 'left';
    } else if (velocityY > 0) {
      this.facing = 'down';
    } else if (velocityY < 0) {
      this.facing = 'up';
    }
    
    this.isMoving = velocityX !== 0 || velocityY !== 0;
    
    // Only flip sprite for left/right movement, not up/down
    if (velocityX !== 0) {
      this.sprite.setFlipX(velocityX < 0);
    }
  }

  /**
   * Stop player movement
   */
  stop(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.isMoving = false;
  }

  /**
   * Perform attack
   */
  attack(): Phaser.Geom.Circle | null {
    if (this.attackCooldown > 0 || this.isAttacking) {
      return null;
    }
    
    this.isAttacking = true;
    this.attackCooldown = this.ATTACK_COOLDOWN_MS;
    
    // Calculate attack position based on facing
    let attackX = this.x;
    let attackY = this.y;
    
    switch (this.facing) {
      case 'left': attackX -= this.ATTACK_RANGE * 0.7; break;
      case 'right': attackX += this.ATTACK_RANGE * 0.7; break;
      case 'up': attackY -= this.ATTACK_RANGE * 0.7; break;
      case 'down': attackY += this.ATTACK_RANGE * 0.7; break;
    }
    
    // Visual attack effect
    this.playAttackAnimation();
    
    // Return attack hitbox
    const hitbox = new Phaser.Geom.Circle(attackX, attackY, this.ATTACK_RANGE);
    
    // Reset attack state after animation
    this.scene.time.delayedCall(200, () => {
      this.isAttacking = false;
    });
    
    return hitbox;
  }

  /**
   * Play attack animation
   */
  private playAttackAnimation(): void {
    // Play attack animation if using hero frames
    if (this.scene.textures.exists('hero_frame_0') && this.scene.anims.exists('hero_attack')) {
      this.sprite.play('hero_attack');
      this.sprite.once('animationcomplete', () => {
        if (this.scene.anims.exists('hero_idle')) {
          this.sprite.play('hero_idle');
        }
      });
    }
    
    // Quick lunge in facing direction
    const lungeDistance = 8;
    let lungeX = 0;
    let lungeY = -8; // Base offset for hero sprite
    
    switch (this.facing) {
      case 'left': lungeX = -lungeDistance; break;
      case 'right': lungeX = lungeDistance; break;
      case 'up': lungeY = -lungeDistance - 8; break;
      case 'down': lungeY = lungeDistance - 8; break;
    }
    
    // Create slash effect
    this.createSlashEffect();
    
    // Lunge animation
    this.scene.tweens.add({
      targets: this.sprite,
      x: lungeX,
      y: lungeY,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        this.sprite.x = 0;
        this.sprite.y = -8;
      }
    });
  }

  /**
   * Create visual slash effect
   */
  private createSlashEffect(): void {
    const slash = this.scene.add.graphics();
    
    let slashX = this.x;
    let slashY = this.y;
    let angle = 0;
    
    switch (this.facing) {
      case 'right': slashX += 25; angle = 0; break;
      case 'left': slashX -= 25; angle = 180; break;
      case 'down': slashY += 25; angle = 90; break;
      case 'up': slashY -= 25; angle = -90; break;
    }
    
    slash.setPosition(slashX, slashY);
    slash.setRotation(Phaser.Math.DegToRad(angle));
    
    // Draw arc slash
    slash.lineStyle(3, 0xffffff, 0.8);
    slash.beginPath();
    slash.arc(0, 0, 20, -0.8, 0.8);
    slash.stroke();
    
    slash.lineStyle(2, 0xffdd88, 0.6);
    slash.beginPath();
    slash.arc(0, 0, 25, -0.6, 0.6);
    slash.stroke();
    
    // Fade out and destroy
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => slash.destroy(),
    });
  }

  /**
   * Take damage from an attack
   */
  takeDamage(amount: number, knockbackSource?: { x: number; y: number }): number {
    if (this.isInvincible) return 0;
    
    // Calculate actual damage after defense
    const defense = this.getEffectiveStat('defense');
    const actualDamage = Math.max(1, amount - defense);
    
    // Apply damage
    this.stats.health = Math.max(0, this.stats.health - actualDamage);
    
    // Play hurt sound
    this.playSound('playerHurt');
    
    // Visual feedback
    this.flashRed();
    this.updateHealthBar();
    
    // Knockback
    if (knockbackSource) {
      this.applyKnockback(knockbackSource);
    }
    
    // Screen shake
    this.scene.cameras.main.shake(100, 0.005);
    
    // Start invincibility
    this.isInvincible = true;
    this.invincibilityTimer = this.INVINCIBILITY_MS;
    
    // Emit event
    this.scene.game.events.emit(GAME_EVENTS.PLAYER_DAMAGED, this.stats.health, this.stats.maxHealth);
    
    // Check for death
    if (this.stats.health <= 0) {
      this.die();
    }
    
    return actualDamage;
  }

  /**
   * Play a sound effect
   */
  private playSound(soundName: string): void {
    const sounds = this.scene.game.registry.get('sounds');
    if (sounds && sounds[soundName]) {
      try {
        sounds[soundName]();
      } catch (e) {
        // Audio context might not be ready
      }
    }
  }

  /**
   * Apply knockback force
   */
  private applyKnockback(source: { x: number; y: number }): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
    
    body.setVelocity(
      Math.cos(angle) * this.KNOCKBACK_FORCE,
      Math.sin(angle) * this.KNOCKBACK_FORCE
    );
  }

  /**
   * Flash red when hit
   */
  private flashRed(): void {
    this.hitFlash.setFillStyle(0xff0000, 0.5);
    
    this.scene.tweens.add({
      targets: this.hitFlash,
      alpha: { from: 0.5, to: 0 },
      duration: 150,
    });
  }

  /**
   * Heal the player
   */
  heal(amount: number): number {
    const oldHealth = this.stats.health;
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    const actualHeal = this.stats.health - oldHealth;
    
    if (actualHeal > 0) {
      this.updateHealthBar();
      this.showHealEffect(actualHeal);
      this.scene.game.events.emit(GAME_EVENTS.PLAYER_HEALED, this.stats.health, this.stats.maxHealth);
    }
    
    return actualHeal;
  }

  /**
   * Show healing visual effect
   */
  private showHealEffect(amount: number): void {
    // Green flash
    this.hitFlash.setFillStyle(0x00ff00, 0.3);
    this.scene.tweens.add({
      targets: this.hitFlash,
      alpha: { from: 0.3, to: 0 },
      duration: 300,
    });
    
    // Floating heal number
    const healText = this.scene.add.text(this.x, this.y - 30, `+${amount}`, {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 2,
    });
    healText.setOrigin(0.5);
    healText.setDepth(100);
    
    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => healText.destroy(),
    });
  }

  /**
   * Update health bar display
   */
  private updateHealthBar(): void {
    this.healthBar.clear();
    
    const width = 30;
    const height = 4;
    const x = -width / 2;
    const y = 0;
    
    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(x - 1, y - 1, width + 2, height + 2);
    
    // Health remaining
    const healthPercent = this.stats.health / this.stats.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x44aa44 : healthPercent > 0.25 ? 0xaaaa44 : 0xaa4444;
    
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(x, y, width * healthPercent, height);
    
    // Border
    this.healthBar.lineStyle(1, 0x333333);
    this.healthBar.strokeRect(x - 1, y - 1, width + 2, height + 2);
  }

  /**
   * Handle player death
   */
  private die(): void {
    this.scene.game.events.emit(GAME_EVENTS.PLAYER_DIED);
    
    // Death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      angle: 360,
      duration: 500,
      onComplete: () => {
        // Will be handled by DungeonScene
      },
    });
  }

  /**
   * Update animation based on state
   */
  private updateAnimation(): void {
    // Use spritesheet animations if available
    if (this.scene.textures.exists('hero_frame_0') && this.scene.anims.exists('hero_idle')) {
      const currentAnim = this.sprite.anims.currentAnim?.key;
      
      if (this.isAttacking) {
        // Attack animation handled in attack method
        return;
      } else if (this.isMoving) {
        if (currentAnim !== 'hero_walk') {
          this.sprite.play('hero_walk');
        }
      } else {
        if (currentAnim !== 'hero_idle' && currentAnim !== 'hero_attack') {
          this.sprite.play('hero_idle');
        }
      }
    } else {
      // Fallback: Simple bob animation when moving
      if (this.isMoving && !this.isAttacking) {
        const bobAmount = Math.sin(this.scene.time.now * 0.01) * 2;
        this.sprite.y = bobAmount - 8;
      } else {
        this.sprite.y = -8;
      }
    }
  }

  /**
   * Apply a temporary buff
   */
  applyBuff(id: string, stat: keyof EntityStats, value: number, duration: number): void {
    this.activeBuffs.set(id, {
      stat,
      value,
      endTime: this.scene.time.now + duration,
    });
  }

  /**
   * Update and remove expired buffs
   */
  private updateBuffs(): void {
    const now = this.scene.time.now;
    
    for (const [id, buff] of this.activeBuffs) {
      if (now >= buff.endTime) {
        this.activeBuffs.delete(id);
      }
    }
  }

  /**
   * Get effective stat including buffs
   */
  getEffectiveStat(stat: keyof EntityStats): number {
    let value = this.stats[stat] as number;
    
    for (const buff of this.activeBuffs.values()) {
      if (buff.stat === stat) {
        value += buff.value;
      }
    }
    
    return Math.max(0, value);
  }

  /**
   * Use a consumable item
   */
  useItem(item: ItemData): boolean {
    if (!item.effects) return false;
    
    for (const effect of item.effects) {
      switch (effect.type) {
        case 'heal':
          this.heal(effect.value);
          break;
        case 'buff':
          if (effect.stat && effect.duration) {
            this.applyBuff(item.id, effect.stat, effect.value, effect.duration);
          }
          break;
      }
    }
    
    this.scene.game.events.emit(GAME_EVENTS.ITEM_USED, item);
    return true;
  }

  /**
   * Add gems to player
   */
  addGems(amount: number): void {
    this.stats.gems += amount;
    SaveService.updatePlayerStats({ gems: this.stats.gems });
  }

  /**
   * Add experience and check for level up
   */
  addExperience(amount: number): void {
    this.stats.experience += amount;
    
    // Simple level up formula: 100 * level XP needed
    const xpNeeded = this.stats.level * 100;
    
    if (this.stats.experience >= xpNeeded) {
      this.levelUp();
    }
  }

  /**
   * Level up the player
   */
  private levelUp(): void {
    this.stats.level++;
    this.stats.experience = 0;
    
    // Increase base stats
    this.stats.maxHealth += 10;
    this.stats.health = this.stats.maxHealth;
    this.stats.attack += 2;
    this.stats.defense += 1;
    
    // Visual effect
    this.showLevelUpEffect();
    
    this.scene.game.events.emit(GAME_EVENTS.PLAYER_LEVEL_UP, this.stats.level);
    SaveService.updatePlayerStats(this.stats);
  }

  /**
   * Show level up visual effect
   */
  private showLevelUpEffect(): void {
    // Golden burst
    const burst = this.scene.add.graphics();
    burst.setPosition(this.x, this.y);
    burst.fillStyle(0xffd700, 0.5);
    burst.fillCircle(0, 0, 10);
    
    this.scene.tweens.add({
      targets: burst,
      scale: 5,
      alpha: 0,
      duration: 500,
      onComplete: () => burst.destroy(),
    });
    
    // Level up text
    const text = this.scene.add.text(this.x, this.y - 40, 'LEVEL UP!', {
      fontFamily: 'Georgia',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Get current stats
   */
  getStats(): PlayerStats {
    return { ...this.stats };
  }

  /**
   * Set player health directly
   */
  setHealth(health: number): void {
    this.stats.health = Math.max(0, Math.min(this.stats.maxHealth, health));
    this.updateHealthBar();
  }

  /**
   * Get current gems
   */
  getGems(): number {
    return this.stats.gems;
  }

  /**
   * Get attack damage
   */
  getAttackDamage(): number {
    return this.getEffectiveStat('attack');
  }

  /**
   * Check if player is alive
   */
  isAlive(): boolean {
    return this.stats.health > 0;
  }

  /**
   * Get facing direction
   */
  getFacing(): 'left' | 'right' | 'up' | 'down' {
    return this.facing;
  }

  /**
   * Reset player for new dungeon run
   */
  reset(): void {
    this.stats.health = this.stats.maxHealth;
    this.isInvincible = false;
    this.attackCooldown = 0;
    this.activeBuffs.clear();
    this.updateHealthBar();
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
  }
}
