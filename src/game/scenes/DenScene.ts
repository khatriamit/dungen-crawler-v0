import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, GAME_EVENTS } from '../types';
import { Player, Enemy, FireTorch, GrassPatch, BonesDecor } from '../entities';
import { MovementSystem, CombatSystem, LootSystem, InventorySystem } from '../systems';
import { getEnemy } from '../data/enemies';
import { getItem } from '../data/items';

/**
 * DenScene - Separate world for den/portal encounters
 * 
 * Features:
 * - Procedurally generated small dungeon arena
 * - Player must defeat all enemies to exit
 * - Rewards spawned upon completion
 * - Returns to DungeonScene when cleared
 */

interface DenData {
  denType: 'monster' | 'treasure' | 'boss';
  enemyCount: number;
  portalX: number;
  portalY: number;
  returnData: {
    playerX: number;
    playerY: number;
    playerHealth: number;
    playerGems: number;
  };
}

interface DenTile {
  x: number;
  y: number;
  type: 'floor' | 'wall';
}

export class DenScene extends Phaser.Scene {
  // Den data from dungeon
  private denData: DenData | null = null;
  
  // Map
  private mapWidth = 30;
  private mapHeight = 25;
  private tiles: DenTile[][] = [];
  
  // Entities
  private player!: Player;
  private enemies: Enemy[] = [];
  private torches: FireTorch[] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];
  
  // Systems
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private lootSystem!: LootSystem;
  private inventorySystem!: InventorySystem;
  
  // Collision
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  
  // UI
  private uiContainer!: Phaser.GameObjects.Container;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private denTypeText!: Phaser.GameObjects.Text;
  
  // State
  private isCleared = false;
  private showingPopup = false;
  private exitPortal: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: SCENE_KEYS.DEN });
  }

  init(data: DenData): void {
    this.denData = data;
    this.isCleared = false;
    this.showingPopup = false;
    this.enemies = [];
    this.torches = [];
    this.decorations = [];
    this.tiles = [];
  }

  create(): void {
    console.log('[DenScene] Creating den:', this.denData?.denType);
    
    // Initialize systems
    this.initializeSystems();
    
    // Generate den map
    this.generateDenMap();
    
    // Render map
    this.renderMap();
    
    // Create player
    this.createPlayer();
    
    // Spawn enemies
    this.spawnEnemies();
    
    // Spawn decorations
    this.spawnDecorations();
    
    // Setup collision
    this.setupCollision();
    
    // Setup camera
    this.setupCamera();
    
    // Create UI
    this.createUI();
    
    // Setup events
    this.setupEvents();
    
    // Setup input
    this.setupInput();
    
    // Show entrance effect
    this.showEntranceEffect();
  }

  update(time: number, delta: number): void {
    if (this.showingPopup) return;
    
    this.player.update(delta);
    
    const input = this.movementSystem.update();
    
    if (input.isAttacking) {
      this.combatSystem.processPlayerAttack();
    }
    
    if (input.itemSlot >= 0) {
      this.inventorySystem.useItem(input.itemSlot);
    }
    
    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.getIsDead()) {
        enemy.update(delta, this.player);
      }
    }
    
    // Update environment
    for (const torch of this.torches) torch.update();
    
    // Update loot system
    this.lootSystem.update(delta);
    this.lootSystem.checkPickups();
    
    // Update UI
    this.updateUI();
    
    // Check completion
    if (!this.isCleared) {
      this.checkCompletion();
    } else {
      // Check if player reaches exit portal
      this.checkExitPortal();
    }
  }

  private initializeSystems(): void {
    this.movementSystem = new MovementSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(this);
    this.inventorySystem = new InventorySystem(this);
  }

  private generateDenMap(): void {
    // Create empty map
    for (let y = 0; y < this.mapHeight; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.tiles[y][x] = { x, y, type: 'wall' };
      }
    }
    
    // Create main arena room
    const arenaWidth = this.mapWidth - 6;
    const arenaHeight = this.mapHeight - 6;
    const startX = 3;
    const startY = 3;
    
    for (let y = startY; y < startY + arenaHeight; y++) {
      for (let x = startX; x < startX + arenaWidth; x++) {
        this.tiles[y][x].type = 'floor';
      }
    }
    
    // Add some pillars/obstacles based on den type
    if (this.denData?.denType === 'boss') {
      // Boss arena - pillars in corners
      const pillarPositions = [
        { x: startX + 3, y: startY + 3 },
        { x: startX + arenaWidth - 4, y: startY + 3 },
        { x: startX + 3, y: startY + arenaHeight - 4 },
        { x: startX + arenaWidth - 4, y: startY + arenaHeight - 4 },
      ];
      
      for (const pos of pillarPositions) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            if (this.tiles[pos.y + dy] && this.tiles[pos.y + dy][pos.x + dx]) {
              this.tiles[pos.y + dy][pos.x + dx].type = 'wall';
            }
          }
        }
      }
    } else if (this.denData?.denType === 'treasure') {
      // Treasure den - center pedestal area
      const centerX = Math.floor(this.mapWidth / 2);
      const centerY = Math.floor(this.mapHeight / 2);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // Keep center open
          if (this.tiles[centerY + dy] && this.tiles[centerY + dy][centerX + dx]) {
            this.tiles[centerY + dy][centerX + dx].type = 'wall';
          }
        }
      }
    }
  }

  private renderMap(): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    this.wallColliders = this.physics.add.staticGroup();
    
    // Render floor and walls
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;
        
        if (tile.type === 'floor') {
          this.renderFloorTile(worldX, worldY);
        } else if (tile.type === 'wall' && this.hasAdjacentFloor(x, y)) {
          this.renderWallTile(worldX, worldY);
          
          const collider = this.wallColliders.create(worldX, worldY, 'wall');
          collider.setVisible(false);
          collider.body.setSize(tileSize, tileSize);
        }
      }
    }
    
    // Set world bounds
    const worldWidth = this.mapWidth * tileSize;
    const worldHeight = this.mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  private hasAdjacentFloor(x: number, y: number): boolean {
    const dirs = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [1,-1], [-1,1], [1,1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny >= 0 && ny < this.mapHeight && nx >= 0 && nx < this.mapWidth) {
        if (this.tiles[ny][nx].type === 'floor') return true;
      }
    }
    return false;
  }

  private renderFloorTile(x: number, y: number): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const graphics = this.add.graphics();
    graphics.setPosition(x, y);
    
    // Den type determines floor color
    let baseColor = 0x2a2a3a;
    let accentColor = 0x3a3a4a;
    
    if (this.denData?.denType === 'boss') {
      baseColor = 0x2a1a2a;
      accentColor = 0x3a2a3a;
    } else if (this.denData?.denType === 'treasure') {
      baseColor = 0x2a2a1a;
      accentColor = 0x3a3a2a;
    }
    
    graphics.fillStyle(baseColor);
    graphics.fillRect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    // Pattern
    if (Math.random() < 0.3) {
      graphics.fillStyle(accentColor);
      graphics.fillRect(-tileSize/2, -tileSize/2, 3, 3);
    }
    
    graphics.lineStyle(1, 0x1a1a2a, 0.5);
    graphics.strokeRect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    graphics.setDepth(0);
  }

  private renderWallTile(x: number, y: number): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const graphics = this.add.graphics();
    graphics.setPosition(x, y);
    
    // Base
    graphics.fillStyle(0x1a1a2a);
    graphics.fillRect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    // Top face
    graphics.fillStyle(0x2a2a3a);
    graphics.fillRect(-tileSize/2, -tileSize/2, tileSize, tileSize * 0.7);
    
    // Brick pattern
    graphics.lineStyle(1, 0x252535, 0.5);
    graphics.lineBetween(-tileSize/2, -tileSize/4, tileSize/2, -tileSize/4);
    graphics.lineBetween(0, -tileSize/2, 0, -tileSize/4);
    
    // Highlight
    graphics.fillStyle(0x3a3a4a);
    graphics.fillRect(-tileSize/2, -tileSize/2, tileSize, 2);
    
    // Border
    graphics.lineStyle(1, 0x0a0a1a);
    graphics.strokeRect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    graphics.setDepth(2);
  }

  private createPlayer(): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    // Spawn player at bottom center of arena
    const spawnX = Math.floor(this.mapWidth / 2) * tileSize + tileSize / 2;
    const spawnY = (this.mapHeight - 5) * tileSize + tileSize / 2;
    
    this.player = new Player({
      scene: this,
      x: spawnX,
      y: spawnY,
      texture: 'player',
    });
    
    // Restore player state from dungeon
    if (this.denData?.returnData) {
      this.player.setHealth(this.denData.returnData.playerHealth);
    }
    
    this.movementSystem.setPlayer(this.player);
    this.combatSystem.setPlayer(this.player);
    this.lootSystem.setPlayer(this.player);
    this.inventorySystem.setPlayer(this.player);
  }

  private spawnEnemies(): void {
    if (!this.denData) return;
    
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const centerX = Math.floor(this.mapWidth / 2) * tileSize;
    const centerY = Math.floor(this.mapHeight / 2) * tileSize;
    
    // Determine enemy types
    let enemyTypes: string[];
    if (this.denData.denType === 'boss') {
      enemyTypes = ['boss_crypt_lord'];
    } else if (this.denData.denType === 'treasure') {
      enemyTypes = ['skeleton_knight', 'skeleton_basic'];
    } else {
      enemyTypes = ['skeleton_basic', 'zombie_shambler', 'ghost_wisp'];
    }
    
    for (let i = 0; i < this.denData.enemyCount; i++) {
      // Position enemies in a spread pattern
      const angle = (i / this.denData.enemyCount) * Math.PI * 2;
      const dist = 100 + Math.random() * 80;
      const ex = centerX + Math.cos(angle) * dist;
      const ey = centerY + Math.sin(angle) * dist - 50;
      
      // Boss is always the last enemy and spawns in center
      let enemyType: string;
      if (this.denData.denType === 'boss' && i === this.denData.enemyCount - 1) {
        enemyType = 'boss_crypt_lord';
      } else {
        enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      }
      
      const enemyData = getEnemy(enemyType);
      if (enemyData) {
        const enemy = new Enemy({
          scene: this,
          x: this.denData.denType === 'boss' && i === this.denData.enemyCount - 1 ? centerX : ex,
          y: this.denData.denType === 'boss' && i === this.denData.enemyCount - 1 ? centerY - 50 : ey,
          data: enemyData,
        });
        
        this.enemies.push(enemy);
        this.combatSystem.addEnemy(enemy);
        
        // Spawn animation
        enemy.setScale(0);
        enemy.setAlpha(0);
        this.tweens.add({
          targets: enemy,
          scale: 1,
          alpha: 1,
          duration: 400,
          delay: i * 150,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  private spawnDecorations(): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    
    // Add torches in corners
    const torchPositions = [
      { x: 4, y: 4 },
      { x: this.mapWidth - 5, y: 4 },
      { x: 4, y: this.mapHeight - 5 },
      { x: this.mapWidth - 5, y: this.mapHeight - 5 },
    ];
    
    for (const pos of torchPositions) {
      const torch = new FireTorch(this, pos.x * tileSize, pos.y * tileSize);
      this.torches.push(torch);
    }
    
    // Add bones/skulls
    const boneCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < boneCount; i++) {
      const bx = (5 + Math.random() * (this.mapWidth - 10)) * tileSize;
      const by = (5 + Math.random() * (this.mapHeight - 10)) * tileSize;
      const types: ('skull' | 'bones' | 'pile')[] = ['skull', 'bones', 'pile'];
      new BonesDecor(this, bx, by, types[Math.floor(Math.random() * types.length)]);
    }
    
    // Add grass patches
    const grassCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < grassCount; i++) {
      const gx = (5 + Math.random() * (this.mapWidth - 10)) * tileSize;
      const gy = (5 + Math.random() * (this.mapHeight - 10)) * tileSize;
      new GrassPatch(this, gx, gy);
    }
  }

  private setupCollision(): void {
    this.physics.add.collider(this.player, this.wallColliders);
    
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy, this.wallColliders);
    }
    
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private handlePlayerEnemyCollision(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const enemy = enemyObj as unknown as Enemy;
    if (enemy.getIsDead()) return;
    this.player.takeDamage(3, { x: enemy.x, y: enemy.y });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
    
    const worldWidth = this.mapWidth * GAME_CONFIG.TILE_SIZE;
    const worldHeight = this.mapHeight * GAME_CONFIG.TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  }

  private createUI(): void {
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0);
    this.uiContainer.setDepth(100);
    
    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0a0a0f, 0.9);
    headerBg.fillRect(0, 0, GAME_CONFIG.WIDTH, 50);
    headerBg.lineStyle(2, this.getDenColor());
    headerBg.lineBetween(0, 50, GAME_CONFIG.WIDTH, 50);
    this.uiContainer.add(headerBg);
    
    // Den type indicator
    const typeLabel = this.denData?.denType === 'boss' ? '⚔ BOSS DEN ⚔' :
                      this.denData?.denType === 'treasure' ? '💎 TREASURE DEN 💎' :
                      '☠ MONSTER DEN ☠';
    this.denTypeText = this.add.text(GAME_CONFIG.WIDTH / 2, 25, typeLabel, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: this.getDenColorHex(),
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.denTypeText.setOrigin(0.5);
    this.uiContainer.add(this.denTypeText);
    
    // Health bar
    this.createHealthBar();
    
    // Enemy count
    this.enemyCountText = this.add.text(GAME_CONFIG.WIDTH - 20, 25, `Enemies: ${this.denData?.enemyCount ?? 0}`, {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#aa4444',
    });
    this.enemyCountText.setOrigin(1, 0.5);
    this.uiContainer.add(this.enemyCountText);
    
    // Controls hint
    const hint = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 20,
      'WASD: Move | SPACE: Attack | Defeat all enemies to exit', {
      fontFamily: 'Courier New',
      fontSize: '11px',
      color: '#4a4a5a',
    });
    hint.setOrigin(0.5);
    this.uiContainer.add(hint);
  }

  private createHealthBar(): void {
    const x = 20;
    const y = 15;
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(x - 5, y - 5, 160, 30, 4);
    this.uiContainer.add(bg);
    
    this.healthBar = this.add.graphics();
    this.uiContainer.add(this.healthBar);
    
    const heart = this.add.graphics();
    heart.fillStyle(0xaa4444);
    heart.fillCircle(x + 12, y + 10, 6);
    this.uiContainer.add(heart);
    
    this.healthText = this.add.text(x + 85, y + 10, '100/100', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#ffffff',
    });
    this.healthText.setOrigin(0.5);
    this.uiContainer.add(this.healthText);
    
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    const stats = this.player.getStats();
    const x = 20 + 25;
    const y = 15;
    const width = 110;
    const height = 20;
    
    this.healthBar.clear();
    this.healthBar.fillStyle(0x442222);
    this.healthBar.fillRect(x, y, width, height);
    
    const percent = stats.health / stats.maxHealth;
    const color = percent > 0.5 ? 0x44aa44 : percent > 0.25 ? 0xaaaa44 : 0xaa4444;
    
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(x, y, width * percent, height);
    this.healthBar.lineStyle(2, 0x5a5a7a);
    this.healthBar.strokeRect(x, y, width, height);
    
    this.healthText.setText(`${stats.health}/${stats.maxHealth}`);
  }

  private updateUI(): void {
    this.updateHealthBar();
    
    const living = this.enemies.filter(e => !e.getIsDead()).length;
    this.enemyCountText.setText(`Enemies: ${living}`);
  }

  private getDenColor(): number {
    switch (this.denData?.denType) {
      case 'boss': return 0xff4488;
      case 'treasure': return 0xffdd44;
      default: return 0x4488ff;
    }
  }

  private getDenColorHex(): string {
    switch (this.denData?.denType) {
      case 'boss': return '#ff4488';
      case 'treasure': return '#ffdd44';
      default: return '#4488ff';
    }
  }

  private setupEvents(): void {
    this.game.events.on(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDeath, this);
    this.game.events.on(GAME_EVENTS.ENEMY_DIED, this.handleEnemyDeath, this);
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.isCleared) {
        this.showCannotLeaveMessage();
      }
    });
    
    this.input.keyboard!.on('keydown-I', () => {
      this.game.events.emit(GAME_EVENTS.TOGGLE_INVENTORY);
    });
  }

  private showEntranceEffect(): void {
    this.cameras.main.fadeIn(400, 20, 10, 30);
    this.cameras.main.flash(300, 50, 50, 100);
    
    // Show title
    const title = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 50, 
      this.denData?.denType === 'boss' ? 'DEFEAT THE BOSS!' :
      this.denData?.denType === 'treasure' ? 'CLAIM THE TREASURE!' :
      'CLEAR THE DEN!', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: this.getDenColorHex(),
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(200);
    title.setScale(0);
    
    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: title,
          alpha: 0,
          y: '-=30',
          duration: 600,
          delay: 1500,
          onComplete: () => title.destroy(),
        });
      },
    });
  }

  private showCannotLeaveMessage(): void {
    const msg = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 80,
      'Defeat all enemies to open the exit portal!', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ff6666',
      stroke: '#000000',
      strokeThickness: 3,
    });
    msg.setOrigin(0.5);
    msg.setScrollFactor(0);
    msg.setDepth(200);
    
    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: '-=20',
      duration: 1500,
      delay: 1000,
      onComplete: () => msg.destroy(),
    });
  }

  private handlePlayerDeath(): void {
    this.showingPopup = true;
    
    // Return to dungeon with failure
    this.time.delayedCall(1500, () => {
      this.exitDen(false);
    });
  }

  private handleEnemyDeath(): void {
    // Check if all enemies defeated
    const living = this.enemies.filter(e => !e.getIsDead()).length;
    if (living === 0 && !this.isCleared) {
      this.onDenCleared();
    }
  }

  private checkCompletion(): void {
    const living = this.enemies.filter(e => !e.getIsDead()).length;
    if (living === 0 && !this.isCleared) {
      this.onDenCleared();
    }
  }

  private onDenCleared(): void {
    this.isCleared = true;
    
    // Victory effects
    this.cameras.main.flash(400, 100, 200, 100);
    
    // Show cleared message
    const cleared = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 30, 'DEN CLEARED!', {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 4,
    });
    cleared.setOrigin(0.5);
    cleared.setScrollFactor(0);
    cleared.setDepth(200);
    cleared.setScale(0);
    
    this.tweens.add({
      targets: cleared,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: cleared,
          alpha: 0,
          duration: 1000,
          delay: 2000,
          onComplete: () => cleared.destroy(),
        });
      },
    });
    
    // Spawn rewards
    this.spawnRewards();
    
    // Create exit portal
    this.time.delayedCall(500, () => {
      this.createExitPortal();
    });
    
    // Show instruction
    const hint = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 30,
      'Walk to the portal to exit!', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#aaaaaa',
    });
    hint.setOrigin(0.5);
    hint.setScrollFactor(0);
    hint.setDepth(200);
    
    this.tweens.add({
      targets: hint,
      alpha: 0,
      duration: 500,
      delay: 3000,
      onComplete: () => hint.destroy(),
    });
  }

  private spawnRewards(): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const centerX = Math.floor(this.mapWidth / 2) * tileSize;
    const centerY = Math.floor(this.mapHeight / 2) * tileSize;
    
    const rewards = this.denData?.denType === 'boss'
      ? ['gem_large', 'gem_large', 'potion_health_medium', 'sword_shadow']
      : this.denData?.denType === 'treasure'
      ? ['gem_medium', 'gem_medium', 'gem_medium', 'potion_health_small']
      : ['gem_small', 'gem_small', 'potion_health_small'];
    
    for (let i = 0; i < rewards.length; i++) {
      const itemData = getItem(rewards[i]);
      if (itemData && Math.random() < 0.9) {
        const angle = (i / rewards.length) * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        this.lootSystem.spawnItem(
          centerX + Math.cos(angle) * dist,
          centerY + Math.sin(angle) * dist,
          itemData,
          1 + Math.floor(Math.random() * 2)
        );
      }
    }
  }

  private createExitPortal(): void {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    // Place portal at bottom of arena
    const portalX = Math.floor(this.mapWidth / 2) * tileSize;
    const portalY = (this.mapHeight - 4) * tileSize;
    
    this.exitPortal = this.add.container(portalX, portalY);
    this.exitPortal.setDepth(3);
    
    // Portal graphics
    const portalGlow = this.add.graphics();
    this.exitPortal.add(portalGlow);
    
    const portalBase = this.add.graphics();
    // Stone archway
    portalBase.fillStyle(0x3a3a4a);
    portalBase.fillRect(-30, -40, 10, 60);
    portalBase.fillRect(20, -40, 10, 60);
    portalBase.fillRoundedRect(-30, -50, 60, 15, 6);
    
    // Portal void
    portalBase.fillStyle(0x0a0a1a);
    portalBase.fillEllipse(0, -10, 35, 50);
    
    // Inner glow
    portalBase.fillStyle(0x44ff44, 0.6);
    portalBase.fillEllipse(0, -10, 28, 40);
    
    this.exitPortal.add(portalBase);
    
    // Label
    const label = this.add.text(0, 30, 'EXIT', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#44ff44',
    });
    label.setOrigin(0.5);
    this.exitPortal.add(label);
    
    // Animate glow
    this.tweens.add({
      targets: { value: 0 },
      value: 1,
      duration: 1000,
      repeat: -1,
      yoyo: true,
      onUpdate: (tween) => {
        const v = tween.getValue() ?? 0;
        portalGlow.clear();
        portalGlow.fillStyle(0x44ff44, 0.1 + v * 0.15);
        portalGlow.fillCircle(0, -10, 50 + v * 10);
      },
    });
    
    // Spawn animation
    this.exitPortal.setScale(0);
    this.exitPortal.setAlpha(0);
    this.tweens.add({
      targets: this.exitPortal,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  private checkExitPortal(): void {
    if (!this.exitPortal) return;
    
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.exitPortal.x, this.exitPortal.y
    );
    
    if (dist < 50) {
      this.exitDen(true);
    }
  }

  private exitDen(cleared: boolean): void {
    // Prevent multiple exits
    if (this.showingPopup && cleared) return; // Allow exit on death
    this.showingPopup = true;
    
    // Save current state (if inventory system exists)
    try {
      this.inventorySystem?.save();
    } catch (e) {
      console.warn('[DenScene] Could not save inventory:', e);
    }
    
    // Get player health safely
    let playerHealth = 0;
    try {
      if (this.player && this.player.isAlive()) {
        playerHealth = this.player.getStats().health;
      }
    } catch (e) {
      console.warn('[DenScene] Could not get player health:', e);
    }
    
    // Transition effect
    this.cameras.main.flash(300, 100, 100, 150);
    this.cameras.main.fadeOut(500, 10, 10, 20);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Clean up
      this.cleanup();
      
      if (!cleared) {
        // Player died - return to home map
        this.registry.remove('dungeonState');
        this.scene.start(SCENE_KEYS.HOME_MAP);
      } else {
        // Return to dungeon scene with result
        this.scene.start(SCENE_KEYS.DUNGEON, {
          returnFromDen: true,
          denCleared: cleared,
          portalX: this.denData?.portalX,
          portalY: this.denData?.portalY,
          playerHealth: playerHealth,
        });
      }
    });
  }

  private cleanup(): void {
    this.game.events.off(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDeath, this);
    this.game.events.off(GAME_EVENTS.ENEMY_DIED, this.handleEnemyDeath, this);
    
    this.lootSystem.destroy();
    this.inventorySystem.destroy();
    
    this.enemies = [];
    this.torches = [];
  }
}
