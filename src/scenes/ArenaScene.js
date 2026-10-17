import Phaser from 'phaser';
import { ui } from '../state.js';
import { initTouchControls, setTouchUIVisible } from '../touch-controls.js';

// ---------------------------------------------------------------------------
// ArenaScene - Phase 1 movement playground.
// A controllable doodle soldier in a sketch-style arena: run + fuel-limited
// jetpack, parallax notebook-paper background, platforms and crates.
// No bots, no shooting yet - this is the feel test.
// ---------------------------------------------------------------------------

const WORLD_W = 2400;
const WORLD_H = 1420;
const GROUND_TOP = 1310;

const INK = 0x2b2b2b;
const RUN_SPEED = 360;
const AIR_ACCEL = 2200;
const JETPACK_VY = -640;
const FUEL_MAX = 100;
const FUEL_DRAIN = 42; // per second while thrusting
const FUEL_REGEN = 34; // per second while on the ground

function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // -- doodle soldier (52x68), faces right --------------------------------
  g.clear();
  g.lineStyle(4, INK, 1);
  // jetpack (on the back, left side)
  g.fillStyle(0xc96f2e, 1);
  g.fillRoundedRect(2, 34, 12, 22, 3);
  g.strokeRoundedRect(2, 34, 12, 22, 3);
  g.lineStyle(3, INK, 1);
  g.lineBetween(8, 56, 8, 60); // nozzle
  // legs
  g.lineStyle(5, INK, 1);
  g.lineBetween(22, 54, 20, 64);
  g.lineBetween(32, 54, 35, 64);
  // boots
  g.fillStyle(INK, 1);
  g.fillRect(14, 62, 10, 5);
  g.fillRect(31, 62, 10, 5);
  // body
  g.fillStyle(0x5b8dd9, 1);
  g.fillRoundedRect(16, 36, 22, 18, 5);
  g.lineStyle(4, INK, 1);
  g.strokeRoundedRect(16, 36, 22, 18, 5);
  // arm
  g.lineStyle(4, INK, 1);
  g.lineBetween(34, 42, 44, 48);
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(45, 49, 4);
  g.strokeCircle(45, 49, 4);
  // head
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(28, 28, 9);
  g.strokeCircle(28, 28, 9);
  // eye (looking right)
  g.fillStyle(INK, 1);
  g.fillCircle(32, 27, 2);
  // helmet
  g.fillStyle(0x8a8f98, 1);
  g.fillEllipse(28, 20, 30, 18);
  g.lineStyle(4, INK, 1);
  g.strokeEllipse(28, 20, 30, 18);
  g.lineStyle(4, INK, 1);
  g.lineBetween(11, 22, 45, 22); // brim
  g.generateTexture('soldier', 52, 70);
  g.clear();

  // -- jetpack flame (24x40), drawn pointing down ---------------------------
  g.fillStyle(0xff8c2e, 1);
  g.fillTriangle(2, 0, 22, 0, 12, 40);
  g.fillStyle(0xffd93a, 1);
  g.fillTriangle(7, 0, 17, 0, 12, 26);
  g.generateTexture('flame', 24, 40);
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

    // ---- solid world ---------------------------------------------------------
    const solids = this.physics.add.staticGroup();
    solids.add(this.physics.add.staticImage(WORLD_W / 2, GROUND_TOP + 55, 'ground').refreshBody());

    const platformAt = (x, y) => solids.add(this.physics.add.staticImage(x, y, 'platform').refreshBody());
    platformAt(500, 1050);
    platformAt(950, 880);
    platformAt(1400, 1060);
    platformAt(1850, 880);
    platformAt(1200, 660);
    platformAt(300, 700);
    platformAt(2100, 700);

    // crates to hop on
    const crate = (x, y) => solids.add(this.physics.add.staticImage(x, y, 'crate').refreshBody());
    crate(700, GROUND_TOP - 32);
    crate(700, GROUND_TOP - 96);
    crate(764, GROUND_TOP - 32);
    crate(1700, GROUND_TOP - 32);

    // ---- foreground dressing (in front of the player, no collision) ----------
    for (let x = 60; x < WORLD_W; x += 170) {
      this.add.image(x + Phaser.Math.Between(-30, 30), GROUND_TOP - 12, 'tuft')
        .setDepth(20).setScale(0.8 + Math.random() * 0.7).setAlpha(0.95);
    }

    // ---- player ---------------------------------------------------------------
    this.player = this.physics.add.sprite(1200, 1000, 'soldier');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(34, 58);
    this.player.body.setOffset(9, 10);
    this.physics.add.collider(this.player, solids);

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

    // aim indicator (right stick); firing flash plugs into weapons in phase 2
    this.aimGfx = this.add.graphics().setDepth(9);

    // ---- HUD ----------------------------------------------------------------------
    this.fuel = FUEL_MAX;
    this.health = 100;
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const font = '"Segoe Print", "Comic Sans MS", cursive';

    hud.add(this.add.text(16, 12, 'SKETCH STRIKE', { fontFamily: font, fontSize: '22px', color: '#2b2b2b' }));
    hud.add(this.add.text(16, 40, 'movement playground', { fontFamily: font, fontSize: '14px', color: '#6b6b6b' }));

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

    const isTouch = ui.mode === 'mobile';
    const hint = isTouch
      ? 'Left stick: move   |   Right stick: aim, push far to fire   |   FLY: jetpack'
      : 'A/D or arrows: move   |   hold W / UP / SPACE: jetpack (watch the blue bar)';
    this.hintText = this.add.text(this.scale.width / 2, this.scale.height - 18, hint, {
      fontFamily: font, fontSize: '15px', color: '#2b2b2b', backgroundColor: '#f3efe3', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 1);
    hud.add(this.hintText);

    this.wasAirborne = false;
    this.fallSpeed = 0;
  }

  updateControlHint() {
    if (!this.hintText) return;
    this.hintText.setText(ui.mode === 'mobile'
      ? 'Left stick: move   |   Right stick: aim, push far to fire   |   FLY: jetpack'
      : 'A/D or arrows: move   |   hold W / UP / SPACE: jetpack (watch the blue bar)');
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const p = this.player;
    const body = p.body;
    const k = this.keys;
    const ts = this.touchState;

    const left = k.LEFT.isDown || k.A.isDown || ts.moveX < -0.18;
    const right = k.RIGHT.isDown || k.D.isDown || ts.moveX > 0.18;
    const thrust = k.UP.isDown || k.W.isDown || k.SPACE.isDown || ts.thrust;

    // horizontal movement: keyboard is digital, left stick is analog
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
    const thrusting = thrust && this.fuel > 0;
    if (thrusting) {
      body.velocity.y = JETPACK_VY;
      this.fuel = Math.max(0, this.fuel - FUEL_DRAIN * dt);
    } else if (onGround) {
      this.fuel = Math.min(FUEL_MAX, this.fuel + FUEL_REGEN * dt);
    }

    // facing + lean (aim stick overrides movement facing)
    if (ts.aiming) {
      p.setFlipX(Math.cos(ts.aimAngle) < 0);
    } else if (body.velocity.x > 20) {
      p.setFlipX(false);
    } else if (body.velocity.x < -20) {
      p.setFlipX(true);
    }
    p.setAngle(Phaser.Math.Clamp(body.velocity.x * 0.03, -14, 14));

    // aim indicator + firing flash (mobile mode; weapons plug in next phase)
    this.aimGfx.clear();
    if (ts.aiming && ui.mode === 'mobile') {
      const ax = Math.cos(ts.aimAngle), ay = Math.sin(ts.aimAngle);
      const x2 = p.x + ax * 82, y2 = p.y + ay * 82;
      this.aimGfx.lineStyle(3, INK, 0.8);
      this.aimGfx.lineBetween(p.x + ax * 30, p.y + ay * 30, x2, y2);
      this.aimGfx.strokeCircle(x2, y2, 7);
      if (ts.firing) {
        this.aimGfx.fillStyle(0xffd93a, 1);
        this.aimGfx.fillCircle(x2, y2, 10);
        this.aimGfx.lineStyle(3, 0xff8c2e, 1);
        this.aimGfx.strokeCircle(x2, y2, 15);
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

    // clouds drift + wrap
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      if (c.x < -160) c.x = WORLD_W + 160;
    }

    // HUD
    this.hpFill.setDisplaySize(236 * (this.health / 100), 10);
    this.fuelFill.setDisplaySize(236 * (this.fuel / FUEL_MAX), 10);
  }
}
