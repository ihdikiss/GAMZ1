
import Phaser from 'phaser';
import { MAZE_DATA, TILE_SIZE } from '../constants';

export default class MazeScene extends Phaser.Scene {
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare tweens: Phaser.Tweens.TweenManager;
  declare input: Phaser.Input.InputPlugin;
  declare time: Phaser.Time.Clock;

  private player!: Phaser.GameObjects.Container;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private currentQuestion: any = null;
  private levelIdx: number = 0;
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomAreas: any[] = [];
  private isProcessing: boolean = false;

  constructor() { super('MazeScene'); }

  create() {
    this.createBackground();
    this.walls = this.physics.add.staticGroup();
    this.drawMaze();
    this.createPlayer();
    this.enemies = this.physics.add.group();
    
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.8);
  }

  public updateQuestion(data: any, idx: number) {
    this.currentQuestion = data;
    this.levelIdx = idx;
    this.isProcessing = false;
    this.resetScene();
  }

  private resetScene() {
    this.roomObjects.forEach(o => o.destroy());
    this.roomObjects = [];
    this.roomAreas = [];
    this.player.setPosition(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
    this.spawnDynamicEnemies();
    this.drawRooms();
  }

  private spawnDynamicEnemies() {
    this.enemies.clear(true, true);
    
    // معادلة الصعوبة: نبدأ بـ 2 أعداء.
    // يتم إضافة عدو عند السؤال الثالث (index 2)، السادس (index 5)، التاسع (index 8)
    const enemyCount = 2 + Math.floor((this.levelIdx + 1) / 3);
    
    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      do {
        x = Phaser.Math.Between(5, MAZE_DATA[0].length - 2);
        y = Phaser.Math.Between(5, MAZE_DATA.length - 2);
      } while (MAZE_DATA[y][x] === 1);

      const enemy = this.createEnemy(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
      
      // العدو الأول دائماً هو "المطارد السريع" لزيادة التحدي
      if (i === 0) {
        (enemy as any).isStalker = true;
        (enemy.getAt(0) as Phaser.GameObjects.Circle).setFillStyle(0xffffff); // لون أبيض للمطارد
      }
    }
  }

  private createEnemy(x: number, y: number) {
    const container = this.add.container(x, y);
    const body = this.add.circle(0, 0, 18, 0xef4444);
    const eye = this.add.circle(0, -4, 12, 0x000000);
    const pupil = this.add.circle(0, -4, 5, 0xff0000);
    container.add([body, eye, pupil]);
    this.physics.add.existing(container);
    const b = container.body as Phaser.Physics.Arcade.Body;
    b.setCircle(16, -16, -16);
    this.enemies.add(container);
    return container;
  }

  private drawRooms() {
    if (!this.currentQuestion) return;
    const labels = [this.currentQuestion.room1, this.currentQuestion.room2, this.currentQuestion.room3, this.currentQuestion.room4];
    const pos = [{x:2,y:2}, {x:12,y:2}, {x:2,y:12}, {x:12,y:12}];
    const colors = [0x4f46e5, 0xdb2777, 0x10b981, 0x06b6d4];

    pos.forEach((p, i) => {
      const rect = new Phaser.Geom.Rectangle(p.x * TILE_SIZE, p.y * TILE_SIZE, 4 * TILE_SIZE, 3 * TILE_SIZE);
      const bg = this.add.rectangle(rect.centerX, rect.centerY, rect.width, rect.height, colors[i], 0.2).setDepth(1);
      const txt = this.add.text(rect.centerX, rect.centerY, labels[i], { fontSize: '20px', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(2);
      this.roomObjects.push(bg, txt);
      this.roomAreas.push({ rect, isCorrect: i === this.currentQuestion.correct_index });
    });
  }

  private handleEnemyCollision() {
    if ((this.player as any).invulnerable) return;
    (this.player as any).invulnerable = true;
    this.cameras.main.shake(200, 0.02);
    window.dispatchEvent(new CustomEvent('maze-game-event', { detail: { type: 'LOSE_LIFE' } }));
    this.tweens.add({ targets: this.player, alpha: 0, duration: 100, yoyo: true, repeat: 5, onComplete: () => { this.player.alpha = 1; (this.player as any).invulnerable = false; } });
  }

  private createPlayer() {
    const body = this.add.circle(0, 0, 16, 0x6366f1);
    this.player = this.add.container(TILE_SIZE * 1.5, TILE_SIZE * 1.5, [body]);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(14, -14, -14).setCollideWorldBounds(true);
  }

  private createBackground() {
    for (let i = 0; i < 100; i++) this.add.circle(Phaser.Math.Between(0, 2000), Phaser.Math.Between(0, 2000), 1, 0xffffff, 0.3);
  }

  private drawMaze() {
    MAZE_DATA.forEach((row, y) => row.forEach((cell, x) => {
      if (cell === 1) {
        const w = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, 0x0f172a);
        this.walls.add(w);
      }
    }));
  }

  update() {
    const cursors = this.input.keyboard!.createCursorKeys();
    const speed = 350;
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(0);
    if (cursors.left.isDown) b.setVelocityX(-speed);
    else if (cursors.right.isDown) b.setVelocityX(speed);
    if (cursors.up.isDown) b.setVelocityY(-speed);
    else if (cursors.down.isDown) b.setVelocityY(speed);

    if (!this.isProcessing) {
      this.roomAreas.forEach(area => {
        if (Phaser.Geom.Rectangle.Contains(area.rect, this.player.x, this.player.y)) {
          this.isProcessing = true;
          if (area.isCorrect) {
            window.dispatchEvent(new CustomEvent('maze-game-event', { detail: { type: 'NEXT_LEVEL' } }));
          } else {
            window.dispatchEvent(new CustomEvent('maze-game-event', { detail: { type: 'LOSE_LIFE' } }));
            this.player.setPosition(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
            this.time.delayedCall(1000, () => { this.isProcessing = false; });
          }
        }
      });
    }

    this.enemies.getChildren().forEach((e: any) => {
      const isStalker = e.isStalker;
      const baseSpeed = isStalker ? 190 : 130;
      const bonusSpeed = this.levelIdx * 5;
      this.physics.moveToObject(e, this.player, baseSpeed + bonusSpeed);
    });
  }
}
