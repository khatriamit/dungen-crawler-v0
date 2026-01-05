import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { DamageResult, GAME_EVENTS } from '../types';

/**
 * CombatSystem
 * 
 * Handles all combat interactions:
 * - Damage calculations
 * - Hit detection
 * - Critical hits
 * - Combat events
 */

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  
  private readonly CRIT_CHANCE = 0.1;
  private readonly CRIT_MULTIPLIER = 2;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Register the player
   */
  setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Register enemies
   */
  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  /**
   * Add an enemy to the system
   */
  addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  /**
   * Remove an enemy from the system
   */
  removeEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
  }

  /**
   * Process player attack
   */
  processPlayerAttack(): void {
    if (!this.player) return;
    
    const attackHitbox = this.player.attack();
    if (!attackHitbox) return;
    
    // Check each enemy for hit
    for (const enemy of this.enemies) {
      if (enemy.getIsDead()) continue;
      
      const enemyBounds = enemy.getBounds();
      const enemyCenter = { x: enemy.x, y: enemy.y };
      
      // Check if enemy is in attack range
      if (Phaser.Geom.Circle.ContainsPoint(attackHitbox, enemyCenter)) {
        const damage = this.calculateDamage(
          this.player.getAttackDamage(),
          0 // Enemy defense handled in takeDamage
        );
        
        enemy.takeDamage(damage.finalDamage, { x: this.player.x, y: this.player.y });
        
        // Show damage feedback
        this.showDamageEffect(enemy.x, enemy.y, damage);
        
        // Emit hit event
        this.scene.game.events.emit(GAME_EVENTS.COMBAT_HIT, this.player, enemy, damage);
      }
    }
  }

  /**
   * Calculate damage with crit chance
   */
  calculateDamage(attackPower: number, defense: number): DamageResult {
    const isCritical = Math.random() < this.CRIT_CHANCE;
    let rawDamage = attackPower;
    
    if (isCritical) {
      rawDamage = Math.floor(rawDamage * this.CRIT_MULTIPLIER);
    }
    
    const finalDamage = Math.max(1, rawDamage - defense);
    
    return {
      rawDamage,
      finalDamage,
      isCritical,
      isBlocked: finalDamage <= 0,
    };
  }

  /**
   * Show damage visual effect
   */
  private showDamageEffect(x: number, y: number, damage: DamageResult): void {
    // Hit particles
    this.createHitParticles(x, y, damage.isCritical);
    
    // Screen shake on crit
    if (damage.isCritical) {
      this.scene.cameras.main.shake(100, 0.008);
    }
  }

  /**
   * Create hit particle effect
   */
  private createHitParticles(x: number, y: number, isCrit: boolean): void {
    const particleCount = isCrit ? 10 : 5;
    const color = isCrit ? 0xffaa00 : 0xffffff;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(x, y);
      particle.fillStyle(color);
      particle.fillCircle(0, 0, isCrit ? 3 : 2);
      particle.setDepth(50);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 20;
      const duration = 200 + Math.random() * 100;
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
    
    // Impact flash
    const flash = this.scene.add.graphics();
    flash.setPosition(x, y);
    flash.fillStyle(color, 0.5);
    flash.fillCircle(0, 0, isCrit ? 25 : 15);
    flash.setDepth(49);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Check for player-enemy collision damage
   */
  checkCollisionDamage(): void {
    if (!this.player) return;
    
    // This is handled by physics overlap in DungeonScene
  }

  /**
   * Get all living enemies
   */
  getLivingEnemies(): Enemy[] {
    return this.enemies.filter(e => !e.getIsDead());
  }

  /**
   * Check if all enemies are defeated
   */
  areAllEnemiesDefeated(): boolean {
    return this.getLivingEnemies().length === 0;
  }

  /**
   * Clear all enemies
   */
  clear(): void {
    this.enemies = [];
    this.player = null;
  }
}
