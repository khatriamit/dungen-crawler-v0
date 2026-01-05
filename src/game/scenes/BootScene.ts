import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG } from '../types';

/**
 * BootScene - The very first scene
 * 
 * Responsibilities:
 * - Set up game configuration
 * - Show minimal loading indicator
 * - Transition to PreloadScene
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // Load only the essential assets needed for the loading screen
    // The main asset loading happens in PreloadScene
    this.createPlaceholderAssets();
  }

  create(): void {
    // Set game scale and rendering preferences
    this.scale.setGameSize(GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    
    // Configure pixel-perfect rendering (WebGL only)
    if (this.game.renderer.type === Phaser.WEBGL) {
      // Pipeline configuration would go here for WebGL renderer
    }
    
    // Set up any global game settings
    this.setupGlobalSettings();

    // Hide the HTML loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    // Transition to preload scene
    console.log('[BootScene] Initialization complete, starting PreloadScene');
    this.scene.start(SCENE_KEYS.PRELOAD);
  }

  /**
   * Create placeholder graphics for assets we'll need
   * These will be replaced with actual assets in production
   */
  private createPlaceholderAssets(): void {
    // Create a simple pixel texture for testing
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Loading bar background
    graphics.fillStyle(0x1a1a2e);
    graphics.fillRect(0, 0, 300, 30);
    graphics.generateTexture('loading_bar_bg', 300, 30);
    graphics.clear();

    // Loading bar fill
    graphics.fillStyle(0x8b7355);
    graphics.fillRect(0, 0, 300, 30);
    graphics.generateTexture('loading_bar_fill', 300, 30);
    graphics.clear();

    // Simple white pixel for various uses
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture('pixel', 1, 1);
    graphics.clear();

    graphics.destroy();
  }

  /**
   * Set up global game settings
   */
  private setupGlobalSettings(): void {
    // Store references in registry for global access
    this.registry.set('gameStarted', false);
    this.registry.set('currentLevel', null);
    this.registry.set('debugMode', false);
    
    // Set default game data
    this.registry.set('playerData', {
      gems: 0,
      level: 1,
      experience: 0,
    });
  }
}
