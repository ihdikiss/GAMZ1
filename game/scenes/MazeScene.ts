
import Phaser from 'phaser';
import { MAZE_DATA, TILE_SIZE, GAME_LEVELS, RoomConfig } from '../constants';

export default class MazeScene extends Phaser.Scene {
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare input: Phaser.Input.InputPlugin;
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare tweens: Phaser.Tweens.TweenManager;
  declare time: Phaser.Time.Clock;

  private player!: Phaser.GameObjects.Container;
  private playerLegs: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wallLayer!: Phaser.GameObjects.Graphics;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private roomAreas: { rect: Phaser.Geom.Rectangle, config: RoomConfig, processed: boolean }[] = [];
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  
  private targetZoom: number = 0.8;
  private currentZoom: number = 0.8;
  private zoomSpeed: number = 0.05;
  private invulnerable: boolean = false;
  private isSafe: boolean = false; // Flag to protect player during level transitions
  private enemySpeedMultiplier: number = 1.0;
  private currentLevelIndex: number = 0;

  constructor() {
    super('MazeScene');
  }

  create() {
    this.invulnerable = false;
    this.isSafe = false;
    this.roomAreas = [];
    this.roomObjects = [];
    this.currentLevelIndex = 0;

    this.createBackground();
    this.walls = this.physics.add.staticGroup();
    this.wallLayer = this.add.graphics();
    this.drawMaze(); 
    this.createRooms(); 
    this.createPlayer(); 

    this.enemies = this.physics.add.group();
    this.spawnEnemies(5); 

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(this.currentZoom);
    
    const worldW = MAZE_DATA[0].length * TILE_SIZE;
    const worldH = MAZE_DATA.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
  }

  private createPlayer() {
    const startX = TILE_SIZE * 1.5;
    const startY = TILE_SIZE * 1.5;

    const legL = this.add.rectangle(-8, 12, 6, 12, 0x4338ca).setOrigin(0.5);
    const legR = this.add.rectangle(8, 12, 6, 12, 0x4338ca).setOrigin(0.5);
    this.playerLegs = [legL, legR];

    const body = this.add.circle(0, 0, 16, 0x6366f1);
    const eyes = this.add.circle(0, -5, 10, 0xffffff);
    const pupilsL = this.add.circle(-4, -5, 3, 0x000000);
    const pupilsR = this.add.circle(4, -5, 3, 0x000000);

    this.player = this.add.container(startX, startY, [legL, legR, body, eyes, pupilsL, pupilsR]);
    this.physics.add.existing(this.player);
    
    const bodyPhys = (this.player.body as Phaser.Physics.Arcade.Body);
    bodyPhys.setCircle(14, -14, -14);
    bodyPhys.setCollideWorldBounds(true);
    this.player.setDepth(30); 
    
    const playerGlow = this.add.circle(0, 0, 40, 0x6366f1, 0.15);
    this.player.addAt(playerGlow, 0);
  }

  private spawnEnemies(count: number) {
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Phaser.Math.Between(5, MAZE_DATA[0].length - 2);
        y = Phaser.Math.Between(5, MAZE_DATA.length - 2);
      } while (MAZE_DATA[y][x] === 1);

      this.createEnemy(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
    }
  }

  private createEnemy(x: number, y: number) {
    const container = this.add.container(x, y);
    const body = this.add.circle(0, 0, 18, 0xef4444);
    const eye = this.add.circle(0, -4, 12, 0x000000);
    const pupil = this.add.circle(0, -4, 5, 0xff0000);
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sx = Math.cos(angle) * 18;
      const sy = Math.sin(angle) * 18;
      const spike = this.add.circle(sx, sy, 4, 0x991b1b);
      container.add(spike);
    }

    const legL = this.add.rectangle(-10, 16, 6, 12, 0x7f1d1d);
    const legR = this.add.rectangle(10, 16, 6, 12, 0x7f1d1d);

    container.add([legL, legR, body, eye, pupil]);
    this.physics.add.existing(container);
    
    const bodyPhysics = container.body as Phaser.Physics.Arcade.Body;
    bodyPhysics.setCircle(16, -16, -16);
    bodyPhysics.setBounce(0.5, 0.5);
    
    container.setDepth(25);
    this.enemies.add(container);

    this.tweens.add({
      targets: body,
      scale: 1.1,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    this.tweens.add({
      targets: [legL, legR],
      y: '+=6',
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private handleEnemyCollision() {
    // If player is in "Safe Mode" (correct answer reached) or hit-invulnerable, ignore collision
    if (this.invulnerable || this.isSafe) return;

    this.invulnerable = true;
    this.cameras.main.shake(200, 0.02);

    window.dispatchEvent(new CustomEvent('maze-game-event', {
      detail: { type: 'LOSE_LIFE' }
    }));

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.player.alpha = 1;
        this.invulnerable = false;
      }
    });
  }

  private createBackground() {
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, 3000);
      const y = Phaser.Math.Between(0, 2000);
      const size = Phaser.Math.FloatBetween(1, 2.5);
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4)).setDepth(0);
    }
  }

  private drawMaze() {
    this.wallLayer.lineStyle(2, 0x4f46e5, 0.4);
    this.wallLayer.setDepth(5);

    MAZE_DATA.forEach((row, y) => {
      row.forEach((cell, x) => {
        const posX = x * TILE_SIZE;
        const posY = y * TILE_SIZE;

        if (cell === 1) {
          const wall = this.add.rectangle(posX + TILE_SIZE / 2, posY + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x0f172a);
          wall.setDepth(5);
          this.walls.add(wall);
          this.wallLayer.strokeRect(posX + 4, posY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
          this.add.rectangle(posX + TILE_SIZE / 2, posY + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x020617).setDepth(1);
        }
      });
    });
  }

  private createRooms() {
    // Clear old room objects
    this.roomObjects.forEach(obj => obj.destroy());
    this.roomObjects = [];
    this.roomAreas = [];

    const level = GAME_LEVELS[this.currentLevelIndex];
    if (!level) return;

    level.rooms.forEach(room => {
      const rect = new Phaser.Geom.Rectangle(
        room.x * TILE_SIZE,
        room.y * TILE_SIZE,
        room.w * TILE_SIZE,
        room.h * TILE_SIZE
      );

      const bg = this.add.rectangle(rect.centerX, rect.centerY, rect.width, rect.height, room.color, 0.2).setDepth(3);
      const border = this.add.graphics();
      border.lineStyle(4, room.color, 0.6);
      border.strokeRect(rect.x + 8, rect.y + 8, rect.width - 16, rect.height - 16);
      border.setDepth(6);

      const text = this.add.text(rect.centerX, rect.centerY, room.label, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(10);

      this.roomObjects.push(bg, border, text);
      this.roomAreas.push({ rect, config: room, processed: false });
    });
  }

  private showFeedback(x: number, y: number, isCorrect: boolean) {
    const text = isCorrect ? "أحسنت!" : "إجابة خاطئة!";
    const color = isCorrect ? "#10b981" : "#ef4444";
    const icon = isCorrect ? "✔️" : "❌";

    const feedbackGroup = this.add.container(x, y);
    
    const label = this.add.text(0, -40, text, {
      fontSize: '52px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    const sym = this.add.text(0, 30, icon, {
      fontSize: '100px'
    }).setOrigin(0.5);

    feedbackGroup.add([label, sym]);
    feedbackGroup.setDepth(100);

    this.tweens.add({
      targets: feedbackGroup,
      y: y - 150,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => feedbackGroup.destroy()
    });

    if (isCorrect) {
      this.isSafe = true; // Make player safe immediately on correct answer
      this.nextLevel();
    } else {
      this.cameras.main.shake(300, 0.015);
      this.time.delayedCall(2000, () => {
        this.roomAreas.forEach(ra => ra.processed = false);
      });
    }
  }

  private nextLevel() {
    this.enemySpeedMultiplier += 0.15;
    this.currentLevelIndex++;
    
    window.dispatchEvent(new CustomEvent('maze-game-event', {
      detail: { type: 'NEXT_LEVEL' }
    }));
    
    if (this.currentLevelIndex < GAME_LEVELS.length) {
      this.time.delayedCall(1200, () => {
        this.player.setPosition(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
        this.createRooms();
        this.isSafe = false; // Player is no longer safe once they start the new level
      });
    }
  }

  update(time: number, delta: number) {
    const speed = 320;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    
    let vx = 0;
    let vy = 0;

    // Only allow movement if not in transition (optional, but keep for fluidity)
    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;

    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.playerLegs[0].y = 12 + Math.sin(time * 0.015) * 5;
      this.playerLegs[1].y = 12 + Math.cos(time * 0.015) * 5;
    }

    for (const room of this.roomAreas) {
      if (!room.processed && Phaser.Geom.Rectangle.Contains(room.rect, this.player.x, this.player.y)) {
        room.processed = true;
        this.showFeedback(room.rect.centerX, room.rect.centerY, room.config.isCorrect);
        
        if (!room.config.isCorrect) {
          body.setVelocity(body.velocity.x * -4, body.velocity.y * -4);
        } else {
          window.dispatchEvent(new CustomEvent('maze-game-event', {
            detail: { type: 'SCORE_UP' }
          }));
        }
      }
    }

    let inRoom = this.roomAreas.some(r => Phaser.Geom.Rectangle.Contains(r.rect, this.player.x, this.player.y));
    this.targetZoom = inRoom ? 1.0 : 0.7;
    this.currentZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, this.zoomSpeed);
    this.cameras.main.setZoom(this.currentZoom);

    this.enemies.getChildren().forEach((enemy: any) => {
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (dist < 450) {
        this.physics.moveToObject(enemy, this.player, 140 * this.enemySpeedMultiplier);
      } else {
        if (Math.random() < 0.02) {
          const angle = Phaser.Math.Between(0, 360);
          enemy.body.setVelocity(
            Math.cos(angle) * 100 * this.enemySpeedMultiplier,
            Math.sin(angle) * 100 * this.enemySpeedMultiplier
          );
        }
      }
    });
  }
}
