import Phaser from 'phaser';
import { ui, MAPS, GROUND_TOP } from '../state.js';
import { initTouchControls, setTouchUIVisible } from '../touch-controls.js';

// ---------------------------------------------------------------------------
// ArenaScene - Phase 2: weapons playground.
// Doodle soldier with run + fuel-limited jetpack, twin-stick / mouse aim,
// three pickup weapons (rifle, scatter, bolt), breakable crates.
// Bots arrive in the next phase.
// ---------------------------------------------------------------------------

const WORLD_W = 2400;
const WORLD_H = 1420;

const INK = 0x2b2b2b;
const RUN_SPEED = 360;
const AIR_ACCEL = 2200;
const JETPACK_VY = -640;
const FUEL_MAX = 100;
const FUEL_DRAIN = 42; // per second while thrusting
const FUEL_REGEN = 34; // per second while on the ground

// original doodle arsenal: damage, seconds between shots, bullet speed,
// pellets per shot, spread (radians), magazine size, texture key
const WEAPONS = {
  rifle:   { name: 'RIFLE',   damage: 12, interval: 0.13, speed: 950,  pellets: 1, spread: 0,    ammo: 30, tex: 'gun-rifle' },
  scatter: { name: 'SCATTER', damage: 8,  interval: 0.65, speed: 820,  pellets: 5, spread: 0.40, ammo: 10, tex: 'gun-scatter' },
  bolt:    { name: 'BOLT',    damage: 45, interval: 0.90, speed: 1400, pellets: 1, spread: 0,    ammo: 6,  tex: 'gun-bolt' },
};

const KILLS_TO_WIN = 7;
const MATCH_TIME = 300; // 5:00

function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // -- doodle soldier (56x72), faces right --------------------------------
  // chunky commando: helmet dome with badge, vest, two arms, twin-tank pack
  g.clear();
  // jetpack: twin tanks on the back (left side)
  g.fillStyle(0xc96f2e, 1);
  g.fillRoundedRect(3, 36, 8, 22, 3);
  g.fillRoundedRect(11, 36, 8, 22, 3);
  g.lineStyle(3, INK, 1);
  g.strokeRoundedRect(3, 36, 8, 22, 3);
  g.strokeRoundedRect(11, 36, 8, 22, 3);
  // tank caps
  g.fillStyle(0x8a4d1d, 1);
  g.fillRoundedRect(3, 33, 8, 5, 2);
  g.fillRoundedRect(11, 33, 8, 5, 2);
  g.lineStyle(3, INK, 1);
  g.strokeRoundedRect(3, 33, 8, 5, 2);
  g.strokeRoundedRect(11, 33, 8, 5, 2);
  // nozzle
  g.fillStyle(0x5a5a5a, 1);
  g.fillTriangle(5, 58, 17, 58, 11, 66);
  g.lineStyle(3, INK, 1);
  g.strokeTriangle(5, 58, 17, 58, 11, 66);
  // harness straps
  g.lineStyle(3, INK, 0.9);
  g.lineBetween(19, 38, 41, 38);
  g.lineBetween(19, 52, 41, 52);
  // legs
  g.lineStyle(5, INK, 1);
  g.lineBetween(24, 52, 22, 62);
  g.lineBetween(35, 52, 37, 62);
  // boots with sole line
  g.fillStyle(INK, 1);
  g.fillRoundedRect(14, 60, 13, 7, 2);
  g.fillRoundedRect(32, 60, 13, 7, 2);
  g.lineStyle(2, 0xf3efe3, 1);
  g.lineBetween(15, 64, 26, 64);
  g.lineBetween(33, 64, 44, 64);
  // body with vest
  g.fillStyle(0x5b8dd9, 1);
  g.fillRoundedRect(18, 34, 23, 20, 7);
  g.lineStyle(4, INK, 1);
  g.strokeRoundedRect(18, 34, 23, 20, 7);
  // vest hatch shading
  g.lineStyle(2, INK, 0.45);
  g.lineBetween(25, 38, 21, 52);
  g.lineBetween(31, 38, 27, 52);
  g.lineBetween(37, 38, 33, 52);
  // belt with buckle
  g.lineStyle(3, INK, 1);
  g.lineBetween(19, 47, 40, 47);
  g.strokeRect(27, 44, 6, 6);
  // back arm
  g.lineStyle(4, INK, 1);
  g.lineBetween(22, 40, 16, 48);
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(15, 50, 4);
  g.strokeCircle(15, 50, 4);
  // front arm (bent, reaching forward to hold the gun)
  g.lineStyle(4, INK, 1);
  g.lineBetween(38, 39, 45, 44);
  g.lineBetween(45, 44, 51, 41);
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(52, 41, 4.5);
  g.strokeCircle(52, 41, 4.5);
  // head
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(30, 24, 11);
  g.lineStyle(4, INK, 1);
  g.strokeCircle(30, 24, 11);
  // helmet dome (half-disc)
  g.fillStyle(0x75806b, 1);
  g.slice(30, 26, 15, Math.PI, 0, false);
  g.fillPath();
  g.lineStyle(4, INK, 1);
  g.slice(30, 26, 15, Math.PI, 0, false);
  g.strokePath();
  // helmet brim
  g.fillStyle(0x75806b, 1);
  g.fillRoundedRect(12, 24, 38, 5, 2);
  g.lineStyle(3, INK, 1);
  g.strokeRoundedRect(12, 24, 38, 5, 2);
  // helmet badge
  g.fillStyle(0xffd93a, 1);
  g.fillCircle(30, 16, 3);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(30, 16, 3);
  // eye + determined brow
  g.fillStyle(INK, 1);
  g.fillCircle(37, 32, 2.2);
  g.lineStyle(2, INK, 1);
  g.lineBetween(33, 29, 41, 30);
  g.generateTexture('soldier', 56, 72);
  g.clear();

  // -- jetpack flame (24x40), drawn pointing down ---------------------------
  g.fillStyle(0xff8c2e, 1);
  g.fillTriangle(2, 0, 22, 0, 12, 40);
  g.fillStyle(0xffd93a, 1);
  g.fillTriangle(7, 0, 17, 0, 12, 26);
  g.generateTexture('flame', 24, 40);
  g.clear();

  // -- guns (drawn pointing right; pivot near the grip) -----------------------
  // rifle: balanced all-rounder
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(4, 8, 14, 7); // wooden stock
  g.fillStyle(0x3d3d3d, 1);
  g.fillRect(18, 7, 18, 6); // receiver
  g.lineStyle(3, INK, 1);
  g.strokeRect(4, 8, 14, 7);
  g.strokeRect(18, 7, 18, 6);
  g.lineBetween(36, 10, 47, 10); // barrel
  g.fillStyle(0x2b2b2b, 1);
  g.fillRect(23, 13, 5, 6); // magazine
  g.fillRect(27, 4, 5, 3); // sight
  g.generateTexture('gun-rifle', 48, 20);
  g.clear();
  // scatter gun: double barrel, wide spread
  g.fillStyle(0x5a4632, 1);
  g.fillRect(6, 6, 24, 10);
  g.lineStyle(3, INK, 1);
  g.strokeRect(6, 6, 24, 10);
  g.lineBetween(30, 8, 47, 8);
  g.lineBetween(30, 14, 47, 14); // twin barrels
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(14, 16, 9, 5); // pump
  g.lineStyle(3, INK, 1);
  g.strokeRect(14, 16, 9, 5);
  g.generateTexture('gun-scatter', 48, 22);
  g.clear();
  // bolt rifle: slow, long range, heavy hit
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(2, 8, 10, 7); // stock
  g.fillStyle(0x4a4a4a, 1);
  g.fillRect(12, 8, 14, 6); // body
  g.lineStyle(3, INK, 1);
  g.strokeRect(2, 8, 10, 7);
  g.strokeRect(12, 8, 14, 6);
  g.lineBetween(26, 11, 51, 11); // long barrel
  g.fillStyle(0x2b2b2b, 1);
  g.fillRect(15, 2, 11, 6); // scope
  g.lineStyle(3, INK, 1);
  g.strokeRect(15, 2, 11, 6);
  g.generateTexture('gun-bolt', 52, 22);
  g.clear();

  // -- bullet tracer (18x6) ----------------------------------------------------
  g.fillStyle(0x2b2b2b, 1);
  g.fillRoundedRect(0, 0, 18, 6, 3);
  g.fillStyle(0xffe14d, 1);
  g.fillRoundedRect(3, 2, 12, 2, 1);
  g.generateTexture('bullet', 18, 6);
  g.clear();

  // -- muzzle flash star (26x26) ------------------------------------------------
  g.fillStyle(0xff8c2e, 1);
  g.fillTriangle(13, 0, 10, 13, 16, 13);
  g.fillTriangle(13, 26, 10, 13, 16, 13);
  g.fillTriangle(0, 13, 13, 10, 13, 16);
  g.fillTriangle(26, 13, 13, 10, 13, 16);
  g.fillStyle(0xffe14d, 1);
  g.fillCircle(13, 13, 5);
  g.generateTexture('flash', 26, 26);
  g.clear();

  // -- pickup ring (60x60) -------------------------------------------------------
  g.lineStyle(3, INK, 0.55);
  g.strokeCircle(30, 30, 26);
  g.lineStyle(2, INK, 0.35);
  g.strokeCircle(30, 30, 19);
  g.generateTexture('ring', 60, 60);
  g.clear();

  // -- doodle sun (120x120) with a sleepy face -----------------------------------
  g.fillStyle(0xffd93a, 1);
  g.fillCircle(60, 60, 28);
  g.lineStyle(4, INK, 1);
  g.strokeCircle(60, 60, 28);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    g.lineBetween(60 + Math.cos(a) * 37, 60 + Math.sin(a) * 37,
      60 + Math.cos(a) * 51, 60 + Math.sin(a) * 51);
  }
  g.lineStyle(3, INK, 1);
  g.beginPath(); g.arc(50, 58, 6, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
  g.beginPath(); g.arc(70, 58, 6, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
  g.beginPath(); g.arc(60, 64, 9, Math.PI * 0.2, Math.PI * 0.8); g.strokePath();
  g.generateTexture('sun', 120, 120);
  g.clear();

  // -- doodle bird (44x26): classic "m" scribble ----------------------------------
  g.lineStyle(3, INK, 0.9);
  const bx = [4, 10, 16, 22, 28, 34, 40];
  const by = [18, 9, 14, 9, 14, 9, 18];
  for (let i = 0; i < bx.length - 1; i++) g.lineBetween(bx[i], by[i], bx[i + 1], by[i + 1]);
  g.generateTexture('bird', 44, 26);
  g.clear();

  // -- bush (100x64) ---------------------------------------------------------------
  g.fillStyle(0x6da57c, 1);
  g.fillCircle(30, 44, 20);
  g.fillCircle(52, 36, 24);
  g.fillCircle(74, 44, 18);
  g.lineStyle(3, INK, 1);
  g.strokeCircle(30, 44, 20);
  g.strokeCircle(52, 36, 24);
  g.strokeCircle(74, 44, 18);
  g.lineStyle(2, INK, 0.5);
  g.lineBetween(40, 30, 34, 44);
  g.lineBetween(56, 26, 50, 42);
  g.lineBetween(68, 34, 62, 46);
  g.generateTexture('bush', 100, 64);
  g.clear();

  // -- rock (76x54) -------------------------------------------------------------------
  g.fillStyle(0x9a9a9a, 1);
  const rp = [[6, 48], [14, 20], [34, 8], [58, 16], [70, 40], [64, 50]];
  for (let i = 0; i < rp.length; i++) {
    const p1 = rp[i], p2 = rp[(i + 1) % rp.length];
    g.fillTriangle(36, 34, p1[0], p1[1], p2[0], p2[1]);
  }
  g.lineStyle(3, INK, 1);
  for (let i = 0; i < rp.length; i++) {
    const p1 = rp[i], p2 = rp[(i + 1) % rp.length];
    g.lineBetween(p1[0], p1[1], p2[0], p2[1]);
  }
  g.lineStyle(2, INK, 0.6);
  g.lineBetween(30, 22, 36, 38);
  g.lineBetween(36, 38, 30, 46);
  g.generateTexture('rock', 76, 54);
  g.clear();

  // -- flower (36x56) -------------------------------------------------------------------
  g.lineStyle(3, 0x4a7c59, 1);
  g.lineBetween(18, 54, 18, 26);
  g.lineBetween(18, 40, 10, 34);
  g.fillStyle(0xff8ab3, 1);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillCircle(18 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 6);
  }
  g.fillStyle(0xffd93a, 1);
  g.fillCircle(18, 16, 5);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(18, 16, 5);
  g.generateTexture('flower', 36, 56);
  g.clear();

  // -- paper grain tile (128x128) --------------------------------------------------------
  for (let i = 0; i < 90; i++) {
    g.fillStyle(0x2b2b2b, 0.5);
    g.fillCircle(Math.random() * 128, Math.random() * 128, Math.random() * 1.2 + 0.3);
  }
  g.generateTexture('grain', 128, 128);
  g.clear();

  // -- floating platform slab (240x36) --------------------------------------
  g.fillStyle(0xe8e2cf, 1);
  g.fillRoundedRect(2, 2, 236, 32, 8);
  g.lineStyle(4, INK, 1);
  g.strokeRoundedRect(2, 2, 236, 32, 8);
  g.lineStyle(2, INK, 0.55);
  for (let x = 24; x < 230; x += 28) g.lineBetween(x, 6, x - 12, 30);
  g.lineStyle(5, INK, 1);
  g.lineBetween(4, 5, 236, 5); // heavy top edge
  g.generateTexture('platform', 240, 36);
  g.clear();

  // -- ground strip (2400x110) ----------------------------------------------
  g.fillStyle(0xded5b8, 1);
  g.fillRect(0, 0, 2400, 110);
  // pebbles
  g.fillStyle(0xc9bd9a, 1);
  for (let i = 0; i < 46; i++) {
    g.fillEllipse(Math.random() * 2400, 22 + Math.random() * 78,
      8 + Math.random() * 10, 5 + Math.random() * 5);
  }
  g.lineStyle(2, INK, 0.4);
  for (let x = 40; x < 2400; x += 90) g.lineBetween(x, 30, x - 22, 100);
  g.lineStyle(5, INK, 1);
  g.beginPath();
  g.moveTo(0, 4);
  for (let x = 0; x <= 2400; x += 60) g.lineTo(x + 30, 4 + (x % 120 === 0 ? -4 : 3));
  g.lineTo(2400, 4);
  g.strokePath();
  g.generateTexture('ground', 2400, 110);
  g.clear();

  // -- crate (64x64) ---------------------------------------------------------
  g.fillStyle(0xd9b380, 1);
  g.fillRect(2, 2, 60, 60);
  g.lineStyle(4, INK, 1);
  g.strokeRect(2, 2, 60, 60);
  g.lineStyle(3, INK, 1);
  g.lineBetween(4, 4, 60, 60);
  g.lineBetween(60, 4, 4, 60);
  // wood grain + corner nails
  g.lineStyle(2, INK, 0.4);
  g.lineBetween(10, 24, 54, 22);
  g.lineBetween(10, 44, 54, 46);
  g.fillStyle(INK, 1);
  g.fillCircle(10, 10, 2);
  g.fillCircle(54, 10, 2);
  g.fillCircle(10, 54, 2);
  g.fillCircle(54, 54, 2);
  g.generateTexture('crate', 64, 64);
  g.clear();

  // -- cloud (150x80) --------------------------------------------------------
  g.lineStyle(3, INK, 0.7);
  g.strokeCircle(45, 50, 24);
  g.strokeCircle(80, 40, 30);
  g.strokeCircle(115, 52, 20);
  g.generateTexture('cloud', 150, 80);
  g.clear();

  // -- distant mountain (420x280) --------------------------------------------
  g.lineStyle(4, INK, 0.55);
  g.strokeTriangle(10, 270, 210, 20, 410, 270);
  g.lineStyle(3, INK, 0.55);
  g.beginPath();
  g.moveTo(165, 85); g.lineTo(185, 110); g.lineTo(205, 88);
  g.lineTo(225, 112); g.lineTo(250, 82);
  g.strokePath(); // snow-cap scribble
  g.lineStyle(2, INK, 0.35);
  for (let i = 0; i < 4; i++) g.lineBetween(120 + i * 50, 160, 90 + i * 50, 240);
  g.generateTexture('mountain', 420, 280);
  g.clear();

  // -- mid hill (640x220) ----------------------------------------------------
  g.fillStyle(0xe6dfc8, 1);
  g.fillEllipse(320, 220, 640, 220);
  g.lineStyle(3, INK, 0.6);
  g.strokeEllipse(320, 220, 640, 220);
  g.generateTexture('hill', 640, 220);
  g.clear();

  // -- grass tuft (70x46) ----------------------------------------------------
  g.lineStyle(3, 0x4a7c59, 1);
  const blades = [[8, 44, 4, 14], [22, 44, 20, 8], [36, 44, 38, 12], [50, 44, 54, 10], [62, 44, 66, 18]];
  for (const [x1, y1, x2, y2] of blades) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 5;
    g.lineBetween(x1, y1, mx, my);
    g.lineBetween(mx, my, x2, y2);
  }
  g.generateTexture('tuft', 70, 46);
  g.clear();

  // -- soft dot for particles -------------------------------------------------
  g.fillStyle(0xffffff, 1);
  g.fillCircle(5, 5, 5);
  g.generateTexture('dot', 10, 10);

  g.destroy();
}

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('arena');
  }

  create() {
    makeTextures(this);

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ---- parallax background ------------------------------------------------
    // far mountains
    for (let i = 0; i < 7; i++) {
      const m = this.add.image(i * 380 - 100, 1080, 'mountain').setScrollFactor(0.2).setDepth(-30);
      m.setScale(0.9 + (i % 3) * 0.25);
      m.setAlpha(0.8);
    }
    // mid hills
    for (let i = 0; i < 5; i++) {
      this.add.image(i * 560 - 120, 1230, 'hill').setScrollFactor(0.45).setDepth(-20).setAlpha(0.9);
    }
    // drifting clouds
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(120, 560), 'cloud'
      ).setScrollFactor(0.3).setDepth(-10).setAlpha(0.85);
      c.speed = Phaser.Math.FloatBetween(6, 18);
      this.clouds.push(c);
    }

    // ---- solid world (from the selected map) -----------------------------------
    const map = MAPS[ui.map] || MAPS.yard;
    this.mapDef = map;
    this.solids = this.physics.add.staticGroup();
    this.solids.add(this.physics.add.staticImage(WORLD_W / 2, GROUND_TOP + 55, 'ground').refreshBody());

    for (const [px, py] of map.platforms) {
      this.solids.add(this.physics.add.staticImage(px, py, 'platform').refreshBody());
    }

    // breakable crates to hop on (3 hits each, respawn after 20s)
    this.crates = this.physics.add.staticGroup();
    const crateAt = (x, y) => {
      const c = this.crates.create(x, y, 'crate');
      c.setData('hp', 3);
      c.setData('hx', x);
      c.setData('hy', y);
      return c;
    };
    for (const [cx2, cdy] of map.crates) crateAt(cx2, GROUND_TOP + cdy);

    // ---- foreground dressing (in front of the player, no collision) ----------
    for (let x = 60; x < WORLD_W; x += 170) {
      this.add.image(x + Phaser.Math.Between(-30, 30), GROUND_TOP - 12, 'tuft')
        .setDepth(20).setScale(0.8 + Math.random() * 0.7).setAlpha(0.95);
    }

    // ---- doodle decorations (no collision) --------------------------------------
    // sleepy sun, fixed in the sky
    this.add.image(2150, 190, 'sun').setScrollFactor(0.15).setDepth(-25).setScale(1.2);
    // birds drifting with the clouds
    for (let i = 0; i < 6; i++) {
      this.add.image(Phaser.Math.Between(100, WORLD_W - 100), Phaser.Math.Between(150, 450), 'bird')
        .setScrollFactor(0.35).setDepth(-15).setScale(0.8 + Math.random() * 0.6).setAlpha(0.9);
    }
    // bushes, rocks and flowers along the ground
    for (let x = 120; x < WORLD_W; x += 260) {
      this.add.image(x + Phaser.Math.Between(-60, 60), GROUND_TOP - 20, 'bush')
        .setDepth(4).setScale(0.8 + Math.random() * 0.5);
    }
    for (let x = 300; x < WORLD_W; x += 430) {
      this.add.image(x + Phaser.Math.Between(-80, 80), GROUND_TOP - 12, 'rock')
        .setDepth(4).setScale(0.7 + Math.random() * 0.5);
    }
    for (let x = 200; x < WORLD_W; x += 340) {
      this.add.image(x + Phaser.Math.Between(-70, 70), GROUND_TOP - 18, 'flower')
        .setDepth(4).setScale(0.9);
    }
    // subtle paper grain over the whole world
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'grain')
      .setOrigin(0).setAlpha(0.05).setDepth(40);

    // ---- player ---------------------------------------------------------------
    const pSpawn = map.spawns[0] || { x: 1200, y: 1000 };
    this.player = this.physics.add.sprite(pSpawn.x, pSpawn.y, 'soldier');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(34, 58);
    this.player.body.setOffset(9, 10);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.crates);

    // jetpack flame (behind the player)
    this.flame = this.add.image(0, 0, 'flame').setDepth(9).setVisible(false);

    // jetpack smoke
    this.smoke = this.add.particles(0, 0, 'dot', {
      speed: { min: -30, max: 30 },
      y: { min: 20, max: 90 },
      lifespan: 500,
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 0.45, end: 0 },
      tint: 0x8a8a8a,
      frequency: 70,
      emitting: false,
    }).setDepth(9);

    // landing dust
    this.dust = this.add.particles(0, 0, 'dot', {
      speed: { min: 40, max: 160 },
      angle: { min: 200, max: 340 },
      lifespan: 450,
      scale: { start: 1.1, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xb9ac8d,
      emitting: false,
    }).setDepth(11);

    // ambient motes
    this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: WORLD_W },
      y: { min: 200, max: 1200 },
      lifespan: 6000,
      speedY: { min: -12, max: -4 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.2, max: 0.5 },
      alpha: { start: 0.35, end: 0 },
      frequency: 400,
    }).setDepth(-5);

    // ---- camera ----------------------------------------------------------------
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ---- input ------------------------------------------------------------------
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    // written by the DOM twin-stick controls (touch-controls.js)
    this.touchState = { moveX: 0, thrust: false, aimAngle: 0, aiming: false, firing: false };
    initTouchControls(this);
    setTouchUIVisible(ui.mode === 'mobile');

    // aim indicator (right stick on mobile, mouse on desktop)
    this.aimGfx = this.add.graphics().setDepth(9);

    // ---- fighters: you + bots -------------------------------------------------
    this.gun = this.add.image(0, 0, 'gun-rifle').setOrigin(0.15, 0.5).setDepth(11).setVisible(false);
    this.muzzle = this.add.image(0, 0, 'flash').setDepth(12).setVisible(false);
    this.fighterSprites = this.physics.add.group();
    this.fighterSprites.add(this.player);

    const mkFighter = (name, isBot, sprite, gun, tint) => {
      const f = {
        name, isBot, sprite, gun, weapon: null,
        hp: 100, alive: true, kills: 0, deaths: 0,
        aimAngle: 0, fireCd: 0, fuel: FUEL_MAX, baseTint: tint,
        label: null, ai: null,
      };
      sprite.setData('fighter', f);
      if (tint !== 0xffffff) { sprite.setTint(tint); gun.setTint(tint); }
      return f;
    };

    this.you = mkFighter('YOU', false, this.player, this.gun, 0xffffff);

    this.bots = [];
    const botTints = [0xffa3a3, 0xa3c8ff];
    const botNames = ['CPU-1', 'CPU-2'];
    for (let i = 0; i < ui.bots; i++) {
      const sp = map.spawns[(i + 1) % map.spawns.length];
      const bs = this.physics.add.sprite(sp.x, sp.y, 'soldier');
      bs.setDepth(10);
      bs.setCollideWorldBounds(true);
      bs.body.setSize(34, 58);
      bs.body.setOffset(9, 10);
      const bg = this.add.image(sp.x, sp.y, 'gun-rifle').setOrigin(0.15, 0.5).setDepth(11).setVisible(false);
      const f = mkFighter(botNames[i] || ('CPU-' + (i + 1)), true, bs, bg, botTints[i % botTints.length]);
      f.label = this.add.text(sp.x, sp.y - 54, f.name, {
        fontFamily: '"Segoe Print", "Comic Sans MS", cursive', fontSize: '13px', color: '#2b2b2b',
      }).setOrigin(0.5).setDepth(12);
      f.ai = {
        moveX: 0, thrust: false, firing: false,
        strafe: 1, strafeT: 0, thinkT: Math.random() * 0.3,
        wanderX: Phaser.Math.Between(200, WORLD_W - 200),
      };
      this.physics.add.collider(bs, this.solids);
      this.physics.add.collider(bs, this.crates);
      this.fighterSprites.add(bs);
      this.bots.push(f);
    }

    // ---- bullets ----------------------------------------------------------------
    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 80 });
    this.physics.add.collider(this.bullets, this.solids, (b) => this.killBullet(b, true));
    this.physics.add.collider(this.bullets, this.crates, (b, c) => { this.hitCrate(c); this.killBullet(b, true); });
    this.physics.add.overlap(this.bullets, this.fighterSprites, (b, fs) => {
      const f = fs.getData('fighter');
      if (!f || !f.alive || b.getData('owner') === f || this.matchOver) return;
      this.damageFighter(f, b.getData('damage') || 10, b.getData('owner'));
      this.killBullet(b, true);
    });

    // impact particles
    this.sparkBurst = this.add.particles(0, 0, 'dot', {
      speed: { min: 60, max: 240 }, lifespan: 320,
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [0xffd93a, 0xff8c2e, 0xffffff], emitting: false,
    }).setDepth(12);
    this.debrisBurst = this.add.particles(0, 0, 'dot', {
      speed: { min: 80, max: 320 }, lifespan: 750,
      scale: { start: 1.2, end: 0.2 }, gravityY: 900,
      alpha: { start: 1, end: 0 }, tint: 0xd9b380, emitting: false,
    }).setDepth(12);
    this.boomBurst = this.add.particles(0, 0, 'dot', {
      speed: { min: 100, max: 420 }, lifespan: 600,
      scale: { start: 1.6, end: 0.1 }, alpha: { start: 1, end: 0 },
      tint: [0xff5d5d, 0xff8c2e, 0x2b2b2b], emitting: false,
    }).setDepth(12);

    // ---- weapon pickups (from the map; respawn 12s after pickup) ------------------
    this.pickups = this.physics.add.staticGroup();
    this.pickupList = [];
    const pfont = '"Segoe Print", "Comic Sans MS", cursive';
    for (const pd of map.pickups) {
      const w = WEAPONS[pd.key];
      const img = this.physics.add.staticImage(pd.x, pd.y, w.tex).setDepth(9).setScale(1.2);
      const ring = this.add.image(pd.x, pd.y, 'ring').setDepth(8).setAlpha(0.7);
      const label = this.add.text(pd.x, pd.y + 30, w.name, {
        fontFamily: pfont, fontSize: '13px', color: '#2b2b2b',
      }).setOrigin(0.5, 0).setDepth(8);
      this.tweens.add({
        targets: [img, ring, label], y: '+=9', duration: 850,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.pickups.add(img);
      this.pickupList.push({ key: pd.key, x: pd.x, y: pd.y, img, ring, label });
    }
    this.physics.add.overlap(this.fighterSprites, this.pickups, (fs, item) => {
      const f = fs.getData('fighter');
      if (f && f.alive && !this.matchOver) this.collectWeapon(f, item);
    });

    // ---- match state ---------------------------------------------------------------
    this.matchOver = false;
    this.timeLeft = MATCH_TIME;
    this.KILLS_TO_WIN = KILLS_TO_WIN;

    // ---- HUD ----------------------------------------------------------------------
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const font = '"Segoe Print", "Comic Sans MS", cursive';

    hud.add(this.add.text(16, 12, 'SKETCH STRIKE', { fontFamily: font, fontSize: '22px', color: '#2b2b2b' }));
    hud.add(this.add.text(16, 40, map.name, { fontFamily: font, fontSize: '14px', color: '#6b6b6b' }));

    const bar = (x, y, w, label, color) => {
      const bg = this.add.rectangle(x, y, w, 14, 0xffffff).setOrigin(0, 0.5).setStrokeStyle(3, INK);
      const fill = this.add.rectangle(x + 2, y, w - 4, 10, color).setOrigin(0, 0.5);
      const t = this.add.text(x + w + 10, y, label, { fontFamily: font, fontSize: '14px', color: '#2b2b2b' }).setOrigin(0, 0.5);
      hud.add([bg, fill, t]);
      return fill;
    };
    const cx = this.scale.width / 2 - 120;
    this.hpFill = bar(cx, 26, 240, 'HP', 0xff5d8f);
    this.fuelFill = bar(cx, 50, 240, 'FUEL', 0x3aa7ff);
    this.ammoText = this.add.text(cx, 74, '', { fontFamily: font, fontSize: '15px', color: '#2b2b2b' });
    hud.add(this.ammoText);

    // score + timer, top right
    this.scoreText = this.add.text(this.scale.width - 16, 12, '', {
      fontFamily: font, fontSize: '18px', color: '#2b2b2b',
    }).setOrigin(1, 0);
    this.timerText = this.add.text(this.scale.width - 16, 38, '', {
      fontFamily: font, fontSize: '16px', color: '#6b6b6b',
    }).setOrigin(1, 0);
    hud.add([this.scoreText, this.timerText]);
    this.feedLines = [];
    this.updateScore();

    const isTouch = ui.mode === 'mobile';
    const hint = isTouch
      ? 'Left stick: move, push UP to fly   |   Right stick: aim, push far to fire'
      : 'A/D: move   |   W / SPACE: jetpack   |   mouse: aim, click: shoot (grab a gun!)';
    this.hintText = this.add.text(this.scale.width / 2, this.scale.height - 18, hint, {
      fontFamily: font, fontSize: '15px', color: '#2b2b2b', backgroundColor: '#f3efe3', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 1);
    hud.add(this.hintText);

    this.wasAirborne = false;
    this.fallSpeed = 0;

    // menu overlay on first load (DOM, wired in main.js; landscape only)
    if (!ui.started && window.SketchMenu) window.SketchMenu.show();
  }

  // ---- combat methods ---------------------------------------------------------

  equipWeapon(f, key) {
    const w = WEAPONS[key];
    f.weapon = {
      key, name: w.name, damage: w.damage, interval: w.interval,
      speed: w.speed, pellets: w.pellets, spread: w.spread, ammo: w.ammo,
    };
    f.gun.setTexture(w.tex).setVisible(f.alive);
    if (f === this.you) this.updateAmmoText();
  }

  updateAmmoText() {
    if (!this.ammoText) return;
    this.ammoText.setText(this.you.weapon ? this.you.weapon.name + '  ' + this.you.weapon.ammo : '');
  }

  updateScore() {
    if (!this.scoreText) return;
    const foes = this.bots.reduce((s, b) => s + b.kills, 0);
    this.scoreText.setText('YOU ' + this.you.kills + '  -  ' + foes + ' FOES');
    const m = Math.floor(Math.max(0, this.timeLeft) / 60);
    const s = Math.floor(Math.max(0, this.timeLeft) % 60);
    this.timerText.setText(m + ':' + String(s).padStart(2, '0') + '  (first to ' + this.KILLS_TO_WIN + ')');
  }

  feed(text) {
    const t = this.add.text(this.scale.width - 16, 66 + this.feedLines.length * 22, text, {
      fontFamily: '"Segoe Print", "Comic Sans MS", cursive', fontSize: '14px',
      color: '#2b2b2b', backgroundColor: '#f3efe3', padding: { x: 8, y: 2 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.feedLines.push(t);
    if (this.feedLines.length > 4) this.feedLines.shift().destroy();
    this.tweens.add({ targets: t, alpha: 0.25, duration: 2600, onComplete: () => {
      const i = this.feedLines.indexOf(t);
      if (i >= 0) this.feedLines.splice(i, 1);
      t.destroy();
    }});
    // re-stack survivors
    this.feedLines.forEach((ln, i) => ln.setY(66 + i * 22));
  }

  collectWeapon(f, item) {
    if (!item.active) return;
    const def = this.pickupList.find((e) => e.img === item);
    if (!def) return;
    this.equipWeapon(f, def.key);
    item.disableBody(true, true);
    def.ring.setVisible(false);
    def.label.setVisible(false);
    this.time.delayedCall(12000, () => {
      item.enableBody(true, def.x, def.y, true, true);
      def.ring.setVisible(true);
      def.label.setVisible(true);
    });
    if (f === this.you) {
      const t = this.add.text(f.sprite.x, f.sprite.y - 64, '+ ' + WEAPONS[def.key].name, {
        fontFamily: '"Segoe Print", "Comic Sans MS", cursive', fontSize: '18px', color: '#2b2b2b',
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: '-=44', alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }
  }

  spawnBullet(x, y, angle, w, owner) {
    const b = this.bullets.get(x, y, 'bullet');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(10).setRotation(angle);
    b.body.enable = true;
    b.setData('damage', w.damage);
    b.setData('owner', owner);
    b.setData('life', 1100);
    this.physics.velocityFromRotation(angle, w.speed, b.body.velocity);
  }

  killBullet(b, spark) {
    if (!b.active) return;
    if (spark) this.sparkBurst.explode(6, b.x, b.y);
    b.body.setVelocity(0, 0);
    b.body.enable = false;
    this.bullets.killAndHide(b);
  }

  fireWeapon(f, angle) {
    const w = f.weapon;
    if (!w) return;
    f.fireCd = w.interval * (f.isBot ? 1.7 : 1); // bots shoot a touch slower
    w.ammo -= 1;
    const s = f.sprite;
    const side = Math.cos(angle) < 0 ? -1 : 1;
    const gx = s.x + side * 16, gy = s.y + 8;
    const mx = gx + Math.cos(angle) * 42, my = gy + Math.sin(angle) * 42;
    const n = w.pellets;
    for (let i = 0; i < n; i++) {
      const a = n > 1
        ? angle + ((i - (n - 1) / 2) * (w.spread / Math.max(1, n - 1)))
        : angle + (Math.random() - 0.5) * 0.04;
      this.spawnBullet(mx, my, a, w, f);
    }
    if (f === this.you) {
      this.muzzle.setPosition(mx, my).setRotation(angle).setVisible(true)
        .setScale(0.8 + Math.random() * 0.5);
      this.time.delayedCall(45, () => this.muzzle.setVisible(false));
      if (w.key !== 'rifle') this.cameras.main.shake(70, 0.0022);
    } else {
      this.sparkBurst.explode(4, mx, my);
    }
    if (w.ammo <= 0) {
      f.weapon = null;
      f.gun.setVisible(false);
    }
    if (f === this.you) this.updateAmmoText();
  }

  hitCrate(c) {
    const hp = c.getData('hp') - 1;
    if (hp <= 0) {
      this.debrisBurst.explode(14, c.x, c.y);
      const hx = c.getData('hx'), hy = c.getData('hy');
      c.disableBody(true, true);
      this.time.delayedCall(20000, () => {
        c.enableBody(true, hx, hy, true, true);
        c.setData('hp', 3);
        c.clearTint();
      });
    } else {
      c.setData('hp', hp);
      c.setTint(hp === 2 ? 0xc7a06b : 0xa8825a); // cracks show as darker wood
    }
  }

  damageFighter(f, dmg, attacker) {
    if (!f.alive || this.matchOver) return;
    f.hp -= dmg;
    f.sprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      if (f.alive) f.sprite.setTint(f.baseTint);
    });
    if (f.hp <= 0) this.killFighter(f, attacker);
  }

  killFighter(f, attacker) {
    f.alive = false;
    f.deaths += 1;
    f.hp = 0;
    f.weapon = null;
    f.gun.setVisible(false);
    f.sprite.setVisible(false).setTint(f.baseTint);
    if (f.label) f.label.setVisible(false);
    this.boomBurst.explode(22, f.sprite.x, f.sprite.y);
    if (attacker && attacker !== f) {
      attacker.kills += 1;
      this.feed(attacker.name + ' zapped ' + f.name);
    } else {
      this.feed(f.name + ' went boom');
    }
    this.updateScore();
    if (attacker && attacker.kills >= this.KILLS_TO_WIN) {
      this.endMatch(attacker);
      return;
    }
    this.time.delayedCall(2500, () => this.respawnFighter(f));
  }

  respawnFighter(f) {
    if (this.matchOver) return;
    const sp = this.mapDef.spawns[Math.floor(Math.random() * this.mapDef.spawns.length)];
    f.hp = 100;
    f.fuel = FUEL_MAX;
    f.fireCd = 0;
    f.alive = true;
    f.sprite.setPosition(sp.x, sp.y).setVelocity(0, 0).setVisible(true);
    f.gun.setVisible(false);
    if (f.label) f.label.setVisible(true);
    if (f === this.you) this.updateAmmoText();
  }

  endMatch(winner) {
    if (this.matchOver) return;
    this.matchOver = true;
    let title, sub;
    if (!winner) {
      title = 'DRAW!';
      sub = 'time up - scores level';
    } else if (winner.isBot) {
      title = 'DEFEAT';
      sub = winner.name + ' takes it ' + winner.kills + ' - ' + this.you.kills;
    } else {
      const best = Math.max(0, ...this.bots.map((b) => b.kills));
      title = 'VICTORY!';
      sub = 'you take it ' + winner.kills + ' - ' + best;
    }
    if (window.SketchMenu) window.SketchMenu.showEnd(title, sub);
  }

  decideOnTime() {
    const all = [this.you, ...this.bots].sort((a, b) => b.kills - a.kills);
    return (all.length > 1 && all[0].kills === all[1].kills) ? null : all[0];
  }

  updateControlHint() {
    if (!this.hintText) return;
    this.hintText.setText(ui.mode === 'mobile'
      ? 'Left stick: move, push UP to fly   |   Right stick: aim, push far to fire'
      : 'A/D: move   |   W / SPACE: jetpack   |   mouse: aim, click: shoot (grab a gun!)');
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const p = this.player;
    const body = p.body;
    const k = this.keys;
    const ts = this.touchState;
    const you = this.you;
    const playing = ui.started && !this.matchOver;

    // ---- player movement (only when alive) ------------------------------------
    if (you.alive) {
      const left = k.LEFT.isDown || k.A.isDown || ts.moveX < -0.18;
      const right = k.RIGHT.isDown || k.D.isDown || ts.moveX > 0.18;
      const thrust = k.UP.isDown || k.W.isDown || k.SPACE.isDown || ts.thrust;

      let mx = (right ? 1 : 0) - (left ? 1 : 0);
      if (mx === 0 && Math.abs(ts.moveX) > 0.18) mx = ts.moveX;
      const onGround = body.blocked.down || body.touching.down;
      if (onGround) {
        body.velocity.x = mx * RUN_SPEED;
      } else if (mx !== 0) {
        const target = mx * RUN_SPEED;
        body.velocity.x += Phaser.Math.Clamp(target - body.velocity.x, -AIR_ACCEL * dt, AIR_ACCEL * dt);
      } else {
        body.velocity.x *= Math.pow(0.02, dt); // air drag
      }

      // jetpack
      const thrusting = thrust && you.fuel > 0;
      if (thrusting) {
        body.velocity.y = JETPACK_VY;
        you.fuel = Math.max(0, you.fuel - FUEL_DRAIN * dt);
      } else if (onGround) {
        you.fuel = Math.min(FUEL_MAX, you.fuel + FUEL_REGEN * dt);
      }

      // aim: right stick on mobile, mouse on desktop
      const pointer = this.input.activePointer;
      if (ui.mode === 'mobile') {
        you.aimAngle = ts.aiming ? ts.aimAngle : (p.flipX ? Math.PI : 0);
      } else {
        you.aimAngle = Math.atan2(pointer.worldY - p.y, pointer.worldX - p.x);
      }
      const wantFire = playing && (ui.mode === 'mobile' ? ts.firing : pointer.leftButtonDown());

      // facing + lean (aim overrides movement facing)
      if (ui.mode === 'desktop' || ts.aiming) {
        p.setFlipX(Math.cos(you.aimAngle) < 0);
      } else if (body.velocity.x > 20) {
        p.setFlipX(false);
      } else if (body.velocity.x < -20) {
        p.setFlipX(true);
      }
      p.setAngle(Phaser.Math.Clamp(body.velocity.x * 0.03, -14, 14));

      // gun follows the aim
      if (you.weapon) {
        const a = you.aimAngle;
        const side = Math.cos(a) < 0 ? -1 : 1;
        this.gun.setPosition(p.x + side * 16, p.y + 8)
          .setRotation(a).setScaleY(side < 0 ? -1 : 1).setVisible(true);
      } else {
        this.gun.setVisible(false);
      }

      // fire the weapon
      you.fireCd -= dt;
      if (you.weapon && wantFire && you.fireCd <= 0 && you.weapon.ammo > 0) {
        this.fireWeapon(you, you.aimAngle);
      }

      // aim indicator
      this.aimGfx.clear();
      const showAim = ui.mode === 'mobile' ? ts.aiming : !!you.weapon;
      if (showAim) {
        const a = you.aimAngle;
        const ax = Math.cos(a), ay = Math.sin(a);
        const len = you.weapon ? 130 : 82;
        this.aimGfx.lineStyle(3, INK, you.weapon ? 0.9 : 0.5);
        this.aimGfx.lineBetween(p.x + ax * 30, p.y + ay * 30, p.x + ax * len, p.y + ay * len);
        this.aimGfx.strokeCircle(p.x + ax * len, p.y + ay * len, 7);
        if (wantFire && you.weapon) {
          this.aimGfx.fillStyle(0xffd93a, 1);
          this.aimGfx.fillCircle(p.x + ax * len, p.y + ay * len, 10);
        }
      }

      // flame follows the jetpack nozzle
      const facing = p.flipX ? -1 : 1;
      const nx = p.x - facing * 18;
      const ny = p.y + 6;
      this.flame.setVisible(thrusting);
      if (thrusting) {
        this.flame.setPosition(nx, ny + 22).setFlipX(p.flipX);
        this.flame.setScale(1, 0.7 + Math.random() * 0.7);
        this.smoke.emitting = true;
        this.smoke.setPosition(nx, ny + 34);
      } else {
        this.smoke.emitting = false;
      }

      // landing dust
      const airborne = !onGround;
      if (this.wasAirborne && !airborne && this.fallSpeed > 500) {
        this.dust.explode(10, p.x, p.y + 32);
      }
      this.wasAirborne = airborne;
      this.fallSpeed = body.velocity.y;
    } else {
      this.aimGfx.clear();
      this.flame.setVisible(false);
      this.smoke.emitting = false;
    }

    // ---- bots -------------------------------------------------------------------
    if (playing) {
      for (const b of this.bots) this.updateBot(b, dt);
    }

    // ---- bullets lifecycle ---------------------------------------------------------
    for (const bl of this.bullets.getChildren()) {
      if (!bl.active) continue;
      bl.setData('life', bl.getData('life') - delta);
      if (bl.getData('life') <= 0 || bl.x < -40 || bl.x > WORLD_W + 40 || bl.y < -40 || bl.y > WORLD_H + 40) {
        this.killBullet(bl, false);
      }
    }

    // ---- match timer ------------------------------------------------------------------
    if (playing) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.updateScore();
        this.endMatch(this.decideOnTime());
      } else if (Math.floor(this.timeLeft * 2) !== Math.floor((this.timeLeft + dt) * 2)) {
        this.updateScore(); // refresh the clock twice a second
      }
    }

    // clouds drift + wrap
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      if (c.x < -160) c.x = WORLD_W + 160;
    }

    // HUD
    this.hpFill.setDisplaySize(236 * (you.hp / 100), 10);
    this.fuelFill.setDisplaySize(236 * (you.fuel / FUEL_MAX), 10);
  }

  // ---- bot AI: think twice a second, act every frame ------------------------------
  thinkBot(f) {
    const ai = f.ai;
    const s = f.sprite;
    const tp = this.you;
    let tx, ty, mode;
    if (!f.weapon) {
      // grab the nearest available gun
      let best = null, bd = 1e12;
      for (const it of this.pickupList) {
        if (!it.img.active) continue;
        const d = Phaser.Math.Distance.Between(s.x, s.y, it.x, it.y);
        if (d < bd) { bd = d; best = it; }
      }
      if (best) { tx = best.x; ty = best.y; mode = 'seek'; }
      else {
        tx = ai.wanderX; ty = s.y; mode = 'seek';
        if (Math.abs(s.x - tx) < 60) ai.wanderX = Phaser.Math.Between(200, WORLD_W - 200);
      }
    } else if (tp.alive) {
      tx = tp.sprite.x; ty = tp.sprite.y; mode = 'combat';
    } else {
      tx = s.x; ty = s.y; mode = 'idle';
    }
    const dx = tx - s.x;
    const onGround = s.body.blocked.down || s.body.touching.down;
    if (mode === 'combat') {
      ai.strafeT -= 0.3;
      if (ai.strafeT <= 0) {
        ai.strafeT = 1 + Math.random() * 1.5;
        ai.strafe = Math.random() < 0.5 ? -1 : 1;
      }
      const dist = Math.abs(dx);
      ai.moveX = dist > 420 ? Math.sign(dx) : (dist < 240 ? -Math.sign(dx) : ai.strafe);
      const trueA = Math.atan2(ty - s.y, tx - s.x);
      f.aimAngle = trueA + (Math.random() - 0.5) * 0.22; // shaky aim
      ai.firing = dist < 780;
      ai.thrust = ty < s.y - 70 || (!onGround && Math.random() < 0.06);
    } else if (mode === 'seek') {
      ai.moveX = Math.abs(dx) > 50 ? Math.sign(dx) : 0;
      f.aimAngle = Math.atan2(ty - s.y, tx - s.x);
      ai.firing = false;
      // hop when stuck against something, fly up to high pickups
      ai.thrust = ty < s.y - 90 || (ai.moveX !== 0 && onGround && Math.abs(s.body.velocity.x) < 40);
    } else {
      ai.moveX = 0; ai.thrust = false; ai.firing = false;
    }
  }

  updateBot(f, dt) {
    const ai = f.ai;
    const s = f.sprite;
    const body = s.body;
    if (!f.alive) return;
    ai.thinkT -= dt;
    if (ai.thinkT <= 0) {
      ai.thinkT = 0.25 + Math.random() * 0.2;
      this.thinkBot(f);
    }
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) {
      body.velocity.x = ai.moveX * RUN_SPEED;
    } else if (ai.moveX !== 0) {
      const target = ai.moveX * RUN_SPEED;
      body.velocity.x += Phaser.Math.Clamp(target - body.velocity.x, -AIR_ACCEL * dt, AIR_ACCEL * dt);
    } else {
      body.velocity.x *= Math.pow(0.02, dt);
    }
    if (ai.thrust && f.fuel > 15) {
      body.velocity.y = JETPACK_VY;
      f.fuel = Math.max(0, f.fuel - FUEL_DRAIN * dt);
    } else if (onGround) {
      f.fuel = Math.min(FUEL_MAX, f.fuel + FUEL_REGEN * dt);
    }
    s.setFlipX(Math.cos(f.aimAngle) < 0);
    s.setAngle(Phaser.Math.Clamp(body.velocity.x * 0.03, -14, 14));
    if (f.weapon) {
      const a = f.aimAngle;
      const side = Math.cos(a) < 0 ? -1 : 1;
      f.gun.setPosition(s.x + side * 16, s.y + 8)
        .setRotation(a).setScaleY(side < 0 ? -1 : 1).setVisible(true);
    } else {
      f.gun.setVisible(false);
    }
    f.fireCd -= dt;
    if (f.weapon && ai.firing && f.fireCd <= 0 && f.weapon.ammo > 0) {
      this.fireWeapon(f, f.aimAngle);
    }
    if (f.label) f.label.setPosition(s.x, s.y - 54);
  }
}
