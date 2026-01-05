import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG } from '../types';
import { SaveService } from '../services/SaveService';

/**
 * PreloadScene - Asset loading screen
 * 
 * Responsibilities:
 * - Load all game assets (sprites, audio, tilemaps)
 * - Show loading progress
 * - Initialize services
 * - Transition to HomeMapScene
 */
export class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private skullSprite!: Phaser.GameObjects.Graphics;

  private readonly LOADING_TIPS = [
    'Beware the shadows that move...',
    'The Crypt Lord awaits the brave...',
    'Collect gems to unlock powerful weapons',
    'Every dungeon hides ancient secrets',
    'The deeper you go, the darker it gets',
    'Some say treasures lie beyond the abyss',
    'Prepare your inventory before each raid',
    'Only the worthy shall claim the throne',
  ];

  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    this.createLoadingUI();
    this.setupLoadingEvents();
    
    // Load the dungeon sprite sheet
    this.load.image('dungeon_sprites', 'assets/dungeon-sprites.png');
    
    // Load hero sprite sheet as image (will extract frames manually)
    this.load.image('hero_sheet_img', 'assets/hero.png');
    
    // Load monster sprite sheet as image
    this.load.image('monster_sheet_img', 'assets/monster.png');
    
    // Load goblin sprite sheet as image
    this.load.image('goblin_sheet_img', 'assets/goblin.png');
    
    // Load slime sprite sheet as image
    this.load.image('slime_sheet_img', 'assets/slime.png');
    
    this.createPlaceholderAssets();
  }

  create(): void {
    // Extract hero frames and set up animations
    this.setupHeroFrames();
    this.setupHeroAnimations();
    
    // Extract monster frames and set up animations
    this.setupMonsterFrames();
    this.setupMonsterAnimations();
    
    // Extract goblin frames and set up animations
    this.setupGoblinFrames();
    this.setupGoblinAnimations();
    
    // Extract slime frames and set up animations
    this.setupSlimeFrames();
    this.setupSlimeAnimations();
    
    // Initialize sound system
    this.initializeSounds();
    
    // Initialize save service synchronously (don't wait)
    try {
      this.initializeServicesSync();
    } catch (e) {
      console.warn('[PreloadScene] Service init error:', e);
    }
    
    // Start loading sequence immediately
    this.startLoadingSequence();
  }

  /**
   * Synchronous service initialization
   */
  private initializeServicesSync(): void {
    try {
      const stored = localStorage.getItem('dungen_raider_save');
      if (!stored) {
        console.log('[PreloadScene] No save found, will create on first play');
      }
    } catch (e) {
      console.warn('[PreloadScene] localStorage not available:', e);
    }
  }

  /**
   * Start the loading sequence after services are initialized
   */
  private startLoadingSequence(): void {
    let phase = 0;
    const phases = [
      { text: 'Awakening ancient spirits...', duration: 600 },
      { text: 'Mapping the dungeons...', duration: 500 },
      { text: 'Sharpening blades...', duration: 400 },
      { text: 'Opening the gates...', duration: 400 },
    ];

    const showNextPhase = () => {
      if (phase < phases.length) {
        this.showLoadingPhase(phases[phase].text);
        this.time.delayedCall(phases[phase].duration, () => {
          phase++;
          showNextPhase();
        });
      } else {
        this.showReadyState();
      }
    };

    showNextPhase();
  }

  /**
   * Show the ready state and wait for input
   */
  private showReadyState(): void {
    // Final ready state
    this.loadingText.setText('ENTER THE REALM');
    this.loadingText.setColor('#ffd700');
    this.tipText.setText('Click anywhere to begin your journey');
    
    // Pulse animation on ready text
    this.tweens.add({
      targets: this.loadingText,
      alpha: { from: 1, to: 0.5 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Wait for click to proceed
    this.input.once('pointerdown', () => {
      this.transitionToMap();
    });

    // Also allow Enter key
    this.input.keyboard!.once('keydown-ENTER', () => {
      this.transitionToMap();
    });

    // Auto-proceed after 5 seconds if no input
    this.time.delayedCall(5000, () => {
      this.transitionToMap();
    });
  }

  /**
   * Show a loading phase with text
   */
  private showLoadingPhase(text: string): void {
    this.loadingText.setText(text.toUpperCase());
    
    // Show random tip
    const randomTip = this.LOADING_TIPS[Math.floor(Math.random() * this.LOADING_TIPS.length)];
    this.tipText.setText(`"${randomTip}"`);
    
    // Animate skull
    this.tweens.add({
      targets: this.skullSprite,
      angle: { from: -5, to: 5 },
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * Transition to the home map with dramatic effect
   */
  private transitionToMap(): void {
    // Prevent multiple transitions
    this.input.removeAllListeners();

    // Flash effect
    this.cameras.main.flash(300, 139, 115, 85);
    
    // Fade out
    this.time.delayedCall(200, () => {
      this.cameras.main.fadeOut(800, 10, 10, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        console.log('[PreloadScene] Loading complete, starting HomeMapScene');
        this.scene.start(SCENE_KEYS.HOME_MAP);
      });
    });
  }

  /**
   * Create the loading UI elements
   */
  private createLoadingUI(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor(0x0a0a0f);

    // Animated background particles (stars/dust)
    this.createBackgroundParticles();

    // Decorative skull icon
    this.skullSprite = this.createSkullGraphic(centerX, centerY - 140);

    // Title with glow effect
    const titleShadow = this.add.text(centerX + 3, centerY - 68, 'DUNGEN RAIDER', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#1a1a2e',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(centerX, centerY - 70, 'DUNGEN RAIDER', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#8b7355',
      stroke: '#1a1a2e',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(centerX, centerY - 20, '⚔ Into the Depths ⚔', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#5a5a7a',
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);

    // Loading bar background
    const barWidth = 400;
    const barHeight = 20;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;

    // Bar border with glow
    const borderGlow = this.add.graphics();
    borderGlow.lineStyle(4, 0x3a3a5a, 0.3);
    borderGlow.strokeRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);
    
    const border = this.add.graphics();
    border.lineStyle(2, 0x5a5a7a);
    border.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Loading bar (will be updated)
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x8b7355);
    this.loadingBar.fillRect(barX, barY, 0, barHeight);

    // Loading text
    this.loadingText = this.add.text(centerX, barY + 50, 'INITIALIZING', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#8b7355',
      letterSpacing: 4,
    });
    this.loadingText.setOrigin(0.5);

    // Progress percentage
    this.progressText = this.add.text(centerX, barY + barHeight / 2, '0%', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#0a0a0f',
    });
    this.progressText.setOrigin(0.5);

    // Tip text at bottom
    this.tipText = this.add.text(centerX, GAME_CONFIG.HEIGHT - 80, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#4a4a6a',
      fontStyle: 'italic',
      align: 'center',
    });
    this.tipText.setOrigin(0.5);

    // Version text
    const version = this.add.text(GAME_CONFIG.WIDTH - 20, GAME_CONFIG.HEIGHT - 20, 'v1.0.0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#3a3a4a',
    });
    version.setOrigin(1, 1);

    // Decorative elements
    this.createDecorations(centerX, centerY);
  }

  /**
   * Create animated background particles
   */
  private createBackgroundParticles(): void {
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH;
      const y = Math.random() * GAME_CONFIG.HEIGHT;
      const size = 1 + Math.random() * 2;
      const alpha = 0.1 + Math.random() * 0.3;

      const particle = this.add.graphics();
      particle.fillStyle(0x5a5a7a, alpha);
      particle.fillCircle(0, 0, size);
      particle.setPosition(x, y);

      // Floating animation
      this.tweens.add({
        targets: particle,
        y: y - 50 - Math.random() * 50,
        alpha: 0,
        duration: 3000 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 2000,
        onRepeat: () => {
          particle.setPosition(Math.random() * GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT + 10);
          particle.setAlpha(alpha);
        },
      });
    }
  }

  /**
   * Create decorative skull graphic
   */
  private createSkullGraphic(x: number, y: number): Phaser.GameObjects.Graphics {
    const skull = this.add.graphics();
    skull.setPosition(x, y);

    // Skull shape (simplified)
    skull.fillStyle(0x6a6a7a);
    // Head
    skull.fillRoundedRect(-25, -20, 50, 45, 10);
    // Jaw
    skull.fillRect(-18, 20, 36, 15);
    
    // Eye sockets
    skull.fillStyle(0x0a0a0f);
    skull.fillCircle(-10, 0, 8);
    skull.fillCircle(10, 0, 8);
    
    // Nose
    skull.fillTriangle(0, 8, -4, 18, 4, 18);
    
    // Teeth
    skull.fillStyle(0x8a8a9a);
    for (let i = -12; i <= 12; i += 8) {
      skull.fillRect(i - 2, 22, 5, 8);
    }

    // Glow effect
    skull.lineStyle(2, 0x8b7355, 0.3);
    skull.strokeCircle(0, 5, 45);

    return skull;
  }

  /**
   * Create decorative gothic elements
   */
  private createDecorations(centerX: number, centerY: number): void {
    const graphics = this.add.graphics();
    
    // Corner decorations
    const corners = [
      { x: 50, y: 50 },
      { x: GAME_CONFIG.WIDTH - 50, y: 50 },
      { x: 50, y: GAME_CONFIG.HEIGHT - 50 },
      { x: GAME_CONFIG.WIDTH - 50, y: GAME_CONFIG.HEIGHT - 50 },
    ];

    graphics.lineStyle(1, 0x3a3a5a);
    
    corners.forEach(({ x, y }, i) => {
      const size = 30;
      const xDir = i % 2 === 0 ? 1 : -1;
      const yDir = i < 2 ? 1 : -1;
      
      graphics.beginPath();
      graphics.moveTo(x, y + size * yDir);
      graphics.lineTo(x, y);
      graphics.lineTo(x + size * xDir, y);
      graphics.stroke();
    });

    // Divider lines
    graphics.lineStyle(1, 0x2a2a4a);
    graphics.beginPath();
    graphics.moveTo(centerX - 200, centerY - 70);
    graphics.lineTo(centerX - 100, centerY - 70);
    graphics.moveTo(centerX + 100, centerY - 70);
    graphics.lineTo(centerX + 200, centerY - 70);
    graphics.stroke();
  }

  /**
   * Set up loading progress events
   */
  private setupLoadingEvents(): void {
    const barWidth = 400;
    const barHeight = 20;
    const barX = GAME_CONFIG.WIDTH / 2 - barWidth / 2;
    const barY = GAME_CONFIG.HEIGHT / 2 + 50;

    this.load.on('progress', (value: number) => {
      // Update loading bar with gradient effect
      this.loadingBar.clear();
      
      // Background glow
      this.loadingBar.fillStyle(0x4a3a2a, 0.5);
      this.loadingBar.fillRect(barX, barY, barWidth * value, barHeight);
      
      // Main bar
      this.loadingBar.fillStyle(0x8b7355);
      this.loadingBar.fillRect(barX, barY, barWidth * value, barHeight);
      
      // Highlight
      this.loadingBar.fillStyle(0xab9375, 0.5);
      this.loadingBar.fillRect(barX, barY, barWidth * value, barHeight / 3);
      
      // Update percentage text
      this.progressText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.progressText.setText('100%');
      
      // Flash the bar
      this.tweens.add({
        targets: this.loadingBar,
        alpha: { from: 1, to: 0.7 },
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
    });
  }

  /**
   * Create placeholder sprite assets
   * These simulate what real assets would look like
   */
  private createPlaceholderAssets(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const tileSize = GAME_CONFIG.TILE_SIZE;

    // Player placeholder (32x32 blue rectangle with details)
    graphics.fillStyle(0x4a7db8);
    graphics.fillRect(4, 4, 24, 24);
    graphics.fillStyle(0x6a9dd8);
    graphics.fillRect(8, 8, 16, 16);
    graphics.fillStyle(0x2a5d98);
    graphics.fillRect(10, 20, 4, 4);
    graphics.fillRect(18, 20, 4, 4);
    graphics.generateTexture('player', tileSize, tileSize);
    graphics.clear();

    // Enemy placeholder (red)
    graphics.fillStyle(0xb84a4a);
    graphics.fillRect(4, 4, 24, 24);
    graphics.fillStyle(0xd86a6a);
    graphics.fillRect(8, 8, 16, 16);
    graphics.generateTexture('enemy_skeleton', tileSize, tileSize);
    graphics.clear();

    // Boss placeholder (larger, purple)
    graphics.fillStyle(0x6a4ab8);
    graphics.fillRect(0, 0, 48, 48);
    graphics.fillStyle(0x8a6ad8);
    graphics.fillRect(4, 4, 40, 40);
    graphics.fillStyle(0xaa8af8);
    graphics.fillRect(8, 8, 32, 32);
    graphics.generateTexture('boss_cryptlord', 48, 48);
    graphics.clear();

    // Floor tile (dark gray with subtle pattern)
    graphics.fillStyle(0x2a2a3a);
    graphics.fillRect(0, 0, tileSize, tileSize);
    graphics.fillStyle(0x3a3a4a);
    graphics.fillRect(0, 0, 2, 2);
    graphics.fillRect(16, 16, 2, 2);
    graphics.generateTexture('floor', tileSize, tileSize);
    graphics.clear();

    // Wall tile (darker)
    graphics.fillStyle(0x1a1a2a);
    graphics.fillRect(0, 0, tileSize, tileSize);
    graphics.lineStyle(1, 0x2a2a3a);
    graphics.strokeRect(0, 0, tileSize, tileSize);
    graphics.generateTexture('wall', tileSize, tileSize);
    graphics.clear();

    // Gem (small yellow diamond)
    graphics.fillStyle(0xffd700);
    graphics.beginPath();
    graphics.moveTo(8, 0);
    graphics.lineTo(16, 8);
    graphics.lineTo(8, 16);
    graphics.lineTo(0, 8);
    graphics.closePath();
    graphics.fill();
    graphics.generateTexture('gem', 16, 16);
    graphics.clear();

    // Map node (circle)
    graphics.fillStyle(0x8b7355);
    graphics.fillCircle(20, 20, 18);
    graphics.fillStyle(0x6b5335);
    graphics.fillCircle(20, 20, 14);
    graphics.fillStyle(0x8b7355);
    graphics.fillCircle(20, 20, 10);
    graphics.generateTexture('map_node', 40, 40);
    graphics.clear();

    // Locked node (gray circle with X)
    graphics.fillStyle(0x4a4a5a);
    graphics.fillCircle(20, 20, 18);
    graphics.fillStyle(0x3a3a4a);
    graphics.fillCircle(20, 20, 14);
    graphics.lineStyle(3, 0x6a6a7a);
    graphics.beginPath();
    graphics.moveTo(12, 12);
    graphics.lineTo(28, 28);
    graphics.moveTo(28, 12);
    graphics.lineTo(12, 28);
    graphics.stroke();
    graphics.generateTexture('map_node_locked', 40, 40);
    graphics.clear();

    // UI elements
    // Heart icon for health
    graphics.fillStyle(0xcc3333);
    graphics.beginPath();
    graphics.arc(6, 6, 5, Math.PI, 0, false);
    graphics.arc(14, 6, 5, Math.PI, 0, false);
    graphics.lineTo(10, 18);
    graphics.closePath();
    graphics.fill();
    graphics.generateTexture('icon_heart', 20, 20);
    graphics.clear();

    // Sword icon for attack
    graphics.fillStyle(0xaaaaaa);
    graphics.fillRect(8, 0, 4, 16);
    graphics.fillStyle(0x8b7355);
    graphics.fillRect(4, 12, 12, 4);
    graphics.generateTexture('icon_sword', 20, 20);
    graphics.clear();

    // Shield icon for defense
    graphics.fillStyle(0x6688aa);
    graphics.beginPath();
    graphics.moveTo(10, 0);
    graphics.lineTo(20, 4);
    graphics.lineTo(18, 18);
    graphics.lineTo(10, 20);
    graphics.lineTo(2, 18);
    graphics.lineTo(0, 4);
    graphics.closePath();
    graphics.fill();
    graphics.generateTexture('icon_shield', 20, 20);
    graphics.clear();

    graphics.destroy();
  }

  /**
   * Load actual game assets (to be used in production)
   */
  private loadAssets(): void {
    // Sprites
    // this.load.spritesheet('player', 'assets/sprites/player.png', {
    //   frameWidth: 32,
    //   frameHeight: 32,
    // });
    
    // Tilemaps
    // this.load.image('dungeon_tiles', 'assets/tilemaps/dungeon_tiles.png');
    // this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json');
    
    // Audio
    // this.load.audio('music_dungeon', 'assets/audio/dungeon_theme.mp3');
    // this.load.audio('sfx_hit', 'assets/audio/hit.wav');
  }

  /**
   * Initialize game services
   */
  private async initializeServices(): Promise<void> {
    await SaveService.initialize();
    
    // Create new save if none exists
    if (!SaveService.hasSave()) {
      console.log('[PreloadScene] No save found, creating new game');
      await SaveService.createNewSave('player_' + Date.now());
    }
    
    console.log('[PreloadScene] Services initialized');
  }

  /**
   * Set up hero character animations from the spritesheet
   * Spritesheet layout (1536x1024, 8 columns x 3 rows = 192x341 per frame):
   * Row 0 (frames 0-7): Idle standing poses
   * Row 1 (frames 8-15): Walking/running animation  
   * Row 2 (frames 16-23): Sword/shield poses and attack
   */
  private setupHeroFrames(): void {
    const source = this.textures.get('hero_sheet_img').getSourceImage() as HTMLImageElement;
    if (!source || source.width === 0) {
      console.warn('[PreloadScene] Hero sprite sheet not loaded');
      return;
    }

    // Frame dimensions based on 8 columns x 3 rows
    const frameW = 192;
    const frameH = 341;
    const cols = 8;
    const rows = 3;

    // Create a canvas-based texture atlas
    const atlasFrames: Phaser.Types.Textures.SpriteSheetConfig[] = [];
    
    // Extract each frame
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frameIndex = row * cols + col;
        const x = col * frameW;
        const y = row * frameH;
        
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, x, y, frameW, frameH, 0, 0, frameW, frameH);
          this.textures.addCanvas(`hero_frame_${frameIndex}`, canvas);
        }
      }
    }
    
    console.log('[PreloadScene] Hero frames extracted: 24');
  }

  private setupHeroAnimations(): void {
    // Check if frames exist
    if (!this.textures.exists('hero_frame_0')) return;
    if (this.anims.exists('hero_idle')) return;
    
    // Idle animation (first 4 frames)
    this.anims.create({
      key: 'hero_idle',
      frames: [
        { key: 'hero_frame_0' },
        { key: 'hero_frame_1' },
        { key: 'hero_frame_2' },
        { key: 'hero_frame_3' },
      ],
      frameRate: 4,
      repeat: -1,
    });
    
    // Walk/run animation (row 2 - running frames)
    this.anims.create({
      key: 'hero_walk',
      frames: [
        { key: 'hero_frame_11' },
        { key: 'hero_frame_12' },
        { key: 'hero_frame_13' },
        { key: 'hero_frame_14' },
        { key: 'hero_frame_15' },
      ],
      frameRate: 10,
      repeat: -1,
    });
    
    // Attack animation (row 3)
    this.anims.create({
      key: 'hero_attack',
      frames: [
        { key: 'hero_frame_17' },
        { key: 'hero_frame_18' },
        { key: 'hero_frame_19' },
      ],
      frameRate: 10,
      repeat: 0,
    });
    
    console.log('[PreloadScene] Hero animations created');
  }

  /**
   * Extract monster frames from sprite sheet
   * Sprite sheet is 612x408 (5 columns x 3 rows)
   */
  private setupMonsterFrames(): void {
    const source = this.textures.get('monster_sheet_img').getSourceImage() as HTMLImageElement;
    if (!source || source.width === 0) {
      console.warn('[PreloadScene] Monster sprite sheet not loaded');
      return;
    }

    // Frame dimensions: 612/5 = 122.4, 408/3 = 136
    const frameW = 122;
    const frameH = 136;
    const cols = 5;
    const rows = 3;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frameIndex = row * cols + col;
        const x = col * frameW;
        const y = row * frameH;
        
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, x, y, frameW, frameH, 0, 0, frameW, frameH);
          this.textures.addCanvas(`monster_frame_${frameIndex}`, canvas);
        }
      }
    }
    
    console.log('[PreloadScene] Monster frames extracted: 15');
  }

  /**
   * Set up monster animations
   * Row 0 (0-4): Idle/stance
   * Row 1 (5-9): Attack/run
   * Row 2 (10-14): Death
   */
  private setupMonsterAnimations(): void {
    if (!this.textures.exists('monster_frame_0')) return;
    if (this.anims.exists('monster_idle')) return;
    
    // Idle animation
    this.anims.create({
      key: 'monster_idle',
      frames: [
        { key: 'monster_frame_0' },
        { key: 'monster_frame_1' },
        { key: 'monster_frame_2' },
        { key: 'monster_frame_3' },
      ],
      frameRate: 4,
      repeat: -1,
    });
    
    // Walk/attack animation
    this.anims.create({
      key: 'monster_walk',
      frames: [
        { key: 'monster_frame_5' },
        { key: 'monster_frame_6' },
        { key: 'monster_frame_7' },
        { key: 'monster_frame_8' },
      ],
      frameRate: 8,
      repeat: -1,
    });
    
    // Attack animation
    this.anims.create({
      key: 'monster_attack',
      frames: [
        { key: 'monster_frame_5' },
        { key: 'monster_frame_6' },
        { key: 'monster_frame_7' },
      ],
      frameRate: 10,
      repeat: 0,
    });
    
    // Death animation
    this.anims.create({
      key: 'monster_death',
      frames: [
        { key: 'monster_frame_10' },
        { key: 'monster_frame_11' },
        { key: 'monster_frame_12' },
        { key: 'monster_frame_13' },
        { key: 'monster_frame_14' },
      ],
      frameRate: 8,
      repeat: 0,
    });
    
    console.log('[PreloadScene] Monster animations created');
  }

  /**
   * Extract goblin frames from sprite sheet
   * Sprite sheet is 700x400 (4 columns x 2 rows)
   */
  private setupGoblinFrames(): void {
    const source = this.textures.get('goblin_sheet_img').getSourceImage() as HTMLImageElement;
    if (!source || source.width === 0) {
      console.warn('[PreloadScene] Goblin sprite sheet not loaded');
      return;
    }

    // Frame dimensions: 700/4 = 175, 400/2 = 200
    const frameW = 175;
    const frameH = 200;
    const cols = 4;
    const rows = 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frameIndex = row * cols + col;
        const x = col * frameW;
        const y = row * frameH;
        
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, x, y, frameW, frameH, 0, 0, frameW, frameH);
          this.textures.addCanvas(`goblin_frame_${frameIndex}`, canvas);
        }
      }
    }
    
    console.log('[PreloadScene] Goblin frames extracted: 8');
  }

  /**
   * Set up goblin animations
   * Row 0 (0-3): Idle/stance variations
   * Row 1 (4-7): Walk/attack variations
   */
  private setupGoblinAnimations(): void {
    if (!this.textures.exists('goblin_frame_0')) return;
    if (this.anims.exists('goblin_idle')) return;
    
    // Idle animation
    this.anims.create({
      key: 'goblin_idle',
      frames: [
        { key: 'goblin_frame_0' },
        { key: 'goblin_frame_1' },
        { key: 'goblin_frame_2' },
        { key: 'goblin_frame_3' },
      ],
      frameRate: 4,
      repeat: -1,
    });
    
    // Walk animation
    this.anims.create({
      key: 'goblin_walk',
      frames: [
        { key: 'goblin_frame_4' },
        { key: 'goblin_frame_5' },
        { key: 'goblin_frame_6' },
        { key: 'goblin_frame_7' },
      ],
      frameRate: 8,
      repeat: -1,
    });
    
    // Attack animation
    this.anims.create({
      key: 'goblin_attack',
      frames: [
        { key: 'goblin_frame_4' },
        { key: 'goblin_frame_5' },
        { key: 'goblin_frame_6' },
      ],
      frameRate: 10,
      repeat: 0,
    });
    
    console.log('[PreloadScene] Goblin animations created');
  }

  /**
   * Extract slime frames from sprite sheet
   * Sprite sheet is 1536x1024 (4 columns x 2 rows)
   */
  private setupSlimeFrames(): void {
    const source = this.textures.get('slime_sheet_img').getSourceImage() as HTMLImageElement;
    if (!source || source.width === 0) {
      console.warn('[PreloadScene] Slime sprite sheet not loaded');
      return;
    }

    const frameW = 384;
    const frameH = 512;
    const cols = 4;
    const rows = 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frameIndex = row * cols + col;
        const x = col * frameW;
        const y = row * frameH;
        
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, x, y, frameW, frameH, 0, 0, frameW, frameH);
          this.textures.addCanvas(`slime_frame_${frameIndex}`, canvas);
        }
      }
    }
    
    console.log('[PreloadScene] Slime frames extracted: 8');
  }

  /**
   * Set up slime animations
   * Row 0: Green slime growing/bouncing
   * Row 1: Green slime variations + blue slime
   */
  private setupSlimeAnimations(): void {
    if (!this.textures.exists('slime_frame_0')) return;
    if (this.anims.exists('slime_idle')) return;
    
    // Slime idle/bounce animation (green)
    this.anims.create({
      key: 'slime_idle',
      frames: [
        { key: 'slime_frame_0' },
        { key: 'slime_frame_1' },
        { key: 'slime_frame_4' },
        { key: 'slime_frame_5' },
      ],
      frameRate: 4,
      repeat: -1,
    });
    
    // Slime attack/jump (excited animation)
    this.anims.create({
      key: 'slime_attack',
      frames: [
        { key: 'slime_frame_1' },
        { key: 'slime_frame_2' },
        { key: 'slime_frame_3' },
        { key: 'slime_frame_2' },
      ],
      frameRate: 8,
      repeat: 0,
    });
    
    // Slime walk (same as idle but faster)
    this.anims.create({
      key: 'slime_walk',
      frames: [
        { key: 'slime_frame_0' },
        { key: 'slime_frame_1' },
        { key: 'slime_frame_4' },
        { key: 'slime_frame_5' },
      ],
      frameRate: 8,
      repeat: -1,
    });
    
    // Blue slime (elite)
    this.anims.create({
      key: 'slime_blue_idle',
      frames: [
        { key: 'slime_frame_7' },
      ],
      frameRate: 1,
      repeat: -1,
    });
    
    console.log('[PreloadScene] Slime animations created');
  }

  /**
   * Initialize game sounds using Web Audio API
   */
  private initializeSounds(): void {
    // Store sound generators in game registry for global access
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Sound effect generators
    const sounds = {
      // Sword swing
      attack: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      },
      
      // Hit sound
      hit: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      },
      
      // Enemy death
      enemyDeath: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      },
      
      // Player hurt
      playerHurt: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      },
      
      // Pickup item
      pickup: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      },
      
      // Portal enter
      portalEnter: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
        osc2.frequency.setValueAtTime(250, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      },
      
      // Level complete
      levelComplete: () => {
        const ctx = audioContext;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.3);
        });
      },
      
      // Footstep
      footstep: () => {
        const ctx = audioContext;
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      },
      
      // UI click
      uiClick: () => {
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      },
    };
    
    // Store in game registry
    this.game.registry.set('sounds', sounds);
    this.game.registry.set('audioContext', audioContext);
    
    console.log('[PreloadScene] Sound system initialized');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
