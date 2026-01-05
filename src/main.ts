import Phaser from 'phaser';
import { GAME_CONFIG } from './game/types';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { HomeMapScene } from './game/scenes/HomeMapScene';
import { DungeonScene } from './game/scenes/DungeonScene';
import { DenScene } from './game/scenes/DenScene';
import { UIScene } from './game/scenes/UIScene';

/**
 * Dungen Raider - Main Entry Point
 * 
 * A pixel-art dungeon crawler built with Phaser 3 + TypeScript
 * Designed for future blockchain integration
 */

// Phaser game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  pixelArt: true, // Enable crisp pixel rendering
  roundPixels: true, // Prevent sub-pixel rendering
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: GAME_CONFIG.WIDTH / 2,
      height: GAME_CONFIG.HEIGHT / 2,
    },
    max: {
      width: GAME_CONFIG.WIDTH * 2,
      height: GAME_CONFIG.HEIGHT * 2,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // Set to true for collision debugging
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    HomeMapScene,
    DungeonScene,
    DenScene,
    UIScene,
  ],
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

// Create the game instance
const game = new Phaser.Game(config);

// Development helpers
if (import.meta.env.DEV) {
  // Expose game instance for debugging
  (window as unknown as { game: Phaser.Game }).game = game;
  
  console.log('%c🏰 Dungen Raider', 'font-size: 24px; font-weight: bold; color: #8b7355;');
  console.log('%cDevelopment Mode Active', 'font-size: 12px; color: #5a5a7a;');
  console.log('Game instance available as window.game');
}

// Handle visibility change (pause/resume)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.scenes.forEach((scene) => {
      if (scene.scene.isActive()) {
        scene.scene.pause();
      }
    });
  } else {
    game.scene.scenes.forEach((scene) => {
      if (scene.scene.isPaused()) {
        scene.scene.resume();
      }
    });
  }
});

// Export for potential external access
export { game };
