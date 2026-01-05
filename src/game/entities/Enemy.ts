import Phaser from 'phaser';
import { EnemyData, EnemyStats, AIState, GAME_EVENTS, LootEntry } from '../types';
import { Player } from './Player';

/**
 * Enemy Entity
 * 
 * Base enemy class with:
 * - AI state machine (idle, patrol, chase, attack)
 * - Combat capabilities
 * - Loot drops on death
 * - Visual feedback
 */

export interface EnemyConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  data: EnemyData;
}

export class Enemy extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  // Data
  public readonly enemyData: EnemyData;
  private stats: EnemyStats;
  
  // Visual components
  private sprite!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private healthBar!: Phaser.GameObjects.Graphics;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private stateIndicator!: Phaser.GameObjects.Text;
  
  // Sprite type (randomly chosen between orc, goblin, slime)
  private spriteType: 'orc' | 'goblin' | 'slime' = 'orc';
  
  // AI State
  private currentState: AIState = 'idle';
  private target: Player | null = null;
  private stateTimer = 0;
  
  // Patrol
  private patrolPoints: Phaser.Math.Vector2[] = [];
  private currentPatrolIndex = 0;
  private patrolWaitTime = 0;
  
  // Combat
  private attackCooldown = 0;
  private isAttacking = false;
  private readonly KNOCKBACK_FORCE = 150;
  
  // Death state
  private isDead = false;

  constructor(config: EnemyConfig) {
    super(config.scene, config.x, config.y);
    
    this.enemyData = config.data;
    this.stats = { ...config.data.stats };
    
    // Randomly choose sprite type (bosses always orc, others random)
    if (config.data.type === 'boss') {
      this.spriteType = 'orc';
    } else {
      const rand = Math.random();
      if (rand < 0.33) {
        this.spriteType = 'orc';
      } else if (rand < 0.66) {
        this.spriteType = 'goblin';
      } else {
        this.spriteType = 'slime';
      }
    }
    
    // Create visuals
    this.createVisuals();
    
    // Add to scene
    config.scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    config.scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    
    // Setup physics
    this.setupPhysics();
    
    // Generate patrol points around spawn
    this.generatePatrolPoints();
    
    // Set depth
    this.setDepth(8);
    
    // Start in idle state
    this.setAIState('idle');
  }

  /**
   * Create visual components
   */
  private createVisuals(): void {
    const isBoss = this.enemyData.type === 'boss';
    let size = isBoss ? 48 : 36;
    if (this.spriteType === 'goblin') size = 28;
    if (this.spriteType === 'slime') size = 32;
    
    // Shadow
    this.shadowSprite = this.scene.add.ellipse(0, 14, size * 0.7, 10, 0x000000, 0.3);
    this.add(this.shadowSprite);
    
    // Main sprite - choose based on spriteType
    if (this.spriteType === 'slime' && this.scene.textures.exists('slime_frame_0')) {
      // Use slime sprite
      this.sprite = this.scene.add.sprite(0, -8, 'slime_frame_0');
      this.sprite.setDisplaySize(size * 1.5, size * 1.5);
      if (this.scene.anims.exists('slime_idle')) {
        (this.sprite as Phaser.GameObjects.Sprite).play('slime_idle');
      }
    } else if (this.spriteType === 'goblin' && this.scene.textures.exists('goblin_frame_0')) {
      // Use goblin sprite
      this.sprite = this.scene.add.sprite(0, -4, 'goblin_frame_0');
      this.sprite.setDisplaySize(size * 1.2, size * 1.2);
      if (this.scene.anims.exists('goblin_idle')) {
        (this.sprite as Phaser.GameObjects.Sprite).play('goblin_idle');
      }
    } else if (this.scene.textures.exists('monster_frame_0')) {
      // Use orc/monster sprite
      this.sprite = this.scene.add.sprite(0, -4, 'monster_frame_0');
      this.sprite.setDisplaySize(size * 1.4, size * 1.4);
      if (this.scene.anims.exists('monster_idle')) {
        (this.sprite as Phaser.GameObjects.Sprite).play('monster_idle');
      }
    } else if (this.scene.textures.exists(this.enemyData.sprite)) {
      this.sprite = this.scene.add.sprite(0, 0, this.enemyData.sprite);
    } else {
      // Create placeholder graphic
      const graphics = this.scene.add.graphics();
      const color = this.getEnemyColor();
      
      graphics.fillStyle(color.dark);
      graphics.fillRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4);
      graphics.fillStyle(color.light);
      graphics.fillRect(-size/2 + 6, -size/2 + 6, size - 12, size - 12);
      
      // Eyes
      graphics.fillStyle(0xff0000);
      graphics.fillCircle(-6, -4, 3);
      graphics.fillCircle(6, -4, 3);
      
      this.sprite = graphics;
    }
    this.add(this.sprite);
    
    // Hit flash overlay
    this.hitFlash = this.scene.add.rectangle(0, 0, size, size, 0xffffff, 0);
    this.add(this.hitFlash);
    
    // Health bar
    this.healthBar = this.scene.add.graphics();
    this.healthBar.setPosition(0, -size/2 - 12);
    this.add(this.healthBar);
    this.updateHealthBar();
    
    // State indicator (debug, hidden by default)
    this.stateIndicator = this.scene.add.text(0, -size/2 - 24, '', {
      fontSize: '10px',
      color: '#ffffff',
    });
    this.stateIndicator.setOrigin(0.5);
    this.stateIndicator.setVisible(false);
    this.add(this.stateIndicator);
  }

  /**
   * Get enemy color based on type
   */
  private getEnemyColor(): { dark: number; light: number } {
    switch (this.enemyData.type) {
      case 'boss':
        return { dark: 0x6a2a8a, light: 0x8a4aaa };
      case 'elite':
        return { dark: 0x8a6a2a, light: 0xaa8a4a };
      default:
        return { dark: 0x8a2a2a, light: 0xaa4a4a };
    }
  }

  /**
   * Setup physics body
   */
  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const size = this.enemyData.type === 'boss' ? 36 : 20;
    
    body.setSize(size, size);
    body.setOffset(-size/2, -size/2);
    body.setCollideWorldBounds(true);
    body.setDrag(600, 600);
    body.setMaxVelocity(this.stats.speed, this.stats.speed);
    body.setImmovable(false);
  }

  /**
   * Generate patrol points around spawn position
   */
  private generatePatrolPoints(): void {
    const spawnX = this.x;
    const spawnY = this.y;
    const range = 80;
    
    // Create 3-4 patrol points in a rough square
    const numPoints = 3 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const distance = range * (0.5 + Math.random() * 0.5);
      
      this.patrolPoints.push(new Phaser.Math.Vector2(
        spawnX + Math.cos(angle) * distance,
        spawnY + Math.sin(angle) * distance
      ));
    }
  }

  /**
   * Main update loop
   */
  update(delta: number, player: Player): void {
    if (this.isDead) return;
    if (!this.body || !this.scene || !this.active) return;
    
    // Update cooldowns
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
    
    this.stateTimer += delta;
    this.target = player;
    
    // Run AI state machine
    this.updateAI(delta);
    
    // Update animation
    this.updateAnimation();
  }

  /**
   * AI State Machine
   */
  private updateAI(delta: number): void {
    if (!this.target) return;
    
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );
    
    // State transitions
    switch (this.currentState) {
      case 'idle':
        this.updateIdle(distanceToPlayer);
        break;
      case 'patrol':
        this.updatePatrol(delta, distanceToPlayer);
        break;
      case 'chase':
        this.updateChase(distanceToPlayer);
        break;
      case 'attack':
        this.updateAttack(distanceToPlayer);
        break;
      case 'retreat':
        this.updateRetreat(distanceToPlayer);
        break;
    }
  }

  /**
   * Get animation key prefix based on sprite type
   */
  private getAnimPrefix(): string {
    if (this.spriteType === 'slime') return 'slime';
    if (this.spriteType === 'goblin') return 'goblin';
    return 'monster';
  }

  /**
   * Idle state - wait and look around
   */
  private updateIdle(distanceToPlayer: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
    
    // Play idle animation based on sprite type
    const prefix = this.getAnimPrefix();
    if (this.sprite instanceof Phaser.GameObjects.Sprite && 
        this.scene.anims.exists(`${prefix}_idle`)) {
      const currentAnim = this.sprite.anims.currentAnim?.key;
      if (currentAnim !== `${prefix}_idle` && currentAnim !== `${prefix}_attack`) {
        this.sprite.play(`${prefix}_idle`);
      }
    }
    
    // Check for player in detection range
    if (distanceToPlayer <= this.stats.detectionRange) {
      this.setAIState('chase');
      return;
    }
    
    // After idle time, start patrolling
    if (this.stateTimer > 2000 && this.enemyData.behaviors.includes('patrol')) {
      this.setAIState('patrol');
    }
  }

  /**
   * Patrol state - move between patrol points
   */
  private updatePatrol(delta: number, distanceToPlayer: number): void {
    // Check for player
    if (distanceToPlayer <= this.stats.detectionRange) {
      this.setAIState('chase');
      return;
    }
    
    if (this.patrolPoints.length === 0) {
      this.setAIState('idle');
      return;
    }
    
    // Move to current patrol point
    if (this.patrolWaitTime > 0) {
      this.patrolWaitTime -= delta;
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) body.setVelocity(0, 0);
      return;
    }
    
    const targetPoint = this.patrolPoints[this.currentPatrolIndex];
    const distToPoint = Phaser.Math.Distance.Between(this.x, this.y, targetPoint.x, targetPoint.y);
    
    if (distToPoint < 10) {
      // Reached point, wait then move to next
      this.patrolWaitTime = 1000 + Math.random() * 1000;
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    } else {
      // Move toward point
      this.moveToward(targetPoint.x, targetPoint.y, this.stats.speed * 0.5);
    }
  }

  /**
   * Chase state - pursue player
   */
  private updateChase(distanceToPlayer: number): void {
    if (!this.target) return;
    
    // Lost player, go back to patrol
    if (distanceToPlayer > this.stats.detectionRange * 1.5) {
      this.setAIState('patrol');
      return;
    }
    
    // In attack range
    if (distanceToPlayer <= this.stats.attackRange) {
      this.setAIState('attack');
      return;
    }
    
    // Chase player
    this.moveToward(this.target.x, this.target.y, this.stats.speed);
  }

  /**
   * Attack state - attack the player
   */
  private updateAttack(distanceToPlayer: number): void {
    if (!this.target) return;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    // Player moved out of range
    if (distanceToPlayer > this.stats.attackRange * 1.2) {
      this.setAIState('chase');
      return;
    }
    
    // Perform attack if cooldown ready
    if (this.attackCooldown <= 0 && !this.isAttacking) {
      this.performAttack();
    }
  }

  /**
   * Retreat state - back away from player
   */
  private updateRetreat(distanceToPlayer: number): void {
    if (!this.target) return;
    
    // Retreated far enough
    if (distanceToPlayer > this.stats.detectionRange * 0.8) {
      this.setAIState('chase');
      return;
    }
    
    // Move away from player
    const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    body.setVelocity(
      Math.cos(angle) * this.stats.speed * 0.7,
      Math.sin(angle) * this.stats.speed * 0.7
    );
  }

  /**
   * Move toward a target position
   */
  private moveToward(targetX: number, targetY: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    
    body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Face movement direction and play walk animation
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setFlipX(targetX < this.x);
      
      // Play walk animation based on sprite type
      const prefix = this.getAnimPrefix();
      if (this.scene.anims.exists(`${prefix}_walk`)) {
        const currentAnim = this.sprite.anims.currentAnim?.key;
        if (currentAnim !== `${prefix}_walk` && currentAnim !== `${prefix}_attack`) {
          this.sprite.play(`${prefix}_walk`);
        }
      }
    }
  }

  /**
   * Perform an attack
   */
  private performAttack(): void {
    if (!this.target) return;
    
    this.isAttacking = true;
    this.attackCooldown = this.stats.attackCooldown;
    
    // Play attack animation based on sprite type
    const prefix = this.getAnimPrefix();
    if (this.sprite instanceof Phaser.GameObjects.Sprite && 
        this.scene.anims.exists(`${prefix}_attack`)) {
      this.sprite.play(`${prefix}_attack`);
      this.sprite.once('animationcomplete', () => {
        if (this.scene.anims.exists(`${prefix}_idle`)) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`${prefix}_idle`);
        }
      });
    }
    
    // Attack animation - lunge forward
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const lungeX = Math.cos(angle) * 10;
    const lungeY = Math.sin(angle) * 10;
    
    // Visual lunge
    this.scene.tweens.add({
      targets: this.sprite,
      x: lungeX,
      y: lungeY - 4, // Maintain vertical offset
      duration: 100,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        // Check if attack hits
        if (this.target) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
          if (dist <= this.stats.attackRange) {
            this.target.takeDamage(this.stats.attack, { x: this.x, y: this.y });
            this.scene.game.events.emit(GAME_EVENTS.COMBAT_HIT, this, this.target);
          }
        }
      },
      onComplete: () => {
        this.isAttacking = false;
        // Reset sprite position
        if (this.sprite instanceof Phaser.GameObjects.Sprite) {
          this.sprite.x = 0;
          this.sprite.y = -4;
        }
        
        // Boss might retreat after attack
        if (this.enemyData.type === 'boss' && this.enemyData.behaviors.includes('retreat')) {
          if (Math.random() < 0.3) {
            this.setAIState('retreat');
          }
        }
      },
    });
    
    // Attack indicator
    this.showAttackIndicator();
  }

  /**
   * Show attack warning indicator
   */
  private showAttackIndicator(): void {
    const indicator = this.scene.add.graphics();
    indicator.setPosition(this.x, this.y);
    
    indicator.lineStyle(2, 0xff4444, 0.8);
    indicator.strokeCircle(0, 0, this.stats.attackRange);
    
    this.scene.tweens.add({
      targets: indicator,
      alpha: 0,
      scale: 1.2,
      duration: 200,
      onComplete: () => indicator.destroy(),
    });
  }

  /**
   * Set AI state
   */
  private setAIState(newState: AIState): void {
    if (!this.enemyData.behaviors.includes(newState) && newState !== 'idle') {
      // Fall back to available behavior
      if (this.enemyData.behaviors.includes('chase')) {
        newState = 'chase';
      } else {
        newState = 'idle';
      }
    }
    
    this.currentState = newState;
    this.stateTimer = 0;
    
    // Debug indicator
    this.stateIndicator.setText(newState.toUpperCase());
  }

  /**
   * Take damage
   */
  takeDamage(amount: number, knockbackSource?: { x: number; y: number }): number {
    if (this.isDead) return 0;
    
    // Calculate damage
    const defense = this.stats.defense;
    const actualDamage = Math.max(1, amount - defense);
    
    this.stats.health -= actualDamage;
    
    // Visual feedback
    this.flashWhite();
    this.updateHealthBar();
    this.showDamageNumber(actualDamage);
    
    // Knockback
    if (knockbackSource) {
      this.applyKnockback(knockbackSource);
    }
    
    // Aggro on hit
    if (this.currentState === 'idle' || this.currentState === 'patrol') {
      this.setAIState('chase');
    }
    
    // Check death
    if (this.stats.health <= 0) {
      this.die();
    }
    
    return actualDamage;
  }

  /**
   * Apply knockback
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
   * Flash white when hit
   */
  private flashWhite(): void {
    this.hitFlash.setFillStyle(0xffffff, 0.7);
    
    this.scene.tweens.add({
      targets: this.hitFlash,
      alpha: { from: 0.7, to: 0 },
      duration: 100,
    });
  }

  /**
   * Show floating damage number
   */
  private showDamageNumber(damage: number): void {
    const text = this.scene.add.text(this.x, this.y - 20, `-${damage}`, {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    this.scene.tweens.add({
      targets: text,
      y: text.y - 25,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    this.healthBar.clear();
    
    const width = this.enemyData.type === 'boss' ? 50 : 28;
    const height = 4;
    const x = -width / 2;
    const y = 0;
    
    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(x - 1, y - 1, width + 2, height + 2);
    
    // Health
    const healthPercent = this.stats.health / this.stats.maxHealth;
    const healthColor = this.enemyData.type === 'boss' ? 0x9944aa : 0xaa4444;
    
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(x, y, width * healthPercent, height);
    
    // Border
    this.healthBar.lineStyle(1, 0x333333);
    this.healthBar.strokeRect(x - 1, y - 1, width + 2, height + 2);
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
   * Handle enemy death
   */
  private die(): void {
    this.isDead = true;
    
    // Play death sound
    this.playSound('enemyDeath');
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setEnable(false);
    
    // Emit death event with loot table
    this.scene.game.events.emit(GAME_EVENTS.ENEMY_DIED, this, this.enemyData.lootTable);
    
    // Play death animation if available (only orcs have death animation)
    const prefix = this.getAnimPrefix();
    if (this.sprite instanceof Phaser.GameObjects.Sprite && 
        this.scene.anims.exists(`${prefix}_death`)) {
      this.sprite.play(`${prefix}_death`);
      this.sprite.once('animationcomplete', () => {
        // Fade out after death animation
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.destroy();
          },
        });
      });
    } else {
      // Fallback death animation
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0.5,
        angle: 180,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          this.destroy();
        },
      });
    }
    
    // Particles
    this.createDeathParticles();
  }

  /**
   * Create death particle effect
   */
  private createDeathParticles(): void {
    // Different colors based on enemy type and sprite
    let colors: number[];
    if (this.enemyData.type === 'boss') {
      colors = [0x9944aa, 0x6622aa];
    } else if (this.spriteType === 'slime') {
      colors = [0x44ff88, 0x22aa44]; // Bright green for slimes
    } else if (this.spriteType === 'goblin') {
      colors = [0x44aa44, 0x226622]; // Dark green for goblins
    } else {
      colors = [0xaa4444, 0x662222]; // Red for orcs
    }
    
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y);
      particle.fillStyle(colors[i % 2]);
      particle.fillCircle(0, 0, this.spriteType === 'slime' ? 6 : 4);
      
      const angle = (i / 8) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Update animation
   */
  private updateAnimation(): void {
    // Simple bob animation
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMoving = body.velocity.length() > 10;
    
    if (isMoving && this.sprite instanceof Phaser.GameObjects.Sprite) {
      const bobAmount = Math.sin(this.scene.time.now * 0.015) * 2;
      this.sprite.y = bobAmount;
    }
    
    // Shadow scale based on movement
    const scale = isMoving ? 0.9 : 1;
    this.shadowSprite.setScale(scale, scale * 0.4);
  }

  /**
   * Get loot table
   */
  getLootTable(): LootEntry[] {
    return this.enemyData.lootTable;
  }

  /**
   * Check if enemy is dead
   */
  getIsDead(): boolean {
    return this.isDead;
  }

  /**
   * Get current health
   */
  getCurrentHealth(): number {
    return this.stats.health;
  }

  /**
   * Set current health
   */
  setCurrentHealth(health: number): void {
    this.stats.health = Math.max(0, Math.min(this.stats.maxHealth, health));
    this.updateHealthBar();
  }

  /**
   * Get current AI state
   */
  getState(): AIState {
    return this.currentState;
  }

  /**
   * Toggle debug info visibility
   */
  setDebugVisible(visible: boolean): void {
    this.stateIndicator.setVisible(visible);
  }
}
