import Phaser from 'phaser';
import { GAME_CONFIG, LevelData } from '../types';

/**
 * DungeonGenerationSystem - Enhanced Version
 * 
 * Generates large procedural dungeon layouts with:
 * - Multiple connected rooms of varying sizes
 * - Den portals leading to sub-dungeons
 * - Environmental decorations (torches, grass, bones, water)
 * - Treasure chests
 * - Enemy spawn points
 * - Bat spawn areas
 */

export interface DungeonRoom {
  id: string;
  type: 'start' | 'normal' | 'treasure' | 'boss' | 'corridor' | 'den_room';
  x: number;
  y: number;
  width: number;
  height: number;
  enemies: { x: number; y: number; type: string }[];
  items: { x: number; y: number }[];
  exits: { direction: 'north' | 'south' | 'east' | 'west'; targetRoom: string }[];
  cleared: boolean;
}

export interface DungeonTile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'door' | 'spawn' | 'exit' | 'water';
  roomId: string;
  variant?: number;
}

export interface EnvironmentSpawn {
  x: number;
  y: number;
  type: 'torch' | 'grass' | 'bones' | 'skull' | 'pile' | 'water' | 'chest_common' | 'chest_rare' | 'chest_epic';
}

export interface DenSpawn {
  x: number;
  y: number;
  denType: 'monster' | 'treasure' | 'boss';
}

export interface BatZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GeneratedDungeon {
  rooms: Map<string, DungeonRoom>;
  tiles: DungeonTile[][];
  startRoom: string;
  bossRoom: string;
  width: number;
  height: number;
  environmentSpawns: EnvironmentSpawn[];
  denSpawns: DenSpawn[];
  batZones: BatZone[];
}

export class DungeonGenerationSystem {
  private scene: Phaser.Scene;
  private tileSize: number;
  private dungeonWidth: number;
  private dungeonHeight: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tileSize = GAME_CONFIG.TILE_SIZE;
    // Much larger dungeon
    this.dungeonWidth = 100;
    this.dungeonHeight = 80;
  }

  /**
   * Generate a complete dungeon for a level
   */
  generate(level: LevelData): GeneratedDungeon {
    const rooms = new Map<string, DungeonRoom>();
    const tiles: DungeonTile[][] = this.createEmptyTileMap();
    const environmentSpawns: EnvironmentSpawn[] = [];
    const denSpawns: DenSpawn[] = [];
    const batZones: BatZone[] = [];
    
    // Scale room count based on level difficulty
    const baseRoomCount = level.roomCount;
    const actualRoomCount = baseRoomCount + Math.floor(level.difficulty * 2);
    
    // Generate rooms
    const generatedRooms = this.generateRooms(actualRoomCount, level.difficulty);
    
    // Place rooms on tile map
    generatedRooms.forEach(room => {
      rooms.set(room.id, room);
      this.placeRoom(tiles, room);
    });
    
    // Connect rooms with corridors
    this.connectRooms(tiles, generatedRooms);
    
    // Add water puddles in some corridors
    this.addWaterPuddles(tiles);
    
    // Generate environment spawns
    this.generateEnvironmentSpawns(tiles, generatedRooms, environmentSpawns);
    
    // Generate den portals
    this.generateDenSpawns(tiles, generatedRooms, denSpawns, level.difficulty);
    
    // Generate bat zones
    this.generateBatZones(generatedRooms, batZones);
    
    // Find start and boss rooms
    const startRoom = generatedRooms.find(r => r.type === 'start')!.id;
    const bossRoom = generatedRooms.find(r => r.type === 'boss')!.id;
    
    return {
      rooms,
      tiles,
      startRoom,
      bossRoom,
      width: this.dungeonWidth,
      height: this.dungeonHeight,
      environmentSpawns,
      denSpawns,
      batZones,
    };
  }

  /**
   * Create empty tile map filled with walls
   */
  private createEmptyTileMap(): DungeonTile[][] {
    const tiles: DungeonTile[][] = [];
    
    for (let y = 0; y < this.dungeonHeight; y++) {
      tiles[y] = [];
      for (let x = 0; x < this.dungeonWidth; x++) {
        tiles[y][x] = {
          x,
          y,
          type: 'wall',
          roomId: '',
          variant: Math.floor(Math.random() * 4),
        };
      }
    }
    
    return tiles;
  }

  /**
   * Generate room layouts with more variety
   */
  private generateRooms(count: number, difficulty: number): DungeonRoom[] {
    const rooms: DungeonRoom[] = [];
    const padding = 4;
    
    // Create larger start room
    const startRoom = this.createRoom(
      'room_start',
      'start',
      padding + 2,
      Math.floor(this.dungeonHeight / 2) - 8,
      14,
      14
    );
    rooms.push(startRoom);
    
    // Create a winding path of rooms
    let lastRoom = startRoom;
    const horizontalSpacing = Math.floor((this.dungeonWidth - padding * 2 - 20) / (count - 1));
    
    // Track positions to avoid overlap
    const usedPositions: { x: number; y: number; w: number; h: number }[] = [
      { x: startRoom.x, y: startRoom.y, w: startRoom.width, h: startRoom.height }
    ];
    
    for (let i = 1; i < count - 1; i++) {
      // Vary room sizes more
      const roomWidth = 10 + Math.floor(Math.random() * 8);
      const roomHeight = 10 + Math.floor(Math.random() * 8);
      
      // Winding path - alternate between upper and lower areas
      const verticalOffset = Math.floor(Math.sin(i * 0.7) * 20);
      let roomX = Math.floor(padding + i * horizontalSpacing + Math.floor(Math.random() * 6) - 3);
      let roomY = Math.floor(this.dungeonHeight / 2 - roomHeight / 2 + verticalOffset);
      
      // Clamp to bounds - ensure rooms stay well within dungeon
      roomX = Math.floor(Math.max(padding, Math.min(this.dungeonWidth - roomWidth - padding, roomX)));
      roomY = Math.floor(Math.max(padding, Math.min(this.dungeonHeight - roomHeight - padding, roomY)));
      
      // Determine room type
      let roomType: DungeonRoom['type'] = 'normal';
      if (Math.random() < 0.15) {
        roomType = 'treasure';
      }
      
      const room = this.createRoom(
        `room_${i}`,
        roomType,
        roomX,
        roomY,
        roomWidth,
        roomHeight,
        difficulty
      );
      
      // Connect to previous room
      room.exits.push({
        direction: 'west',
        targetRoom: lastRoom.id,
      });
      lastRoom.exits.push({
        direction: 'east',
        targetRoom: room.id,
      });
      
      rooms.push(room);
      usedPositions.push({ x: room.x, y: room.y, w: room.width, h: room.height });
      lastRoom = room;
    }
    
    // Create large boss room
    const bossRoom = this.createRoom(
      'room_boss',
      'boss',
      this.dungeonWidth - padding - 18,
      Math.floor(this.dungeonHeight / 2) - 9,
      16,
      16,
      difficulty
    );
    
    // Connect to last room
    bossRoom.exits.push({
      direction: 'west',
      targetRoom: lastRoom.id,
    });
    lastRoom.exits.push({
      direction: 'east',
      targetRoom: bossRoom.id,
    });
    
    rooms.push(bossRoom);
    
    // Add some side rooms branching off
    this.addBranchRooms(rooms, usedPositions, difficulty);
    
    return rooms;
  }

  /**
   * Add branching side rooms for more exploration
   */
  private addBranchRooms(
    rooms: DungeonRoom[], 
    usedPositions: { x: number; y: number; w: number; h: number }[],
    difficulty: number
  ): void {
    const mainRooms = rooms.filter(r => r.type !== 'start' && r.type !== 'boss');
    const branchCount = 2 + Math.floor(difficulty);
    
    for (let i = 0; i < branchCount && mainRooms.length > 0; i++) {
      const parentRoom = mainRooms[Math.floor(Math.random() * mainRooms.length)];
      
      // Try to place a branch room
      const directions = ['north', 'south'] as const;
      const dir = directions[Math.floor(Math.random() * 2)];
      
      const branchWidth = 8 + Math.floor(Math.random() * 6);
      const branchHeight = 8 + Math.floor(Math.random() * 6);
      
      let branchX = Math.floor(parentRoom.x + parentRoom.width / 2 - branchWidth / 2);
      let branchY = Math.floor(dir === 'north' 
        ? parentRoom.y - branchHeight - 6
        : parentRoom.y + parentRoom.height + 6);
      
      // Check bounds
      if (branchX < 4 || branchX + branchWidth > this.dungeonWidth - 4 ||
          branchY < 4 || branchY + branchHeight > this.dungeonHeight - 4) {
        continue;
      }
      
      // Check overlap
      let overlaps = false;
      for (const pos of usedPositions) {
        if (this.roomsOverlap(branchX, branchY, branchWidth, branchHeight, pos.x, pos.y, pos.w, pos.h)) {
          overlaps = true;
          break;
        }
      }
      
      if (overlaps) continue;
      
      const branchRoom = this.createRoom(
        `room_branch_${i}`,
        Math.random() < 0.4 ? 'treasure' : 'normal',
        branchX,
        branchY,
        branchWidth,
        branchHeight,
        difficulty
      );
      
      // Connect
      branchRoom.exits.push({
        direction: dir === 'north' ? 'south' : 'north',
        targetRoom: parentRoom.id,
      });
      parentRoom.exits.push({
        direction: dir,
        targetRoom: branchRoom.id,
      });
      
      rooms.push(branchRoom);
      usedPositions.push({ x: branchX, y: branchY, w: branchWidth, h: branchHeight });
    }
  }

  /**
   * Check if two rooms overlap
   */
  private roomsOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    const margin = 4;
    return !(x1 + w1 + margin < x2 || x2 + w2 + margin < x1 ||
             y1 + h1 + margin < y2 || y2 + h2 + margin < y1);
  }

  /**
   * Create a single room with enemies
   */
  private createRoom(
    id: string,
    type: DungeonRoom['type'],
    x: number,
    y: number,
    width: number,
    height: number,
    difficulty: number = 1
  ): DungeonRoom {
    const room: DungeonRoom = {
      id,
      type,
      x,
      y,
      width,
      height,
      enemies: [],
      items: [],
      exits: [],
      cleared: type === 'start',
    };
    
    // Add enemy spawn points based on room type
    if (type === 'normal') {
      const enemyCount = 2 + Math.floor(Math.random() * 3) + Math.floor(difficulty * 0.5);
      const enemyTypes = ['skeleton_basic', 'zombie_shambler', 'ghost_wisp'];
      
      for (let i = 0; i < enemyCount; i++) {
        room.enemies.push({
          x: x + 3 + Math.floor(Math.random() * (width - 6)),
          y: y + 3 + Math.floor(Math.random() * (height - 6)),
          type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
        });
      }
    } else if (type === 'treasure') {
      // Guard for treasure room
      room.enemies.push({
        x: x + Math.floor(width / 2),
        y: y + Math.floor(height / 2) - 2,
        type: 'skeleton_knight',
      });
      
      // Item spawn in center
      room.items.push({
        x: x + Math.floor(width / 2),
        y: y + Math.floor(height / 2) + 2,
      });
    } else if (type === 'boss') {
      // Boss in center
      room.enemies.push({
        x: x + Math.floor(width / 2),
        y: y + Math.floor(height / 2),
        type: difficulty >= 3 ? 'boss_shadow_knight' : 'boss_crypt_lord',
      });
      
      // Add some minions
      const minionCount = 2 + Math.floor(difficulty * 0.5);
      for (let i = 0; i < minionCount; i++) {
        const angle = (i / minionCount) * Math.PI * 2;
        room.enemies.push({
          x: x + Math.floor(width / 2) + Math.floor(Math.cos(angle) * (width / 3)),
          y: y + Math.floor(height / 2) + Math.floor(Math.sin(angle) * (height / 3)),
          type: 'skeleton_basic',
        });
      }
    }
    
    return room;
  }

  /**
   * Place a room on the tile map
   */
  private placeRoom(tiles: DungeonTile[][], room: DungeonRoom): void {
    const startY = Math.floor(room.y);
    const endY = Math.floor(room.y + room.height);
    const startX = Math.floor(room.x);
    const endX = Math.floor(room.x + room.width);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (y >= 0 && y < this.dungeonHeight && x >= 0 && x < this.dungeonWidth && tiles[y] && tiles[y][x]) {
          tiles[y][x] = {
            x,
            y,
            type: 'floor',
            roomId: room.id,
            variant: Math.floor(Math.random() * 4),
          };
        }
      }
    }
    
    // Mark spawn point for start room
    if (room.type === 'start') {
      const spawnX = room.x + Math.floor(room.width / 2);
      const spawnY = room.y + Math.floor(room.height / 2);
      tiles[spawnY][spawnX].type = 'spawn';
    }
  }

  /**
   * Connect rooms with wider corridors
   */
  private connectRooms(tiles: DungeonTile[][], rooms: DungeonRoom[]): void {
    const connected = new Set<string>();
    
    for (const room of rooms) {
      for (const exit of room.exits) {
        const connectionKey = [room.id, exit.targetRoom].sort().join('-');
        if (connected.has(connectionKey)) continue;
        connected.add(connectionKey);
        
        const targetRoom = rooms.find(r => r.id === exit.targetRoom);
        if (!targetRoom) continue;
        
        const ax = Math.floor(room.x + room.width / 2);
        const ay = Math.floor(room.y + room.height / 2);
        const bx = Math.floor(targetRoom.x + targetRoom.width / 2);
        const by = Math.floor(targetRoom.y + targetRoom.height / 2);
        
        if (Math.abs(ax - bx) > Math.abs(ay - by)) {
          this.createHorizontalCorridor(tiles, ax, bx, ay, 'corridor');
          this.createVerticalCorridor(tiles, ay, by, bx, 'corridor');
        } else {
          this.createVerticalCorridor(tiles, ay, by, ax, 'corridor');
          this.createHorizontalCorridor(tiles, ax, bx, by, 'corridor');
        }
      }
    }
  }

  private createHorizontalCorridor(tiles: DungeonTile[][], x1: number, x2: number, y: number, roomId: string): void {
    const startX = Math.floor(Math.min(x1, x2));
    const endX = Math.floor(Math.max(x1, x2));
    const corridorY = Math.floor(y);
    const corridorWidth = 4;
    
    for (let x = startX; x <= endX; x++) {
      for (let dy = -Math.floor(corridorWidth / 2); dy <= Math.floor(corridorWidth / 2); dy++) {
        const cy = corridorY + dy;
        if (cy >= 0 && cy < this.dungeonHeight && x >= 0 && x < this.dungeonWidth && tiles[cy] && tiles[cy][x]) {
          if (tiles[cy][x].type === 'wall') {
            tiles[cy][x] = { x, y: cy, type: 'floor', roomId, variant: Math.floor(Math.random() * 4) };
          }
        }
      }
    }
  }

  private createVerticalCorridor(tiles: DungeonTile[][], y1: number, y2: number, x: number, roomId: string): void {
    const startY = Math.floor(Math.min(y1, y2));
    const endY = Math.floor(Math.max(y1, y2));
    const corridorX = Math.floor(x);
    const corridorWidth = 4;
    
    for (let y = startY; y <= endY; y++) {
      for (let dx = -Math.floor(corridorWidth / 2); dx <= Math.floor(corridorWidth / 2); dx++) {
        const cx = corridorX + dx;
        if (y >= 0 && y < this.dungeonHeight && cx >= 0 && cx < this.dungeonWidth && tiles[y] && tiles[y][cx]) {
          if (tiles[y][cx].type === 'wall') {
            tiles[y][cx] = { x: cx, y, type: 'floor', roomId, variant: Math.floor(Math.random() * 4) };
          }
        }
      }
    }
  }

  private addWaterPuddles(tiles: DungeonTile[][]): void {
    for (let y = 0; y < this.dungeonHeight; y++) {
      for (let x = 0; x < this.dungeonWidth; x++) {
        if (tiles[y][x].type === 'floor' && tiles[y][x].roomId === 'corridor') {
          if (Math.random() < 0.02) {
            const size = 1 + Math.floor(Math.random() * 2);
            for (let dy = -size; dy <= size; dy++) {
              for (let dx = -size; dx <= size; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < this.dungeonHeight && nx >= 0 && nx < this.dungeonWidth) {
                  if (tiles[ny][nx].type === 'floor' && Math.random() < 0.5) {
                    tiles[ny][nx].type = 'water';
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private hasAdjacentFloor(tiles: DungeonTile[][], x: number, y: number): boolean {
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
    ];
    
    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < this.dungeonWidth && ny >= 0 && ny < this.dungeonHeight) {
        const t = tiles[ny][nx].type;
        if (t === 'floor' || t === 'spawn' || t === 'water') return true;
      }
    }
    return false;
  }

  private generateEnvironmentSpawns(tiles: DungeonTile[][], rooms: DungeonRoom[], spawns: EnvironmentSpawn[]): void {
    for (const room of rooms) {
      // Torches at corners
      const torchPositions = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.width - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.height - 2 },
        { x: room.x + room.width - 2, y: room.y + room.height - 2 },
      ];
      
      if (room.width > 10) {
        torchPositions.push({ x: room.x + Math.floor(room.width / 2), y: room.y + 1 });
        torchPositions.push({ x: room.x + Math.floor(room.width / 2), y: room.y + room.height - 2 });
      }
      
      for (const pos of torchPositions) {
        if (Math.random() < 0.7) {
          spawns.push({ x: pos.x * this.tileSize + this.tileSize / 2, y: pos.y * this.tileSize + this.tileSize / 2, type: 'torch' });
        }
      }
      
      // Grass patches
      if (room.type === 'normal' && Math.random() < 0.5) {
        const grassCount = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < grassCount; i++) {
          spawns.push({
            x: (room.x + 2 + Math.random() * (room.width - 4)) * this.tileSize,
            y: (room.y + 2 + Math.random() * (room.height - 4)) * this.tileSize,
            type: 'grass',
          });
        }
      }
      
      // Bones
      if (room.type !== 'start') {
        const boneCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < boneCount; i++) {
          const boneTypes: EnvironmentSpawn['type'][] = ['bones', 'skull', 'pile'];
          spawns.push({
            x: (room.x + 2 + Math.random() * (room.width - 4)) * this.tileSize,
            y: (room.y + 2 + Math.random() * (room.height - 4)) * this.tileSize,
            type: boneTypes[Math.floor(Math.random() * boneTypes.length)],
          });
        }
      }
      
      // Chests
      if (room.type === 'treasure') {
        spawns.push({
          x: (room.x + Math.floor(room.width / 2)) * this.tileSize,
          y: (room.y + Math.floor(room.height / 2) + 2) * this.tileSize,
          type: 'chest_rare',
        });
      }
      
      if (room.type === 'normal' && Math.random() < 0.2) {
        spawns.push({
          x: (room.x + 2 + Math.random() * (room.width - 4)) * this.tileSize,
          y: (room.y + 2 + Math.random() * (room.height - 4)) * this.tileSize,
          type: 'chest_common',
        });
      }
    }
  }

  private generateDenSpawns(tiles: DungeonTile[][], rooms: DungeonRoom[], spawns: DenSpawn[], difficulty: number): void {
    const normalRooms = rooms.filter(r => r.type === 'normal' && r.width >= 10 && r.height >= 10);
    const denCount = 2 + Math.floor(difficulty * 1.5);
    const shuffledRooms = [...normalRooms].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(denCount, shuffledRooms.length); i++) {
      const room = shuffledRooms[i];
      let denType: DenSpawn['denType'] = 'monster';
      if (Math.random() < 0.2) denType = 'treasure';
      if (i === 0 && difficulty >= 3) denType = 'boss';
      
      spawns.push({
        x: (room.x + Math.floor(room.width / 2)) * this.tileSize,
        y: (room.y + Math.floor(room.height / 2)) * this.tileSize,
        denType,
      });
    }
  }

  private generateBatZones(rooms: DungeonRoom[], zones: BatZone[]): void {
    for (const room of rooms) {
      if (room.width >= 10 && room.height >= 10 && Math.random() < 0.4) {
        zones.push({
          minX: room.x * this.tileSize + 32,
          maxX: (room.x + room.width) * this.tileSize - 32,
          minY: room.y * this.tileSize + 32,
          maxY: (room.y + room.height) * this.tileSize - 32,
        });
      }
    }
  }

  getSpawnPosition(dungeon: GeneratedDungeon): { x: number; y: number } {
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.tiles[y][x].type === 'spawn') {
          return { x: x * this.tileSize + this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 };
        }
      }
    }
    const startRoom = dungeon.rooms.get(dungeon.startRoom)!;
    return { x: (startRoom.x + startRoom.width / 2) * this.tileSize, y: (startRoom.y + startRoom.height / 2) * this.tileSize };
  }

  renderDungeon(dungeon: GeneratedDungeon): {
    floorLayer: Phaser.GameObjects.Group;
    wallLayer: Phaser.GameObjects.Group;
    collisionRects: Phaser.Physics.Arcade.StaticGroup;
  } {
    const floorLayer = this.scene.add.group();
    const wallLayer = this.scene.add.group();
    const collisionRects = this.scene.physics.add.staticGroup();
    
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y][x];
        const worldX = x * this.tileSize + this.tileSize / 2;
        const worldY = y * this.tileSize + this.tileSize / 2;
        
        if (tile.type === 'floor' || tile.type === 'spawn') {
          floorLayer.add(this.createFloorTile(worldX, worldY, tile.roomId, tile.variant || 0));
        } else if (tile.type === 'water') {
          floorLayer.add(this.createWaterTile(worldX, worldY));
        }
      }
    }
    
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y][x];
        const worldX = x * this.tileSize + this.tileSize / 2;
        const worldY = y * this.tileSize + this.tileSize / 2;
        
        if (tile.type === 'wall' && this.hasAdjacentFloor(dungeon.tiles, x, y)) {
          wallLayer.add(this.createWallTile(worldX, worldY, tile.variant || 0));
          const collider = collisionRects.create(worldX, worldY, 'wall');
          collider.setVisible(false);
          collider.body.setSize(this.tileSize, this.tileSize);
        }
      }
    }
    
    floorLayer.setDepth(0);
    wallLayer.setDepth(2);
    
    return { floorLayer, wallLayer, collisionRects };
  }

  private createFloorTile(x: number, y: number, roomId: string, variant: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.setPosition(x, y);
    
    let baseColor = 0x2a2a3a;
    let accentColor = 0x3a3a4a;
    
    if (roomId === 'room_boss') { baseColor = 0x2a1a2a; accentColor = 0x3a2a3a; }
    else if (roomId.includes('treasure')) { baseColor = 0x2a2a1a; accentColor = 0x3a3a2a; }
    else if (roomId === 'corridor') { baseColor = 0x252530; accentColor = 0x353540; }
    
    graphics.fillStyle(baseColor);
    graphics.fillRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
    
    graphics.fillStyle(accentColor);
    if (variant === 0) {
      graphics.fillRect(-this.tileSize/2, -this.tileSize/2, 3, 3);
      graphics.fillRect(this.tileSize/2 - 3, this.tileSize/2 - 3, 3, 3);
    } else if (variant === 2) {
      graphics.lineStyle(1, 0x1a1a2a);
      graphics.lineBetween(-8, -8, 4, 6);
    }
    
    graphics.lineStyle(1, 0x1a1a2a, 0.5);
    graphics.strokeRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
    
    return graphics;
  }

  private createWaterTile(x: number, y: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.setPosition(x, y);
    graphics.fillStyle(0x2a4a6a, 0.7);
    graphics.fillRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
    graphics.fillStyle(0x4a6a8a, 0.4);
    graphics.fillRect(-this.tileSize/2 + 4, -this.tileSize/2 + 4, 8, 4);
    return graphics;
  }

  private createWallTile(x: number, y: number, variant: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.setPosition(x, y);
    
    graphics.fillStyle(0x1a1a2a);
    graphics.fillRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
    
    graphics.fillStyle(0x2a2a3a);
    graphics.fillRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize * 0.7);
    
    graphics.lineStyle(1, 0x252535, 0.5);
    graphics.lineBetween(-this.tileSize/2, -this.tileSize/4, this.tileSize/2, -this.tileSize/4);
    graphics.lineBetween(0, -this.tileSize/2, 0, -this.tileSize/4);
    
    graphics.fillStyle(0x3a3a4a);
    graphics.fillRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, 2);
    
    if (variant === 3) {
      graphics.fillStyle(0x2a4a2a, 0.5);
      graphics.fillRect(-this.tileSize/2, this.tileSize/2 - 6, 8, 6);
    }
    
    graphics.lineStyle(1, 0x0a0a1a);
    graphics.strokeRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
    
    return graphics;
  }

  getEnemySpawns(dungeon: GeneratedDungeon): { x: number; y: number; type: string; roomId: string }[] {
    const spawns: { x: number; y: number; type: string; roomId: string }[] = [];
    for (const room of dungeon.rooms.values()) {
      for (const enemy of room.enemies) {
        spawns.push({
          x: enemy.x * this.tileSize + this.tileSize / 2,
          y: enemy.y * this.tileSize + this.tileSize / 2,
          type: enemy.type,
          roomId: room.id,
        });
      }
    }
    return spawns;
  }

  getItemSpawns(dungeon: GeneratedDungeon): { x: number; y: number; roomId: string }[] {
    const spawns: { x: number; y: number; roomId: string }[] = [];
    for (const room of dungeon.rooms.values()) {
      for (const item of room.items) {
        spawns.push({
          x: item.x * this.tileSize + this.tileSize / 2,
          y: item.y * this.tileSize + this.tileSize / 2,
          roomId: room.id,
        });
      }
    }
    return spawns;
  }
}
