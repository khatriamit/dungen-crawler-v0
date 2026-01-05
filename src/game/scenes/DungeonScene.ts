import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, LevelData, GAME_EVENTS } from '../types';
import { 
  Player, Enemy, 
  FireTorch, GrassPatch, Bat, BonesDecor, TreasureChest, DenPortal 
} from '../entities';
import { 
  MovementSystem, 
  CombatSystem, 
  LootSystem, 
  InventorySystem,
  DungeonGenerationSystem,
  GeneratedDungeon 
} from '../systems';
import { getEnemy } from '../data/enemies';
import { getItem } from '../data/items';
import { SaveService } from '../services/SaveService';
import { EconomyService } from '../services/EconomyService';

/**
 * DungeonScene - Main Gameplay Scene with Den Portal System
 */

interface DungeonInitData {
  level?: LevelData;
  returnFromDen?: boolean;
  denCleared?: boolean;
  portalX?: number;
  portalY?: number;
  playerHealth?: number;
}

export class DungeonScene extends Phaser.Scene {
  // Level data
  private currentLevel: LevelData | null = null;
  private dungeon: GeneratedDungeon | null = null;
  
  // Entities
  private player!: Player;
  private enemies: Enemy[] = [];
  
  // Environment
  private torches: FireTorch[] = [];
  private grassPatches: GrassPatch[] = [];
  private bats: Bat[] = [];
  private chests: TreasureChest[] = [];
  private denPortals: DenPortal[] = [];
  
  // Systems
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private lootSystem!: LootSystem;
  private inventorySystem!: InventorySystem;
  private dungeonGenerator!: DungeonGenerationSystem;
  
  // Collision groups
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  
  // Run stats
  private runStats = {
    gemsCollected: 0,
    enemiesDefeated: 0,
    densCleared: 0,
    startTime: 0,
  };
  
  // UI elements
  private uiContainer!: Phaser.GameObjects.Container;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private inventoryButton!: Phaser.GameObjects.Container;
  
  // Den interaction state
  private nearDen: DenPortal | null = null;
  private showingPopup = false;
  private popupElements: Phaser.GameObjects.GameObject[] = [];
  
  // Game state
  private isPaused = false;
  private isGameOver = false;
  private isLevelComplete = false;
  
  // Return from den data
  private returnFromDen = false;
  private returnDenData: { cleared: boolean; portalX: number; portalY: number; playerHealth: number } | null = null;

  constructor() {
    super({ key: SCENE_KEYS.DUNGEON });
  }

  init(data: DungeonInitData): void {
    // Check if returning from a den
    if (data.returnFromDen) {
      this.returnFromDen = true;
      this.returnDenData = {
        cleared: data.denCleared ?? false,
        portalX: data.portalX ?? 0,
        portalY: data.portalY ?? 0,
        playerHealth: data.playerHealth ?? 100,
      };
      // Keep current level from registry
      this.currentLevel = this.registry.get('currentLevel');
    } else {
      this.returnFromDen = false;
      this.returnDenData = null;
      this.currentLevel = data.level ?? this.registry.get('currentLevel');
      
      // Reset stats for new run
      this.runStats = {
        gemsCollected: 0,
        enemiesDefeated: 0,
        densCleared: 0,
        startTime: Date.now(),
      };
    }
    
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.nearDen = null;
    this.showingPopup = false;
    this.popupElements = [];
    
    // Only reset arrays if not returning from den
    if (!this.returnFromDen) {
      this.enemies = [];
      this.torches = [];
      this.grassPatches = [];
      this.bats = [];
      this.chests = [];
      this.denPortals = [];
    }
  }

  create(): void {
    console.log(`[DungeonScene] Creating: ${this.currentLevel?.name ?? 'Unknown'}, returnFromDen: ${this.returnFromDen}`);
    
    if (this.returnFromDen && this.returnDenData) {
      // Returning from den - restore state
      this.handleReturnFromDen();
    } else {
      // Fresh start - generate new dungeon
      this.initializeSystems();
      this.generateDungeon();
      this.createPlayer();
      this.spawnEnemies();
      this.spawnEnvironment();
      this.setupCollision();
      this.setupCamera();
      this.createUI();
      this.setupEvents();
      this.setupInput();
      
      this.scene.launch(SCENE_KEYS.UI);
      this.cameras.main.fadeIn(500, 10, 10, 15);
    }
  }

  private handleReturnFromDen(): void {
    // The dungeon state should be preserved in registry
    const savedState = this.registry.get('dungeonState');
    
    if (savedState) {
      // Restore from saved state
      this.dungeon = savedState.dungeon;
      this.runStats = savedState.runStats || this.runStats;
      
      // Get saved enemy and portal data (not objects!)
      const savedEnemyData = savedState.enemyData || [];
      const savedPortalData = savedState.portalData || [];
      
      this.initializeSystems();
      
      // Regenerate the map visuals
      if (this.dungeon) {
        const { collisionRects } = this.dungeonGenerator.renderDungeon(this.dungeon);
        this.wallColliders = collisionRects;
        
        const worldWidth = this.dungeon.width * GAME_CONFIG.TILE_SIZE;
        const worldHeight = this.dungeon.height * GAME_CONFIG.TILE_SIZE;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
      }
      
      // Recreate player at den position
      this.createPlayerAtPosition(this.returnDenData!.portalX, this.returnDenData!.portalY + 50);
      this.player.setHealth(this.returnDenData!.playerHealth);
      
      // Respawn enemies from saved data
      this.enemies = [];
      for (const enemyInfo of savedEnemyData) {
        if (!enemyInfo.isDead) {
          const enemyData = getEnemy(enemyInfo.type);
          if (enemyData) {
            const enemy = new Enemy({
              scene: this,
              x: enemyInfo.x,
              y: enemyInfo.y,
              data: enemyData,
            });
            // Restore health if it was damaged
            if (enemyInfo.health !== undefined) {
              enemy.setCurrentHealth(enemyInfo.health);
            }
            this.enemies.push(enemy);
            this.combatSystem.addEnemy(enemy);
          }
        }
      }
      
      // Respawn portals from saved data
      this.denPortals = [];
      for (const portalInfo of savedPortalData) {
        const portal = new DenPortal(this, portalInfo.x, portalInfo.y, portalInfo.denType);
        if (portalInfo.isCleared) {
          portal.markCleared();
        }
        this.denPortals.push(portal);
      }
      
      // Mark the portal as cleared if den was completed
      if (this.returnDenData!.cleared) {
        for (const portal of this.denPortals) {
          if (Math.abs(portal.x - this.returnDenData!.portalX) < 10 && 
              Math.abs(portal.y - this.returnDenData!.portalY) < 10) {
            if (!portal.isCleared) {
              portal.markCleared();
              this.runStats.densCleared++;
            }
            
            // Spawn rewards
            this.spawnDenRewards(portal);
            break;
          }
        }
      }
      
      // Spawn fresh environment
      this.spawnEnvironment();
      
      this.setupCollision();
      this.setupCamera();
      this.createUI();
      this.setupEvents();
      this.setupInput();
      
      this.scene.launch(SCENE_KEYS.UI);
      this.cameras.main.fadeIn(400, 10, 10, 15);
      
      // Show return message
      if (this.returnDenData!.cleared) {
        this.showDenClearedMessage();
      }
    } else {
      // No saved state - generate fresh
      this.returnFromDen = false;
      this.initializeSystems();
      this.generateDungeon();
      this.createPlayer();
      this.spawnEnemies();
      this.spawnEnvironment();
      this.setupCollision();
      this.setupCamera();
      this.createUI();
      this.setupEvents();
      this.setupInput();
      
      this.scene.launch(SCENE_KEYS.UI);
      this.cameras.main.fadeIn(500, 10, 10, 15);
    }
  }

  private spawnDenRewards(portal: DenPortal): void {
    const rewards = portal.denType === 'boss'
      ? ['gem_large', 'gem_large', 'potion_health_medium']
      : portal.denType === 'treasure'
      ? ['gem_medium', 'gem_medium', 'potion_health_small']
      : ['gem_small', 'gem_small'];
    
    for (const itemId of rewards) {
      const itemData = getItem(itemId);
      if (itemData && Math.random() < 0.9) {
        this.lootSystem.spawnItem(
          portal.x + (Math.random() - 0.5) * 60,
          portal.y + 40 + Math.random() * 20,
          itemData,
          1 + Math.floor(Math.random() * 2)
        );
      }
    }
  }

  private showDenClearedMessage(): void {
    const msg = this.add.text(GAME_CONFIG.WIDTH / 2, 100, '✓ Den Cleared! Rewards collected.', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 3,
    });
    msg.setOrigin(0.5);
    msg.setScrollFactor(0);
    msg.setDepth(200);
    
    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: 80,
      duration: 2000,
      delay: 2000,
      onComplete: () => msg.destroy(),
    });
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver || this.isLevelComplete || this.showingPopup) return;
    
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
    
    this.updateEnvironment();
    this.lootSystem.update(delta);
    
    const pickedUp = this.lootSystem.checkPickups();
    for (const item of pickedUp) {
      if (item.item.type === 'gem') {
        this.player.addGems(item.item.value * item.quantity);
        this.runStats.gemsCollected += item.item.value * item.quantity;
        this.updateGemsDisplay();
      }
    }
    
    this.checkChestInteraction();
    this.checkDenProximity();
    this.checkWinCondition();
    this.updateUI();
  }

  private initializeSystems(): void {
    this.dungeonGenerator = new DungeonGenerationSystem(this);
    this.movementSystem = new MovementSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(this);
    this.inventorySystem = new InventorySystem(this);
  }

  private generateDungeon(): void {
    if (!this.currentLevel) return;
    
    this.dungeon = this.dungeonGenerator.generate(this.currentLevel);
    const { collisionRects } = this.dungeonGenerator.renderDungeon(this.dungeon);
    this.wallColliders = collisionRects;
    
    const worldWidth = this.dungeon.width * GAME_CONFIG.TILE_SIZE;
    const worldHeight = this.dungeon.height * GAME_CONFIG.TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  private createPlayer(): void {
    const spawnPos = this.dungeonGenerator.getSpawnPosition(this.dungeon!);
    this.createPlayerAtPosition(spawnPos.x, spawnPos.y);
  }

  private createPlayerAtPosition(x: number, y: number): void {
    this.player = new Player({
      scene: this,
      x: x,
      y: y,
      texture: 'player',
    });
    
    this.movementSystem.setPlayer(this.player);
    this.combatSystem.setPlayer(this.player);
    this.lootSystem.setPlayer(this.player);
    this.inventorySystem.setPlayer(this.player);
  }

  private spawnEnemies(): void {
    const enemySpawns = this.dungeonGenerator.getEnemySpawns(this.dungeon!);
    
    for (const spawn of enemySpawns) {
      const enemyData = getEnemy(spawn.type);
      if (!enemyData) continue;
      
      const enemy = new Enemy({
        scene: this,
        x: spawn.x,
        y: spawn.y,
        data: enemyData,
      });
      
      this.enemies.push(enemy);
      this.combatSystem.addEnemy(enemy);
    }
  }

  private spawnEnvironment(): void {
    if (!this.dungeon) return;
    
    // Clear existing environment if returning
    this.torches = [];
    this.grassPatches = [];
    this.bats = [];
    this.chests = [];
    
    for (const spawn of this.dungeon.environmentSpawns) {
      switch (spawn.type) {
        case 'torch':
          this.torches.push(new FireTorch(this, spawn.x, spawn.y));
          break;
        case 'grass':
          this.grassPatches.push(new GrassPatch(this, spawn.x, spawn.y));
          break;
        case 'bones':
          new BonesDecor(this, spawn.x, spawn.y, 'bones');
          break;
        case 'skull':
          new BonesDecor(this, spawn.x, spawn.y, 'skull');
          break;
        case 'pile':
          new BonesDecor(this, spawn.x, spawn.y, 'pile');
          break;
        case 'chest_common':
          this.chests.push(new TreasureChest(this, spawn.x, spawn.y, 'common'));
          break;
        case 'chest_rare':
          this.chests.push(new TreasureChest(this, spawn.x, spawn.y, 'rare'));
          break;
        case 'chest_epic':
          this.chests.push(new TreasureChest(this, spawn.x, spawn.y, 'epic'));
          break;
      }
    }
    
    // Only spawn den portals if not returning (they're preserved)
    if (!this.returnFromDen) {
      for (const denSpawn of this.dungeon.denSpawns) {
        const portal = new DenPortal(this, denSpawn.x, denSpawn.y, denSpawn.denType);
        this.denPortals.push(portal);
      }
    }
    
    for (const zone of this.dungeon.batZones) {
      const batCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < batCount; i++) {
        const bat = new Bat(
          this,
          zone.minX + Math.random() * (zone.maxX - zone.minX),
          zone.minY + Math.random() * (zone.maxY - zone.minY),
          zone
        );
        this.bats.push(bat);
      }
    }
  }

  private updateEnvironment(): void {
    for (const torch of this.torches) torch.update();
    for (const grass of this.grassPatches) grass.update();
    for (const bat of this.bats) bat.update();
    for (const chest of this.chests) chest.update();
    for (const portal of this.denPortals) portal.update();
  }

  private checkChestInteraction(): void {
    for (const chest of this.chests) {
      if (chest.isOpened()) continue;
      
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist < 40) {
        const loot = chest.open();
        for (const item of loot) {
          const itemData = getItem(item.itemId);
          if (itemData) {
            this.lootSystem.spawnItem(chest.x + (Math.random() - 0.5) * 30, chest.y + 20, itemData, item.quantity);
          }
        }
      }
    }
  }

  // ========== DEN PORTAL SYSTEM ==========

  private checkDenProximity(): void {
    this.nearDen = null;
    
    for (const portal of this.denPortals) {
      if (portal.isCleared) continue;
      
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
      if (dist < 50) {
        this.nearDen = portal;
        
        // Show prompt to enter
        if (!this.showingPopup) {
          this.showDenConfirmation(portal);
        }
        return;
      }
    }
  }

  private showDenConfirmation(portal: DenPortal): void {
    this.showingPopup = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;
    
    // Clear any existing popup
    this.clearPopup();
    
    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(300);
    this.popupElements.push(overlay);
    
    // Box
    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.95);
    box.fillRoundedRect(centerX - 200, centerY - 130, 400, 260, 16);
    box.lineStyle(3, this.getDenColor(portal.denType));
    box.strokeRoundedRect(centerX - 200, centerY - 130, 400, 260, 16);
    box.setScrollFactor(0);
    box.setDepth(301);
    this.popupElements.push(box);
    
    // Title
    const typeText = portal.denType === 'boss' ? 'BOSS DEN' : 
                     portal.denType === 'treasure' ? 'TREASURE DEN' : 'MONSTER DEN';
    const title = this.add.text(centerX, centerY - 90, typeText, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: this.getDenColorHex(portal.denType),
      stroke: '#000000',
      strokeThickness: 2,
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(302);
    this.popupElements.push(title);
    
    // Description
    const desc = this.add.text(centerX, centerY - 40, `Defeat ${portal.enemyCount} enemies to clear!`, {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#aaaaaa',
    });
    desc.setOrigin(0.5);
    desc.setScrollFactor(0);
    desc.setDepth(302);
    this.popupElements.push(desc);
    
    // Warning
    const warning = this.add.text(centerX, centerY, 'You will be transported to a separate arena.', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#ff9966',
    });
    warning.setOrigin(0.5);
    warning.setScrollFactor(0);
    warning.setDepth(302);
    this.popupElements.push(warning);
    
    const warning2 = this.add.text(centerX, centerY + 20, 'Clear all enemies to exit and claim rewards!', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#66ff66',
    });
    warning2.setOrigin(0.5);
    warning2.setScrollFactor(0);
    warning2.setDepth(302);
    this.popupElements.push(warning2);
    
    // Enter button
    this.createPopupButton(centerX - 80, centerY + 80, 'ENTER DEN', 0x44aa44, () => {
      this.enterDen(portal);
    });
    
    // Cancel button
    this.createPopupButton(centerX + 80, centerY + 80, 'CANCEL', 0x666666, () => {
      this.clearPopup();
      this.showingPopup = false;
    });
  }

  private createPopupButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
    bg.setScrollFactor(0);
    bg.setDepth(302);
    this.popupElements.push(bg);
    
    // Button label
    const label = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffffff',
    });
    label.setOrigin(0.5);
    label.setScrollFactor(0);
    label.setDepth(303);
    this.popupElements.push(label);
    
    // Interactive rectangle instead of zone for better click detection
    const hitArea = this.add.rectangle(x, y, 120, 36, 0xffffff, 0);
    hitArea.setScrollFactor(0);
    hitArea.setDepth(305);
    hitArea.setInteractive({ useHandCursor: true });
    this.popupElements.push(hitArea);
    
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
      bg.lineStyle(2, 0xffffff, 0.5);
      bg.strokeRoundedRect(x - 60, y - 18, 120, 36, 8);
    });
    
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.9);
      bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
    });
    
    hitArea.on('pointerdown', () => {
      // Visual feedback
      bg.clear();
      bg.fillStyle(0xffffff, 0.3);
      bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
      
      // Execute callback after brief delay for visual feedback
      this.time.delayedCall(50, callback);
    });
  }

  private clearPopup(): void {
    for (const el of this.popupElements) {
      el.destroy();
    }
    this.popupElements = [];
  }

  private getDenColor(type: string): number {
    switch (type) {
      case 'boss': return 0xff4488;
      case 'treasure': return 0xffdd44;
      default: return 0x4488ff;
    }
  }

  private getDenColorHex(type: string): string {
    switch (type) {
      case 'boss': return '#ff4488';
      case 'treasure': return '#ffdd44';
      default: return '#4488ff';
    }
  }

  private enterDen(portal: DenPortal): void {
    this.clearPopup();
    this.showingPopup = false;
    
    // Play portal enter sound
    const sounds = this.game.registry.get('sounds');
    if (sounds && sounds.portalEnter) {
      try { sounds.portalEnter(); } catch (e) {}
    }
    
    // Save enemy DATA (not objects!) for restoration
    const enemyData = this.enemies.map(enemy => ({
      x: enemy.x,
      y: enemy.y,
      type: enemy.enemyData.id,
      isDead: enemy.getIsDead(),
      health: enemy.getCurrentHealth(),
    }));
    
    // Save portal DATA (not objects!)
    const portalData = this.denPortals.map(p => ({
      x: p.x,
      y: p.y,
      denType: p.denType,
      isCleared: p.isCleared,
    }));
    
    // Save dungeon state to registry for return
    this.registry.set('dungeonState', {
      dungeon: this.dungeon,
      enemyData: enemyData,
      portalData: portalData,
      runStats: this.runStats,
    });
    
    // Store current level
    this.registry.set('currentLevel', this.currentLevel);
    
    // Transition effect
    this.cameras.main.flash(300, 50, 50, 100);
    this.cameras.main.fadeOut(400, 10, 10, 30);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Clean up current scene
      this.cleanup();
      
      // Start DenScene with portal data
      this.scene.start(SCENE_KEYS.DEN, {
        denType: portal.denType,
        enemyCount: portal.enemyCount,
        portalX: portal.x,
        portalY: portal.y,
        returnData: {
          playerX: this.player.x,
          playerY: this.player.y,
          playerHealth: this.player.getStats().health,
          playerGems: this.player.getGems(),
        },
      });
    });
  }

  // ========== COLLISION & SETUP ==========

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
    this.cameras.main.setZoom(1);
    
    const worldWidth = this.dungeon!.width * GAME_CONFIG.TILE_SIZE;
    const worldHeight = this.dungeon!.height * GAME_CONFIG.TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  }

  // ========== UI ==========

  private createUI(): void {
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0);
    this.uiContainer.setDepth(100);
    
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0a0a0f, 0.85);
    headerBg.fillRect(0, 0, GAME_CONFIG.WIDTH, 50);
    headerBg.lineStyle(1, 0x3a3a5a);
    headerBg.lineBetween(0, 50, GAME_CONFIG.WIDTH, 50);
    this.uiContainer.add(headerBg);
    
    this.levelText = this.add.text(20, 15, this.currentLevel?.name ?? 'Dungeon', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#8b7355',
    });
    this.uiContainer.add(this.levelText);
    
    this.createHealthBar();
    this.createGemsDisplay();
    
    this.enemyCountText = this.add.text(GAME_CONFIG.WIDTH - 140, 15, `Enemies: ${this.enemies.length}`, {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#aa4444',
    });
    this.uiContainer.add(this.enemyCountText);
    
    this.createInventoryButton();
    
    const controlsHint = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT - 20,
      'WASD: Move | SPACE: Attack | Walk into portals | ESC: Exit',
      { fontFamily: 'Courier New', fontSize: '11px', color: '#4a4a5a' }
    );
    controlsHint.setOrigin(0.5);
    this.uiContainer.add(controlsHint);
  }

  private createInventoryButton(): void {
    this.inventoryButton = this.add.container(GAME_CONFIG.WIDTH - 50, GAME_CONFIG.HEIGHT - 60);
    
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 0.9);
    btnBg.fillRoundedRect(-25, -25, 50, 50, 8);
    btnBg.lineStyle(2, 0x5a5a7a);
    btnBg.strokeRoundedRect(-25, -25, 50, 50, 8);
    this.inventoryButton.add(btnBg);
    
    const icon = this.add.graphics();
    icon.fillStyle(0x6a5a4a);
    icon.fillRoundedRect(-12, -8, 24, 20, 4);
    icon.fillStyle(0x8b7355);
    icon.fillRect(-10, -12, 20, 6);
    icon.fillStyle(0x5a4a3a);
    icon.fillRect(-8, -2, 16, 2);
    icon.fillRect(-8, 4, 16, 2);
    this.inventoryButton.add(icon);
    
    const label = this.add.text(0, 32, 'I', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#6a6a8a',
    });
    label.setOrigin(0.5);
    this.inventoryButton.add(label);
    
    const hitArea = this.add.zone(0, 0, 50, 50);
    hitArea.setInteractive({ useHandCursor: true });
    this.inventoryButton.add(hitArea);
    
    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2a2a4e, 0.95);
      btnBg.fillRoundedRect(-25, -25, 50, 50, 8);
      btnBg.lineStyle(2, 0x8b7355);
      btnBg.strokeRoundedRect(-25, -25, 50, 50, 8);
    });
    
    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 0.9);
      btnBg.fillRoundedRect(-25, -25, 50, 50, 8);
      btnBg.lineStyle(2, 0x5a5a7a);
      btnBg.strokeRoundedRect(-25, -25, 50, 50, 8);
    });
    
    hitArea.on('pointerdown', () => {
      this.game.events.emit(GAME_EVENTS.TOGGLE_INVENTORY);
    });
    
    this.uiContainer.add(this.inventoryButton);
  }

  private createHealthBar(): void {
    const x = GAME_CONFIG.WIDTH / 2 - 100;
    const y = 15;
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(x - 5, y - 5, 210, 30, 4);
    this.uiContainer.add(bg);
    
    this.healthBar = this.add.graphics();
    this.uiContainer.add(this.healthBar);
    
    const heart = this.add.graphics();
    heart.fillStyle(0xaa4444);
    heart.fillCircle(x + 12, y + 10, 6);
    this.uiContainer.add(heart);
    
    this.healthText = this.add.text(x + 110, y + 10, '100/100', {
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
    const x = GAME_CONFIG.WIDTH / 2 - 100 + 25;
    const y = 15;
    const width = 150;
    const height = 20;
    
    this.healthBar.clear();
    this.healthBar.fillStyle(0x442222);
    this.healthBar.fillRect(x, y, width, height);
    
    const percent = stats.health / stats.maxHealth;
    const healthColor = percent > 0.5 ? 0x44aa44 : percent > 0.25 ? 0xaaaa44 : 0xaa4444;
    
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(x, y, width * percent, height);
    this.healthBar.lineStyle(2, 0x5a5a7a);
    this.healthBar.strokeRect(x, y, width, height);
    
    this.healthText.setText(`${stats.health}/${stats.maxHealth}`);
  }

  private createGemsDisplay(): void {
    const x = 20;
    const y = 35;
    
    const gem = this.add.graphics();
    gem.fillStyle(0xffd700);
    gem.beginPath();
    gem.moveTo(x + 8, y - 6);
    gem.lineTo(x + 14, y);
    gem.lineTo(x + 8, y + 6);
    gem.lineTo(x + 2, y);
    gem.closePath();
    gem.fill();
    this.uiContainer.add(gem);
    
    this.gemsText = this.add.text(x + 25, y, '0', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#ffd700',
    });
    this.gemsText.setOrigin(0, 0.5);
    this.uiContainer.add(this.gemsText);
  }

  private updateGemsDisplay(): void {
    this.gemsText.setText(EconomyService.formatGems(this.runStats.gemsCollected));
  }

  private updateUI(): void {
    this.updateHealthBar();
    
    const livingEnemies = this.enemies.filter(e => !e.getIsDead()).length;
    this.enemyCountText.setText(`Enemies: ${livingEnemies}`);
  }

  // ========== EVENTS ==========

  private setupEvents(): void {
    this.game.events.on(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDeath, this);
    this.game.events.on(GAME_EVENTS.ENEMY_DIED, this.handleEnemyDeath, this);
    this.game.events.on(GAME_EVENTS.PLAYER_HEALED, this.updateHealthBar, this);
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.showingPopup) {
        this.showPauseMenu();
      } else {
        this.clearPopup();
        this.showingPopup = false;
      }
    });
    
    this.input.keyboard!.on('keydown-I', () => {
      if (!this.showingPopup) {
        this.game.events.emit(GAME_EVENTS.TOGGLE_INVENTORY);
      }
    });
  }

  private handlePlayerDeath(): void {
    this.isGameOver = true;
    this.time.timeScale = 0.3;
    this.time.delayedCall(1000, () => {
      this.time.timeScale = 1;
      this.showGameOver();
    });
  }

  private handleEnemyDeath(enemy: Enemy): void {
    this.runStats.enemiesDefeated++;
    const xp = enemy.enemyData.type === 'boss' ? 100 : enemy.enemyData.type === 'elite' ? 30 : 10;
    this.player.addExperience(xp);
  }

  private checkWinCondition(): void {
    if (this.isLevelComplete) return;
    
    const livingEnemies = this.enemies.filter(e => !e.getIsDead()).length;
    const unclearedDens = this.denPortals.filter(d => !d.isCleared).length;
    
    if (livingEnemies === 0 && unclearedDens === 0) {
      this.isLevelComplete = true;
      this.showVictory();
    }
  }

  private showPauseMenu(): void {
    this.exitDungeon(false);
  }

  private showGameOver(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    
    const gameOverText = this.add.text(centerX, centerY - 50, 'DEFEATED', {
      fontFamily: 'Georgia',
      fontSize: '48px',
      color: '#aa4444',
      stroke: '#000000',
      strokeThickness: 4,
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(201);
    
    const statsText = this.add.text(centerX, centerY + 20, 
      `Gems: ${this.runStats.gemsCollected} | Enemies: ${this.runStats.enemiesDefeated} | Dens: ${this.runStats.densCleared}`, {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#8a8a9a',
    });
    statsText.setOrigin(0.5);
    statsText.setScrollFactor(0);
    statsText.setDepth(201);
    
    const returnText = this.add.text(centerX, centerY + 80, '[ Click to Return ]', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#6a6a8a',
    });
    returnText.setOrigin(0.5);
    returnText.setScrollFactor(0);
    returnText.setDepth(201);
    returnText.setInteractive({ useHandCursor: true });
    
    returnText.on('pointerover', () => returnText.setColor('#8b7355'));
    returnText.on('pointerout', () => returnText.setColor('#6a6a8a'));
    returnText.on('pointerdown', () => this.exitDungeon(false));
  }

  private showVictory(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    
    const victoryText = this.add.text(centerX, centerY - 50, 'DUNGEON CLEARED!', {
      fontFamily: 'Georgia',
      fontSize: '42px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    victoryText.setOrigin(0.5);
    victoryText.setScrollFactor(0);
    victoryText.setDepth(201);
    
    this.tweens.add({
      targets: victoryText,
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });
    
    const duration = Math.floor((Date.now() - this.runStats.startTime) / 1000);
    const statsText = this.add.text(centerX, centerY + 20, 
      `Time: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n` +
      `Gems: ${this.runStats.gemsCollected} | Enemies: ${this.runStats.enemiesDefeated} | Dens: ${this.runStats.densCleared}`, {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#8b7355',
      align: 'center',
    });
    statsText.setOrigin(0.5);
    statsText.setScrollFactor(0);
    statsText.setDepth(201);
    
    const returnText = this.add.text(centerX, centerY + 100, '[ Click to Continue ]', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#6a6a8a',
    });
    returnText.setOrigin(0.5);
    returnText.setScrollFactor(0);
    returnText.setDepth(201);
    returnText.setInteractive({ useHandCursor: true });
    
    returnText.on('pointerover', () => returnText.setColor('#8b7355'));
    returnText.on('pointerout', () => returnText.setColor('#6a6a8a'));
    returnText.on('pointerdown', () => this.exitDungeon(true));
  }

  private exitDungeon(completed: boolean): void {
    if (this.currentLevel) {
      SaveService.commitRun({
        levelId: this.currentLevel.id,
        completed,
        gemsCollected: this.runStats.gemsCollected,
        enemiesDefeated: this.runStats.enemiesDefeated,
        bossDefeated: completed,
        lootObtained: [],
        duration: Date.now() - this.runStats.startTime,
      });
    }
    
    this.inventorySystem.save();
    this.cleanup();
    
    // Clear saved dungeon state
    this.registry.remove('dungeonState');
    
    this.cameras.main.fadeOut(500, 10, 10, 15);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.HOME_MAP);
    });
  }

  private cleanup(): void {
    this.scene.stop(SCENE_KEYS.UI);
    
    this.game.events.off(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDeath, this);
    this.game.events.off(GAME_EVENTS.ENEMY_DIED, this.handleEnemyDeath, this);
    this.game.events.off(GAME_EVENTS.PLAYER_HEALED, this.updateHealthBar, this);
    
    this.lootSystem.destroy();
    this.inventorySystem.destroy();
    
    this.clearPopup();
    
    this.enemies = [];
    this.torches = [];
    this.grassPatches = [];
    this.bats = [];
    this.chests = [];
    this.denPortals = [];
  }
}
