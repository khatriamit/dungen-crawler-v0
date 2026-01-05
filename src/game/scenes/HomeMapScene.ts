import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, LevelData } from '../types';
import { LEVELS } from '../data/levels';
import { SaveService } from '../services/SaveService';
import { EconomyService } from '../services/EconomyService';

/**
 * HomeMapScene - World map / level selection
 * 
 * Features:
 * - Stunning visual world map with 10 levels
 * - Player profile panel with account switching
 * - Animated level nodes with status indicators
 * - Parallax background effects
 */

interface LevelNode {
  level: LevelData;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  isHovered: boolean;
}

interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  gems: number;
  avatar: number;
}

export class HomeMapScene extends Phaser.Scene {
  private levelNodes: LevelNode[] = [];
  private selectedLevel: LevelData | null = null;
  private infoPanel!: Phaser.GameObjects.Container;
  private profilePanel!: Phaser.GameObjects.Container;
  private profileButton!: Phaser.GameObjects.Container;
  private gemsText!: Phaser.GameObjects.Text;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private isProfileOpen = false;
  private particles: Phaser.GameObjects.Graphics[] = [];

  // Mock profiles for demo
  private profiles: PlayerProfile[] = [
    { id: 'player_1', name: 'Shadow Knight', level: 5, gems: 1250, avatar: 0 },
    { id: 'player_2', name: 'Dungeon Master', level: 3, gems: 680, avatar: 1 },
    { id: 'player_3', name: 'New Raider', level: 1, gems: 100, avatar: 2 },
  ];
  private currentProfileIndex = 0;

  constructor() {
    super({ key: SCENE_KEYS.HOME_MAP });
  }

  create(): void {
    console.log('[HomeMapScene] Creating world map');
    
    this.createParallaxBackground();
    this.createAmbientParticles();
    this.createMapFrame();
    this.createLevelPaths();
    this.createLevelNodes();
    this.createHeader();
    this.createInfoPanel();
    this.createProfilePanel();
    this.createFooter();
    
    // Fade in
    this.cameras.main.fadeIn(800, 10, 10, 15);
  }

  update(): void {
    this.updateParticles();
  }

  // ============================================================
  // BACKGROUND & ATMOSPHERE
  // ============================================================

  private createParallaxBackground(): void {
    const width = GAME_CONFIG.WIDTH;
    const height = GAME_CONFIG.HEIGHT;

    // Base dark gradient
    const bg = this.add.graphics();
    const gradientColors = [
      { y: 0, color: 0x0a0810 },
      { y: 0.3, color: 0x0d0a14 },
      { y: 0.6, color: 0x12101a },
      { y: 1, color: 0x1a1525 },
    ];

    gradientColors.forEach((stop, i) => {
      const nextStop = gradientColors[i + 1];
      if (nextStop) {
        bg.fillStyle(stop.color);
        bg.fillRect(0, stop.y * height, width, (nextStop.y - stop.y) * height + 1);
      }
    });

    // Distant mountains silhouette
    const mountains = this.add.graphics();
    mountains.fillStyle(0x15121d, 0.8);
    mountains.beginPath();
    mountains.moveTo(0, height);
    
    const mountainPoints = [
      { x: 0, y: 500 }, { x: 80, y: 380 }, { x: 150, y: 420 },
      { x: 220, y: 320 }, { x: 300, y: 380 }, { x: 400, y: 280 },
      { x: 500, y: 350 }, { x: 580, y: 260 }, { x: 680, y: 320 },
      { x: 780, y: 240 }, { x: 880, y: 300 }, { x: width, y: 350 },
    ];
    
    mountainPoints.forEach(p => mountains.lineTo(p.x, p.y));
    mountains.lineTo(width, height);
    mountains.closePath();
    mountains.fill();

    // Closer mountain layer
    const mountains2 = this.add.graphics();
    mountains2.fillStyle(0x1a1620, 0.9);
    mountains2.beginPath();
    mountains2.moveTo(0, height);
    
    const mountain2Points = [
      { x: 0, y: 550 }, { x: 100, y: 450 }, { x: 200, y: 500 },
      { x: 320, y: 400 }, { x: 450, y: 480 }, { x: 550, y: 380 },
      { x: 650, y: 450 }, { x: 750, y: 360 }, { x: 850, y: 420 },
      { x: width, y: 480 },
    ];
    
    mountain2Points.forEach(p => mountains2.lineTo(p.x, p.y));
    mountains2.lineTo(width, height);
    mountains2.closePath();
    mountains2.fill();

    // Moon
    const moonX = width - 120;
    const moonY = 100;
    
    const moonGlow = this.add.graphics();
    moonGlow.fillStyle(0x8b7355, 0.1);
    moonGlow.fillCircle(moonX, moonY, 80);
    moonGlow.fillStyle(0x8b7355, 0.05);
    moonGlow.fillCircle(moonX, moonY, 120);
    
    const moon = this.add.graphics();
    moon.fillStyle(0xddd8c8);
    moon.fillCircle(moonX, moonY, 35);
    moon.fillStyle(0xccc8b8, 0.5);
    moon.fillCircle(moonX - 8, moonY - 5, 8);
    moon.fillCircle(moonX + 12, moonY + 10, 5);

    this.createStars();

    // Fog layers at bottom
    const fog = this.add.graphics();
    fog.fillStyle(0x1a1a2e, 0.4);
    for (let i = 0; i < 8; i++) {
      const fogY = height - 80 + Math.random() * 60;
      const fogWidth = 150 + Math.random() * 200;
      fog.fillEllipse(Math.random() * width, fogY, fogWidth, 40 + Math.random() * 30);
    }
  }

  private createStars(): void {
    const stars = this.add.graphics();
    
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH;
      const y = Math.random() * (GAME_CONFIG.HEIGHT * 0.5);
      const size = Math.random() < 0.9 ? 1 : 2;
      const alpha = 0.3 + Math.random() * 0.7;
      
      stars.fillStyle(0xffffff, alpha);
      stars.fillCircle(x, y, size);
    }

    this.tweens.add({
      targets: stars,
      alpha: { from: 1, to: 0.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createAmbientParticles(): void {
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics();
      const color = Math.random() > 0.7 ? 0xffaa44 : 0x6a6a8a;
      particle.fillStyle(color, 0.4 + Math.random() * 0.4);
      particle.fillCircle(0, 0, 1 + Math.random() * 2);
      
      particle.setPosition(
        Math.random() * GAME_CONFIG.WIDTH,
        Math.random() * GAME_CONFIG.HEIGHT
      );
      
      particle.setData('speedY', -0.2 - Math.random() * 0.5);
      particle.setData('speedX', (Math.random() - 0.5) * 0.3);
      
      this.particles.push(particle);
    }
  }

  private updateParticles(): void {
    this.particles.forEach(particle => {
      const speedY = particle.getData('speedY');
      const speedX = particle.getData('speedX');
      
      particle.y += speedY;
      particle.x += speedX;
      
      if (particle.y < -10) {
        particle.y = GAME_CONFIG.HEIGHT + 10;
        particle.x = Math.random() * GAME_CONFIG.WIDTH;
      }
    });
  }

  // ============================================================
  // MAP FRAME & DECORATIONS
  // ============================================================

  private createMapFrame(): void {
    const frame = this.add.graphics();
    
    frame.lineStyle(6, 0x3a3a5a, 0.3);
    frame.strokeRect(15, 75, GAME_CONFIG.WIDTH - 30, GAME_CONFIG.HEIGHT - 135);
    
    frame.lineStyle(2, 0x5a5a7a);
    frame.strokeRect(20, 80, GAME_CONFIG.WIDTH - 40, GAME_CONFIG.HEIGHT - 140);
    
    frame.lineStyle(1, 0x3a3a5a);
    frame.strokeRect(25, 85, GAME_CONFIG.WIDTH - 50, GAME_CONFIG.HEIGHT - 150);

    this.createCornerDecorations(frame);
    this.createTitleBanner();
  }

  private createCornerDecorations(graphics: Phaser.GameObjects.Graphics): void {
    const corners = [
      { x: 20, y: 80, rot: 0 },
      { x: GAME_CONFIG.WIDTH - 20, y: 80, rot: 90 },
      { x: GAME_CONFIG.WIDTH - 20, y: GAME_CONFIG.HEIGHT - 60, rot: 180 },
      { x: 20, y: GAME_CONFIG.HEIGHT - 60, rot: 270 },
    ];

    corners.forEach(corner => {
      const size = 25;
      const x = corner.x;
      const y = corner.y;
      const xDir = corner.rot === 0 || corner.rot === 270 ? 1 : -1;
      const yDir = corner.rot < 180 ? 1 : -1;

      graphics.lineStyle(2, 0x8b7355);
      graphics.beginPath();
      graphics.moveTo(x, y + size * yDir);
      graphics.lineTo(x, y);
      graphics.lineTo(x + size * xDir, y);
      graphics.stroke();

      graphics.lineStyle(1, 0x6b5335);
      graphics.beginPath();
      graphics.moveTo(x, y + (size - 8) * yDir);
      graphics.lineTo(x, y + 4 * yDir);
      graphics.lineTo(x + 4 * xDir, y + 4 * yDir);
      graphics.lineTo(x + (size - 8) * xDir, y);
      graphics.stroke();

      graphics.fillStyle(0x8b7355);
      graphics.fillCircle(x + 5 * xDir, y + 5 * yDir, 3);
    });
  }

  private createTitleBanner(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    
    const banner = this.add.graphics();
    banner.fillStyle(0x1a1525, 0.95);
    banner.fillRect(centerX - 180, 82, 360, 45);
    
    banner.lineStyle(2, 0x5a5a7a);
    banner.beginPath();
    banner.moveTo(centerX - 180, 82);
    banner.lineTo(centerX - 200, 104);
    banner.lineTo(centerX - 180, 127);
    banner.lineTo(centerX + 180, 127);
    banner.lineTo(centerX + 200, 104);
    banner.lineTo(centerX + 180, 82);
    banner.closePath();
    banner.stroke();
    
    banner.fillStyle(0x1a1525, 0.9);
    banner.fill();

    const title = this.add.text(centerX, 104, '⚔  REALM OF SHADOWS  ⚔', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#8b7355',
      stroke: '#0a0a0f',
      strokeThickness: 2,
    });
    title.setOrigin(0.5);
  }

  // ============================================================
  // HEADER (Stats & Profile Button)
  // ============================================================

  private createHeader(): void {
    const saveData = SaveService.getSaveData();
    
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0a0a0f, 0.9);
    headerBg.fillRect(0, 0, GAME_CONFIG.WIDTH, 75);
    headerBg.lineStyle(1, 0x3a3a5a);
    headerBg.lineBetween(0, 75, GAME_CONFIG.WIDTH, 75);

    this.createProfileButton();
    this.createGemsDisplay(saveData?.playerStats.gems ?? 0);

    const completed = saveData?.completedLevels.length ?? 0;
    const total = LEVELS.length;
    
    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x1a1a2e, 0.8);
    progressBg.fillRoundedRect(GAME_CONFIG.WIDTH / 2 - 80, 20, 160, 35, 6);
    
    const progressText = this.add.text(GAME_CONFIG.WIDTH / 2, 30, `DUNGEONS`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#5a5a7a',
    });
    progressText.setOrigin(0.5);

    const progressCount = this.add.text(GAME_CONFIG.WIDTH / 2, 45, `${completed} / ${total}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#8b7355',
    });
    progressCount.setOrigin(0.5);
  }

  private createProfileButton(): void {
    this.profileButton = this.add.container(100, 38);
    
    const profile = this.profiles[this.currentProfileIndex];
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(-80, -28, 160, 56, 8);
    bg.lineStyle(2, 0x3a3a5a);
    bg.strokeRoundedRect(-80, -28, 160, 56, 8);
    this.profileButton.add(bg);

    const avatar = this.createAvatarGraphic(-55, 0, profile.avatar, 20);
    this.profileButton.add(avatar);

    const nameText = this.add.text(-30, -10, profile.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#c0b090',
    });
    nameText.setName('profileName');
    this.profileButton.add(nameText);

    const levelText = this.add.text(-30, 8, `Level ${profile.level}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#6a6a8a',
    });
    levelText.setName('profileLevel');
    this.profileButton.add(levelText);

    const arrow = this.add.text(65, 0, '▼', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#5a5a7a',
    });
    arrow.setOrigin(0.5);
    this.profileButton.add(arrow);

    const hitArea = this.add.rectangle(0, 0, 160, 56);
    hitArea.setInteractive({ useHandCursor: true });
    this.profileButton.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a2a3e, 0.95);
      bg.fillRoundedRect(-80, -28, 160, 56, 8);
      bg.lineStyle(2, 0x5a5a7a);
      bg.strokeRoundedRect(-80, -28, 160, 56, 8);
    });

    hitArea.on('pointerout', () => {
      if (!this.isProfileOpen) {
        bg.clear();
        bg.fillStyle(0x1a1a2e, 0.9);
        bg.fillRoundedRect(-80, -28, 160, 56, 8);
        bg.lineStyle(2, 0x3a3a5a);
        bg.strokeRoundedRect(-80, -28, 160, 56, 8);
      }
    });

    hitArea.on('pointerdown', () => {
      this.toggleProfilePanel();
    });
  }

  private createGemsDisplay(gems: number): void {
    const x = GAME_CONFIG.WIDTH - 120;
    const y = 38;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(x - 60, y - 20, 120, 40, 6);
    bg.lineStyle(1, 0x3a3a5a);
    bg.strokeRoundedRect(x - 60, y - 20, 120, 40, 6);

    const gem = this.add.sprite(x - 35, y, 'gem');
    gem.setScale(1.5);
    
    this.tweens.add({
      targets: gem,
      scale: { from: 1.5, to: 1.7 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.gemsText = this.add.text(x - 10, y, EconomyService.formatGems(gems), {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffd700',
    });
    this.gemsText.setOrigin(0, 0.5);
  }

  // ============================================================
  // PROFILE PANEL
  // ============================================================

  private createProfilePanel(): void {
    this.profilePanel = this.add.container(100, 100);
    this.profilePanel.setVisible(false);
    this.profilePanel.setDepth(100);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x12101a, 0.98);
    panelBg.fillRoundedRect(-90, 0, 180, 200, 8);
    panelBg.lineStyle(2, 0x5a5a7a);
    panelBg.strokeRoundedRect(-90, 0, 180, 200, 8);
    this.profilePanel.add(panelBg);

    const title = this.add.text(0, 15, 'SWITCH PROFILE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#6a6a8a',
      letterSpacing: 2,
    });
    title.setOrigin(0.5);
    this.profilePanel.add(title);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x3a3a5a);
    divider.lineBetween(-70, 35, 70, 35);
    this.profilePanel.add(divider);

    this.profiles.forEach((profile, index) => {
      const y = 55 + index * 50;
      this.createProfileOption(profile, index, y);
    });

    const addBtn = this.add.text(0, 175, '+ Add Profile', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a7a5a',
    });
    addBtn.setOrigin(0.5);
    addBtn.setInteractive({ useHandCursor: true });
    addBtn.on('pointerover', () => addBtn.setColor('#7aaa7a'));
    addBtn.on('pointerout', () => addBtn.setColor('#5a7a5a'));
    addBtn.on('pointerdown', () => {
      console.log('Add new profile clicked');
    });
    this.profilePanel.add(addBtn);
  }

  private createProfileOption(profile: PlayerProfile, index: number, y: number): void {
    const container = this.add.container(0, y);
    
    const isSelected = index === this.currentProfileIndex;
    
    const bg = this.add.graphics();
    bg.fillStyle(isSelected ? 0x2a2a4a : 0x1a1a2e, 0.8);
    bg.fillRoundedRect(-75, -18, 150, 40, 4);
    if (isSelected) {
      bg.lineStyle(1, 0x8b7355);
      bg.strokeRoundedRect(-75, -18, 150, 40, 4);
    }
    container.add(bg);

    const avatar = this.createAvatarGraphic(-50, 0, profile.avatar, 14);
    container.add(avatar);

    const name = this.add.text(-30, -8, profile.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: isSelected ? '#c0b090' : '#8a8a9a',
    });
    container.add(name);

    const stats = this.add.text(-30, 6, `Lv.${profile.level} • ${profile.gems}💎`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#5a5a7a',
    });
    container.add(stats);

    if (isSelected) {
      const check = this.add.text(60, 0, '✓', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#8b7355',
      });
      check.setOrigin(0.5);
      container.add(check);
    }

    const hitArea = this.add.rectangle(0, 0, 150, 40);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      if (index !== this.currentProfileIndex) {
        bg.clear();
        bg.fillStyle(0x2a2a3e, 0.9);
        bg.fillRoundedRect(-75, -18, 150, 40, 4);
      }
    });

    hitArea.on('pointerout', () => {
      if (index !== this.currentProfileIndex) {
        bg.clear();
        bg.fillStyle(0x1a1a2e, 0.8);
        bg.fillRoundedRect(-75, -18, 150, 40, 4);
      }
    });

    hitArea.on('pointerdown', () => {
      if (index !== this.currentProfileIndex) {
        this.switchProfile(index);
      }
    });

    this.profilePanel.add(container);
  }

  private createAvatarGraphic(x: number, y: number, avatarIndex: number, radius: number): Phaser.GameObjects.Graphics {
    const avatar = this.add.graphics();
    avatar.setPosition(x, y);

    const avatarColors = [
      { bg: 0x4a7db8, accent: 0x6a9dd8 },
      { bg: 0x7d4ab8, accent: 0x9d6ad8 },
      { bg: 0x4ab87d, accent: 0x6ad89d },
      { bg: 0xb84a4a, accent: 0xd86a6a },
      { bg: 0xb8a44a, accent: 0xd8c46a },
      { bg: 0x4ab8b8, accent: 0x6ad8d8 },
    ];

    const colors = avatarColors[avatarIndex % avatarColors.length];

    avatar.fillStyle(colors.bg);
    avatar.fillCircle(0, 0, radius);
    
    avatar.fillStyle(colors.accent);
    avatar.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.6);

    avatar.lineStyle(2, 0x8b7355);
    avatar.strokeCircle(0, 0, radius);

    return avatar;
  }

  private toggleProfilePanel(): void {
    this.isProfileOpen = !this.isProfileOpen;
    
    if (this.isProfileOpen) {
      this.profilePanel.setVisible(true);
      this.profilePanel.setAlpha(0);
      this.profilePanel.setY(80);
      
      this.tweens.add({
        targets: this.profilePanel,
        alpha: 1,
        y: 100,
        duration: 200,
        ease: 'Back.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.profilePanel,
        alpha: 0,
        y: 80,
        duration: 150,
        onComplete: () => {
          this.profilePanel.setVisible(false);
        },
      });
    }
  }

  private switchProfile(index: number): void {
    console.log(`Switching to profile: ${this.profiles[index].name}`);
    this.currentProfileIndex = index;
    
    this.toggleProfilePanel();
    
    const nameText = this.profileButton.getByName('profileName') as Phaser.GameObjects.Text;
    const levelText = this.profileButton.getByName('profileLevel') as Phaser.GameObjects.Text;
    const profile = this.profiles[index];
    
    nameText.setText(profile.name);
    levelText.setText(`Level ${profile.level}`);
    this.gemsText.setText(EconomyService.formatGems(profile.gems));

    this.profilePanel.destroy();
    this.createProfilePanel();
  }

  // ============================================================
  // LEVEL PATHS
  // ============================================================

  private createLevelPaths(): void {
    this.pathGraphics = this.add.graphics();

    for (let i = 0; i < LEVELS.length - 1; i++) {
      const current = LEVELS[i];
      const next = LEVELS[i + 1];
      const saveData = SaveService.getSaveData();
      const isUnlocked = saveData?.unlockedLevels.includes(next.id) ?? false;
      
      this.drawPath(current.position, next.position, isUnlocked);
    }
  }

  private drawPath(from: { x: number; y: number }, to: { x: number; y: number }, unlocked: boolean): void {
    const color = unlocked ? 0x6a5a4a : 0x2a2a3a;
    const alpha = unlocked ? 0.8 : 0.4;
    
    this.pathGraphics.lineStyle(3, color, alpha);

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const offset = (Math.random() - 0.5) * 40;
    const controlX = midX + offset;
    const controlY = midY - 30;

    const segments = 15;
    for (let i = 0; i < segments; i += 2) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      
      const p1 = this.getQuadraticPoint(from.x, from.y, controlX, controlY, to.x, to.y, t1);
      const p2 = this.getQuadraticPoint(from.x, from.y, controlX, controlY, to.x, to.y, t2);
      
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(p1.x, p1.y);
      this.pathGraphics.lineTo(p2.x, p2.y);
      this.pathGraphics.stroke();
    }
  }

  private getQuadraticPoint(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, t: number): { x: number; y: number } {
    const mt = 1 - t;
    return {
      x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
      y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
    };
  }

  // ============================================================
  // LEVEL NODES
  // ============================================================

  private createLevelNodes(): void {
    const saveData = SaveService.getSaveData();
    
    LEVELS.forEach((level) => {
      const isUnlocked = saveData?.unlockedLevels.includes(level.id) ?? level.id === 1;
      const isCompleted = saveData?.completedLevels.includes(level.id) ?? false;
      
      const node = this.createLevelNode(level, isUnlocked, isCompleted);
      this.levelNodes.push(node);
    });
  }

  private createLevelNode(level: LevelData, isUnlocked: boolean, isCompleted: boolean): LevelNode {
    const { x, y } = level.position;
    
    const container = this.add.container(x, y);

    const glow = this.add.graphics();
    if (isUnlocked) {
      const glowColor = isCompleted ? 0x44aa44 : 0x8b7355;
      glow.fillStyle(glowColor, 0.2);
      glow.fillCircle(0, 0, 35);
      glow.fillStyle(glowColor, 0.1);
      glow.fillCircle(0, 0, 45);
      
      this.tweens.add({
        targets: glow,
        alpha: { from: 1, to: 0.5 },
        scale: { from: 1, to: 1.1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    container.add(glow);

    const sprite = this.add.graphics();
    
    if (isUnlocked) {
      const baseColor = isCompleted ? 0x3a6a3a : 0x4a3a2a;
      const topColor = isCompleted ? 0x5aaa5a : 0x8b7355;
      const highlightColor = isCompleted ? 0x7aca7a : 0xab9375;
      
      sprite.fillStyle(0x0a0a0f, 0.5);
      sprite.fillEllipse(0, 5, 50, 20);
      
      sprite.fillStyle(baseColor);
      sprite.fillCircle(0, 0, 22);
      sprite.fillStyle(topColor);
      sprite.fillCircle(0, 0, 18);
      
      sprite.fillStyle(highlightColor, 0.6);
      sprite.fillCircle(-5, -5, 8);
      
      sprite.lineStyle(2, 0xffd700, isCompleted ? 1 : 0.7);
      sprite.strokeCircle(0, 0, 22);
    } else {
      sprite.fillStyle(0x0a0a0f, 0.5);
      sprite.fillEllipse(0, 5, 45, 18);
      
      sprite.fillStyle(0x2a2a3a);
      sprite.fillCircle(0, 0, 20);
      sprite.fillStyle(0x3a3a4a);
      sprite.fillCircle(0, 0, 16);
      
      sprite.fillStyle(0x5a5a6a);
      sprite.fillRect(-6, -2, 12, 10);
      sprite.lineStyle(2, 0x5a5a6a);
      sprite.strokeCircle(0, -6, 5);
      
      sprite.lineStyle(1, 0x4a4a5a);
      sprite.strokeCircle(0, 0, 20);
    }
    container.add(sprite);

    const label = this.add.text(0, 0, level.id.toString(), {
      fontFamily: 'Georgia, serif',
      fontSize: isUnlocked ? '18px' : '14px',
      fontStyle: 'bold',
      color: isUnlocked ? (isCompleted ? '#aaffaa' : '#ffd700') : '#4a4a5a',
      stroke: '#0a0a0f',
      strokeThickness: 3,
    });
    label.setOrigin(0.5);
    if (!isUnlocked) label.setVisible(false);
    container.add(label);

    if (isCompleted) {
      const check = this.add.graphics();
      check.fillStyle(0x44aa44);
      check.fillCircle(18, -15, 10);
      check.lineStyle(2, 0xffffff);
      check.beginPath();
      check.moveTo(13, -15);
      check.lineTo(17, -11);
      check.lineTo(24, -19);
      check.stroke();
      container.add(check);
    }

    const nameText = this.add.text(0, 35, level.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: isUnlocked ? '#a09080' : '#4a4a5a',
      align: 'center',
      stroke: '#0a0a0f',
      strokeThickness: 2,
    });
    nameText.setOrigin(0.5);
    nameText.setWordWrapWidth(100);
    container.add(nameText);

    if (isUnlocked) {
      const hitArea = this.add.circle(0, 0, 25);
      hitArea.setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scale: 1.15,
          duration: 150,
          ease: 'Back.easeOut',
        });
        this.showLevelInfo(level);
      });

      hitArea.on('pointerout', () => {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 100,
        });
        this.hideLevelInfo();
      });

      hitArea.on('pointerdown', () => {
        this.selectLevel(level);
      });
    }

    return {
      level,
      container,
      sprite,
      glow,
      label,
      isHovered: false,
    };
  }

  // ============================================================
  // INFO PANEL
  // ============================================================

  private createInfoPanel(): void {
    this.infoPanel = this.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 100);
    this.infoPanel.setVisible(false);
    this.infoPanel.setDepth(50);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x12101a, 0.95);
    panelBg.fillRoundedRect(-220, -35, 440, 70, 10);
    
    panelBg.lineStyle(2, 0x5a5a7a);
    panelBg.strokeRoundedRect(-220, -35, 440, 70, 10);
    
    panelBg.lineStyle(1, 0x8b7355, 0.3);
    panelBg.strokeRoundedRect(-215, -30, 430, 60, 8);
    
    this.infoPanel.add(panelBg);

    const levelName = this.add.text(0, -18, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c0b090',
    });
    levelName.setOrigin(0.5);
    levelName.setName('levelName');
    this.infoPanel.add(levelName);

    const levelDesc = this.add.text(0, 2, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#6a6a8a',
      fontStyle: 'italic',
    });
    levelDesc.setOrigin(0.5);
    levelDesc.setName('levelDesc');
    this.infoPanel.add(levelDesc);

    const levelStats = this.add.text(0, 20, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#8b7355',
    });
    levelStats.setOrigin(0.5);
    levelStats.setName('levelStats');
    this.infoPanel.add(levelStats);
  }

  private showLevelInfo(level: LevelData): void {
    this.selectedLevel = level;
    
    const levelName = this.infoPanel.getByName('levelName') as Phaser.GameObjects.Text;
    const levelDesc = this.infoPanel.getByName('levelDesc') as Phaser.GameObjects.Text;
    const levelStats = this.infoPanel.getByName('levelStats') as Phaser.GameObjects.Text;

    levelName.setText(`⚔ ${level.name} ⚔`);
    levelDesc.setText(level.description);
    
    const stars = '★'.repeat(level.difficulty) + '☆'.repeat(5 - level.difficulty);
    levelStats.setText(`Difficulty: ${stars}  │  Rooms: ${level.roomCount}  │  [ CLICK TO ENTER ]`);

    this.infoPanel.setVisible(true);
    this.infoPanel.setAlpha(0);
    this.infoPanel.setY(GAME_CONFIG.HEIGHT - 90);
    
    this.tweens.add({
      targets: this.infoPanel,
      alpha: 1,
      y: GAME_CONFIG.HEIGHT - 100,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private hideLevelInfo(): void {
    this.tweens.add({
      targets: this.infoPanel,
      alpha: 0,
      y: GAME_CONFIG.HEIGHT - 90,
      duration: 150,
      onComplete: () => {
        this.infoPanel.setVisible(false);
        this.selectedLevel = null;
      },
    });
  }

  // ============================================================
  // LEVEL SELECTION
  // ============================================================

  private selectLevel(level: LevelData): void {
    console.log(`[HomeMapScene] Selected level: ${level.name}`);
    
    this.registry.set('currentLevel', level);
    
    const node = this.levelNodes.find((n) => n.level.id === level.id);
    if (node) {
      this.tweens.add({
        targets: node.container,
        scale: 1.3,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.flash(300, 139, 115, 85, false);
          
          this.time.delayedCall(200, () => {
            this.cameras.main.fadeOut(600, 10, 10, 15);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start(SCENE_KEYS.DUNGEON, { level });
            });
          });
        },
      });
    }
  }

  // ============================================================
  // FOOTER
  // ============================================================

  private createFooter(): void {
    const footerText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT - 25,
      'Hover over a dungeon to see details • Click to begin your raid',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#4a4a5a',
        fontStyle: 'italic',
      }
    );
    footerText.setOrigin(0.5);
  }
}
