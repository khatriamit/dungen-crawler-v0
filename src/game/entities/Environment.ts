import Phaser from 'phaser';

/**
 * Environmental Entities
 * Decorative and interactive elements in dungeons
 */

// ============================================================
// FIRE TORCH
// ============================================================

export class FireTorch extends Phaser.GameObjects.Container {
  private flames: Phaser.GameObjects.Graphics[] = [];
  private glowCircle: Phaser.GameObjects.Graphics;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Torch base
    const base = scene.add.graphics();
    base.fillStyle(0x4a3a2a);
    base.fillRect(-4, 0, 8, 16);
    base.fillStyle(0x3a2a1a);
    base.fillRect(-3, 2, 6, 12);
    this.add(base);
    
    // Glow effect
    this.glowCircle = scene.add.graphics();
    this.updateGlow();
    this.add(this.glowCircle);
    
    // Programmatic flames
    for (let i = 0; i < 3; i++) {
      const flame = scene.add.graphics();
      flame.setPosition(0, -8 - i * 4);
      this.flames.push(flame);
      this.add(flame);
    }
    
    scene.add.existing(this);
    this.setDepth(3);
  }
  
  update(): void {
    const time = this.scene.time.now;
    
    // Animate programmatic flames
    this.flames.forEach((flame, i) => {
      flame.clear();
      const flicker = Math.sin(time * 0.01 + i * 2) * 2;
      const size = 8 - i * 2;
      
      flame.fillStyle(i === 0 ? 0xff4400 : i === 1 ? 0xff8800 : 0xffcc00, 0.8);
      flame.beginPath();
      flame.moveTo(-size + flicker, 0);
      flame.lineTo(0, -size * 2 - flicker);
      flame.lineTo(size - flicker, 0);
      flame.closePath();
      flame.fill();
    });
    
    this.updateGlow();
  }
  
  private updateGlow(): void {
    const time = this.scene.time.now;
    const pulse = Math.sin(time * 0.005) * 0.1 + 0.9;
    
    this.glowCircle.clear();
    this.glowCircle.fillStyle(0xff6600, 0.15 * pulse);
    this.glowCircle.fillCircle(0, -10, 40);
    this.glowCircle.fillStyle(0xff8800, 0.1 * pulse);
    this.glowCircle.fillCircle(0, -10, 25);
  }
}

// ============================================================
// GRASS PATCH
// ============================================================

export class GrassPatch extends Phaser.GameObjects.Container {
  private blades: { graphics: Phaser.GameObjects.Graphics; baseAngle: number }[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number, size: number = 1) {
    super(scene, x, y);
    
    const bladeCount = 5 + Math.floor(Math.random() * 5) * size;
    
    for (let i = 0; i < bladeCount; i++) {
      const blade = scene.add.graphics();
      const offsetX = (Math.random() - 0.5) * 20 * size;
      const offsetY = Math.random() * 8 * size;
      blade.setPosition(offsetX, offsetY);
      
      const height = 8 + Math.random() * 8;
      const color = Math.random() > 0.3 ? 0x2a5a2a : 0x3a6a3a;
      const baseAngle = (Math.random() - 0.5) * 0.3;
      
      blade.lineStyle(2, color);
      blade.beginPath();
      blade.moveTo(0, 0);
      blade.lineTo(Math.sin(baseAngle) * 4, -height);
      blade.stroke();
      
      this.blades.push({ graphics: blade, baseAngle });
      this.add(blade);
    }
    
    scene.add.existing(this);
    this.setDepth(1);
  }
  
  update(): void {
    const time = this.scene.time.now;
    
    this.blades.forEach(({ graphics, baseAngle }, i) => {
      const sway = Math.sin(time * 0.002 + i * 0.5) * 0.15;
      graphics.setRotation(baseAngle + sway);
    });
  }
}

// ============================================================
// BAT (Ambient flying creature)
// ============================================================

export class Bat extends Phaser.GameObjects.Container {
  private leftWing: Phaser.GameObjects.Graphics;
  private rightWing: Phaser.GameObjects.Graphics;
  
  private targetX: number;
  private targetY: number;
  private speed: number = 1 + Math.random();
  private wingPhase: number = Math.random() * Math.PI * 2;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number };
  
  constructor(scene: Phaser.Scene, x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    super(scene, x, y);
    
    this.bounds = bounds;
    this.targetX = x;
    this.targetY = y;
    
    // Body
    const body = scene.add.graphics();
    body.fillStyle(0x2a2a3a);
    body.fillEllipse(0, 0, 8, 6);
    body.fillStyle(0xff4444);
    body.fillCircle(-2, -1, 1);
    body.fillCircle(2, -1, 1);
    this.add(body);
    
    // Wings
    this.leftWing = scene.add.graphics();
    this.rightWing = scene.add.graphics();
    this.add(this.leftWing);
    this.add(this.rightWing);
    
    this.pickNewTarget();
    
    scene.add.existing(this);
    this.setDepth(15);
  }
  
  private pickNewTarget(): void {
    this.targetX = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
    this.targetY = this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY);
  }
  
  update(): void {
    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 20) {
      this.pickNewTarget();
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
    
    // Animate wings
    this.wingPhase += 0.3;
    
    this.leftWing.clear();
    this.leftWing.fillStyle(0x3a3a4a);
    this.leftWing.beginPath();
    this.leftWing.moveTo(-4, 0);
    this.leftWing.lineTo(-12, -4 + Math.sin(this.wingPhase) * 6);
    this.leftWing.lineTo(-8, 2);
    this.leftWing.closePath();
    this.leftWing.fill();
    
    this.rightWing.clear();
    this.rightWing.fillStyle(0x3a3a4a);
    this.rightWing.beginPath();
    this.rightWing.moveTo(4, 0);
    this.rightWing.lineTo(12, -4 + Math.sin(this.wingPhase) * 6);
    this.rightWing.lineTo(8, 2);
    this.rightWing.closePath();
    this.rightWing.fill();
    
    // Face movement direction
    this.setScale(dx < 0 ? -1 : 1, 1);
  }
}

// ============================================================
// BONES / SKULL DECORATION
// ============================================================

export class BonesDecor extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, type: 'skull' | 'bones' | 'pile' = 'bones') {
    super(scene, x, y);
    
    const graphics = scene.add.graphics();
    
    if (type === 'skull') {
      // Skull
      graphics.fillStyle(0xd4c4a4);
      graphics.fillCircle(0, 0, 8);
      graphics.fillRect(-6, 4, 12, 6);
      graphics.fillStyle(0x1a1a2a);
      graphics.fillCircle(-3, -1, 3);
      graphics.fillCircle(3, -1, 3);
      graphics.fillTriangle(0, 2, -2, 5, 2, 5);
      graphics.fillStyle(0xc4b494);
      for (let i = -4; i <= 4; i += 2) {
        graphics.fillRect(i, 7, 1, 3);
      }
    } else if (type === 'bones') {
      // Crossed bones
      graphics.fillStyle(0xd4c4a4);
      graphics.save();
      graphics.setPosition(0, 0);
      
      // First bone
      graphics.fillRoundedRect(-12, -2, 24, 4, 2);
      graphics.fillCircle(-10, 0, 3);
      graphics.fillCircle(10, 0, 3);
      
      graphics.restore();
    } else {
      // Bone pile
      graphics.fillStyle(0xc4b494);
      for (let i = 0; i < 5; i++) {
        const len = 8 + Math.random() * 8;
        const px = (Math.random() - 0.5) * 15;
        const py = (Math.random() - 0.5) * 10;
        graphics.fillRoundedRect(px - len/2, py - 2, len, 3, 1);
      }
      graphics.fillStyle(0xd4c4a4);
      graphics.fillCircle(0, -5, 5);
      graphics.fillStyle(0x1a1a2a);
      graphics.fillCircle(-2, -6, 1.5);
      graphics.fillCircle(2, -6, 1.5);
    }
    
    this.add(graphics);
    scene.add.existing(this);
    this.setDepth(1);
  }
}

// ============================================================
// TREASURE CHEST
// ============================================================

export class TreasureChest extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  private chestGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isOpen: boolean = false;
  private lootTable: { itemId: string; chance: number }[];
  private rarity: string;
  
  constructor(scene: Phaser.Scene, x: number, y: number, rarity: 'common' | 'rare' | 'epic' = 'common') {
    super(scene, x, y);
    
    this.rarity = rarity;
    this.lootTable = this.getLootTable(rarity);
    
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);
    
    this.chestGraphics = scene.add.graphics();
    this.drawChest(rarity);
    this.add(this.chestGraphics);
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 20);
    body.setOffset(-14, -10);
    
    this.setDepth(4);
  }
  
  private getLootTable(rarity: string): { itemId: string; chance: number }[] {
    switch (rarity) {
      case 'epic':
        return [
          { itemId: 'gem_large', chance: 0.8 },
          { itemId: 'potion_health_medium', chance: 0.6 },
          { itemId: 'potion_strength', chance: 0.4 },
          { itemId: 'sword_shadow', chance: 0.1 },
        ];
      case 'rare':
        return [
          { itemId: 'gem_medium', chance: 0.9 },
          { itemId: 'potion_health_medium', chance: 0.5 },
          { itemId: 'sword_iron', chance: 0.15 },
        ];
      default:
        return [
          { itemId: 'gem_small', chance: 1.0 },
          { itemId: 'potion_health_small', chance: 0.4 },
        ];
    }
  }
  
  private drawChest(rarity: string): void {
    const colors = {
      common: { main: 0x6a5a4a, trim: 0x8b7355, lock: 0xaaaaaa },
      rare: { main: 0x4a5a8a, trim: 0x6a7aaa, lock: 0xffd700 },
      epic: { main: 0x6a4a8a, trim: 0x8a6aaa, lock: 0xff88ff },
    };
    const c = colors[rarity as keyof typeof colors] || colors.common;
    
    this.chestGraphics.clear();
    
    this.chestGraphics.fillStyle(c.main);
    this.chestGraphics.fillRoundedRect(-14, -4, 28, 16, 3);
    this.chestGraphics.fillRoundedRect(-14, -12, 28, 10, { tl: 6, tr: 6, bl: 0, br: 0 });
    
    this.chestGraphics.fillStyle(c.trim);
    this.chestGraphics.fillRect(-14, -4, 28, 3);
    this.chestGraphics.fillRect(-2, -12, 4, 20);
    
    this.chestGraphics.fillStyle(c.lock);
    this.chestGraphics.fillCircle(0, 0, 4);
    this.chestGraphics.fillStyle(0x000000, 0.3);
    this.chestGraphics.fillCircle(0, 0, 2);
    
    this.chestGraphics.fillStyle(0xffffff, 0.2);
    this.chestGraphics.fillRoundedRect(-12, -10, 10, 4, 2);
  }
  
  update(): void {
    if (this.isOpen) return;
    
    const time = this.scene.time.now;
    const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
    
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(0xffd700, 0.1 * pulse);
    this.glowGraphics.fillCircle(0, 0, 30);
  }
  
  open(): { itemId: string; quantity: number }[] {
    if (this.isOpen) return [];
    this.isOpen = true;
    
    this.scene.tweens.add({
      targets: this.chestGraphics,
      scaleY: 0.7,
      duration: 200,
      yoyo: true,
    });
    
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y);
      particle.fillStyle(0xffd700);
      particle.fillCircle(0, 0, 3);
      
      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 30,
        y: this.y + Math.sin(angle) * 30 - 20,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
    
    const loot: { itemId: string; quantity: number }[] = [];
    for (const entry of this.lootTable) {
      if (Math.random() < entry.chance) {
        loot.push({ itemId: entry.itemId, quantity: 1 + Math.floor(Math.random() * 3) });
      }
    }
    
    this.chestGraphics.clear();
    this.chestGraphics.fillStyle(0x3a3a4a);
    this.chestGraphics.fillRoundedRect(-14, -8, 28, 18, 3);
    this.glowGraphics.clear();
    
    return loot;
  }
  
  isOpened(): boolean {
    return this.isOpen;
  }
}

// ============================================================
// DEN PORTAL
// ============================================================

export class DenPortal extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  private portalGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private particles: Phaser.GameObjects.Graphics[] = [];
  
  public denType: 'monster' | 'treasure' | 'boss';
  public isCleared: boolean = false;
  public enemyCount: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, denType: 'monster' | 'treasure' | 'boss' = 'monster') {
    super(scene, x, y);
    
    this.denType = denType;
    this.enemyCount = denType === 'boss' ? 1 : denType === 'treasure' ? 2 : 3 + Math.floor(Math.random() * 3);
    
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);
    
    this.portalGraphics = scene.add.graphics();
    this.drawPortal();
    this.add(this.portalGraphics);
    
    for (let i = 0; i < 6; i++) {
      const p = scene.add.graphics();
      this.particles.push(p);
      this.add(p);
    }
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(40, 40);
    body.setOffset(-20, -20);
    
    this.setDepth(4);
  }
  
  private getColors(): { main: number; glow: number; particle: number } {
    switch (this.denType) {
      case 'boss': return { main: 0x8a2a4a, glow: 0xff4488, particle: 0xff6699 };
      case 'treasure': return { main: 0x6a6a2a, glow: 0xffdd44, particle: 0xffee88 };
      default: return { main: 0x2a4a6a, glow: 0x4488ff, particle: 0x66aaff };
    }
  }
  
  private drawPortal(): void {
    const colors = this.getColors();
    
    this.portalGraphics.clear();
    
    // Stone archway
    this.portalGraphics.fillStyle(0x3a3a4a);
    this.portalGraphics.fillRect(-25, -30, 8, 50);
    this.portalGraphics.fillRect(17, -30, 8, 50);
    this.portalGraphics.fillRoundedRect(-25, -35, 50, 12, 6);
    
    // Stone detail
    this.portalGraphics.fillStyle(0x4a4a5a);
    this.portalGraphics.fillRect(-23, -25, 4, 8);
    this.portalGraphics.fillRect(-23, -10, 4, 8);
    this.portalGraphics.fillRect(19, -25, 4, 8);
    this.portalGraphics.fillRect(19, -10, 4, 8);
    
    // Portal void
    this.portalGraphics.fillStyle(0x0a0a1a);
    this.portalGraphics.fillEllipse(0, -5, 30, 40);
    
    // Inner swirl
    this.portalGraphics.fillStyle(colors.main, 0.6);
    this.portalGraphics.fillEllipse(0, -5, 24, 32);
    
    // Runes
    this.portalGraphics.fillStyle(colors.glow, 0.8);
    this.portalGraphics.fillCircle(-21, -30, 2);
    this.portalGraphics.fillCircle(21, -30, 2);
    this.portalGraphics.fillCircle(0, -32, 3);
    
    // Type indicator
    if (this.denType === 'boss') {
      this.portalGraphics.fillStyle(0xffffff);
      this.portalGraphics.fillCircle(0, -32, 4);
      this.portalGraphics.fillStyle(colors.main);
      this.portalGraphics.fillCircle(-1, -33, 1);
      this.portalGraphics.fillCircle(1, -33, 1);
    } else if (this.denType === 'treasure') {
      this.portalGraphics.fillStyle(0xffd700);
      this.portalGraphics.beginPath();
      this.portalGraphics.moveTo(0, -36);
      this.portalGraphics.lineTo(4, -32);
      this.portalGraphics.lineTo(0, -28);
      this.portalGraphics.lineTo(-4, -32);
      this.portalGraphics.closePath();
      this.portalGraphics.fill();
    }
  }
  
  update(): void {
    if (this.isCleared) return;
    
    const time = this.scene.time.now;
    const colors = this.getColors();
    
    const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(colors.glow, 0.15 * pulse);
    this.glowGraphics.fillCircle(0, -5, 45);
    this.glowGraphics.fillStyle(colors.glow, 0.1 * pulse);
    this.glowGraphics.fillCircle(0, -5, 60);
    
    // Animate particles
    this.particles.forEach((p, i) => {
      const angle = (time * 0.002 + i * (Math.PI * 2 / 6));
      const radius = 15 + Math.sin(time * 0.005 + i) * 5;
      const px = Math.cos(angle) * radius;
      const py = -5 + Math.sin(angle) * radius * 0.5;
      
      p.clear();
      p.fillStyle(colors.particle, 0.6 + Math.sin(time * 0.01 + i) * 0.3);
      p.fillCircle(px, py, 2);
    });
  }
  
  markCleared(): void {
    this.isCleared = true;
    this.glowGraphics.clear();
    this.particles.forEach(p => p.clear());
    
    // Draw cleared state
    this.portalGraphics.clear();
    this.portalGraphics.fillStyle(0x2a2a3a);
    this.portalGraphics.fillRect(-25, -30, 8, 50);
    this.portalGraphics.fillRect(17, -30, 8, 50);
    this.portalGraphics.fillRoundedRect(-25, -35, 50, 12, 6);
    this.portalGraphics.fillStyle(0x1a1a2a);
    this.portalGraphics.fillEllipse(0, -5, 30, 40);
    
    // Checkmark
    this.portalGraphics.lineStyle(3, 0x44aa44);
    this.portalGraphics.beginPath();
    this.portalGraphics.moveTo(-8, -5);
    this.portalGraphics.lineTo(-2, 2);
    this.portalGraphics.lineTo(10, -12);
    this.portalGraphics.stroke();
  }
}

// ============================================================
// WATER PUDDLE
// ============================================================

export class WaterPuddle extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  
  constructor(scene: Phaser.Scene, x: number, y: number, size: number = 1) {
    super(scene, x, y);
    
    this.graphics = scene.add.graphics();
    
    const w = 20 * size + Math.random() * 10;
    const h = 12 * size + Math.random() * 6;
    
    this.graphics.fillStyle(0x2a4a6a, 0.6);
    this.graphics.fillEllipse(0, 0, w, h);
    this.graphics.fillStyle(0x4a6a8a, 0.4);
    this.graphics.fillEllipse(-w * 0.2, -h * 0.2, w * 0.4, h * 0.3);
    
    this.add(this.graphics);
    scene.add.existing(this);
    this.setDepth(0);
  }
  
  update(): void {
    const time = this.scene.time.now;
    const ripple = Math.sin(time * 0.002) * 0.5;
    this.graphics.y = ripple;
  }
}
