import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene.js';
import { ui, MAPS } from './state.js';
import { setTouchUIVisible } from './touch-controls.js';

// NOTE: the game instance lives on window.__sketchStrikeGame, NOT window.game.
// Some browser environments (automation harnesses, extensions) pre-populate a
// global called `window.game`, which once crashed our boot via an unguarded
// `window.game.scene.getScene()` call. Unique name + guarded access.

// ---- mobile web: landscape-first -------------------------------------------
// The game is designed for landscape. On phones held in portrait we show a
// tappable "rotate your phone" overlay. Browsers never let a page rotate the
// device on its own - the closest the web allows is: from a user tap, go
// fullscreen and *request* landscape lock (honored by Android Chrome; iOS
// can't lock, so manual rotation is the fallback there).
const isMobile =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && Math.min(window.screen.width, window.screen.height) < 820);
ui.isMobile = isMobile;
try {
  ui.mode = localStorage.getItem('sketch-mode') || (isMobile ? 'mobile' : 'desktop');
} catch (e) {
  ui.mode = isMobile ? 'mobile' : 'desktop';
}

// desktop/mobile control-mode toggle: in desktop mode the touch sticks hide
const modeBtn = document.getElementById('mode-btn');
function applyMode() {
  const mobile = ui.mode === 'mobile';
  setTouchUIVisible(mobile);
  if (modeBtn) modeBtn.textContent = mobile ? 'MOBILE' : 'DESKTOP';
  try { localStorage.setItem('sketch-mode', ui.mode); } catch (e) {}
  const g = window.__sketchStrikeGame;
  const arena = (g && g.scene) ? g.scene.getScene('arena') : null;
  if (arena && arena.updateControlHint) arena.updateControlHint();
}
if (modeBtn) {
  modeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ui.mode = ui.mode === 'mobile' ? 'desktop' : 'mobile';
    applyMode();
  });
}

const rotateHint = document.getElementById('rotate-hint');
const fsBtn = document.getElementById('fs-btn');

// (overlay visibility is managed by applyOverlays below, which also handles
// portrait pausing; checkOrientation is just its resize-friendly alias)

// Re-measure the canvas after anything that changes the viewport: rotation,
// fullscreen toggles, and the Android URL bar showing/hiding (which only
// fires visualViewport.resize). Double-refresh because layout needs a beat
// to settle, otherwise the game can get stuck rendering small.
function refreshGame() {
  if (!window.__sketchStrikeGame) return;
  [120, 450].forEach((ms) => setTimeout(() => window.__sketchStrikeGame.scale.refresh(), ms));
}

window.addEventListener('resize', () => { checkOrientation(); refreshGame(); });
window.addEventListener('orientationchange', () => {
  setTimeout(() => { checkOrientation(); refreshGame(); }, 250);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', refreshGame);
}

async function setFullscreen(on) {
  try {
    if (on) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      if (isMobile && screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock('landscape'); } catch (e) { /* not allowed */ }
      }
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch (e) { /* denied or unsupported */ }
}

function syncFsBtn() {
  if (fsBtn) fsBtn.textContent = document.fullscreenElement ? 'EXIT' : 'FULL';
}

if (fsBtn) {
  fsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setFullscreen(!document.fullscreenElement);
  });
}
if (rotateHint) {
  // tapping the portrait prompt = "rotate itself": fullscreen + landscape lock
  rotateHint.addEventListener('click', () => setFullscreen(true));
}
document.addEventListener('fullscreenchange', () => {
  syncFsBtn();
  refreshGame();
});
syncFsBtn();
checkOrientation();
applyMode();

// no long-press menu / text selection getting in the way of the game
document.addEventListener('contextmenu', (e) => { if (isMobile) e.preventDefault(); });

// main menu + end-of-match card (DOM overlays, wired to the arena scene)
function arenaScene() {
  const g = window.__sketchStrikeGame;
  return (g && g.scene) ? g.scene.getScene('arena') : null;
}
function restartArena() {
  const a = arenaScene();
  if (a) a.scene.restart();
}

// Overlay rules: the game is landscape-first.
// - portrait phone: ONLY the rotate prompt shows (no menu, no sticks visible)
// - landscape / desktop: rotate prompt hides; menu shows when it should
// - rotating to portrait mid-match pauses the physics world; back resumes
function applyOverlays() {
  const portrait = window.innerHeight > window.innerWidth;
  const hint = isMobile && portrait;
  if (rotateHint) rotateHint.style.display = hint ? 'flex' : 'none';
  const menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = (ui.wantMenu && !hint) ? 'flex' : 'none';
  const a = arenaScene();
  if (a && !a.matchOver) {
    if (!ui.started || hint) a.physics.world.pause();
    else a.physics.world.resume();
  }
}
function checkOrientation() { applyOverlays(); }

window.SketchMenu = {
  show() { ui.wantMenu = true; applyOverlays(); },
  hide() { ui.wantMenu = false; applyOverlays(); },
  showEnd(title, sub) {
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-sub').textContent = sub;
    document.getElementById('endcard').style.display = 'flex';
  },
  hideEnd() { document.getElementById('endcard').style.display = 'none'; },
};
document.querySelectorAll('#map-row button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#map-row button').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    ui.map = b.dataset.map;
  });
});
document.getElementById('start-btn').addEventListener('click', () => {
  ui.started = true;
  window.SketchMenu.hide();
  restartArena();
});
document.getElementById('rematch-btn').addEventListener('click', () => {
  window.SketchMenu.hideEnd();
  restartArena();
});
document.getElementById('tomenu-btn').addEventListener('click', () => {
  ui.started = false;
  window.SketchMenu.hideEnd();
  restartArena(); // create() shows the menu again since ui.started is false
});

// map preview thumbnails, drawn from the real MAPS data (side-view mini maps)
function drawMapThumb(key) {
  const m = MAPS[key];
  if (!m) return '';
  const W = 264, H = 156;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const sx = W / 2400, sy = H / 1420;
  c.fillStyle = '#f3efe3';
  c.fillRect(0, 0, W, H);
  // ground strip
  c.fillStyle = '#ded5b8';
  c.fillRect(0, 1310 * sy, W, H - 1310 * sy);
  c.fillStyle = '#2b2b2b';
  c.fillRect(0, 1310 * sy, W, 2);
  // platforms
  for (const [x, y] of m.platforms) c.fillRect(x * sx - 13, y * sy - 2, 26, 4);
  // crates
  for (const [x, dy] of m.crates) {
    const y = 1310 + dy;
    c.fillRect(x * sx - 4, y * sy - 4, 8, 8);
  }
  // weapon pickups (rifle grey, scatter orange, bolt blue)
  const cols = { rifle: '#3d3d3d', scatter: '#c96f2e', bolt: '#3aa7ff' };
  for (const p of m.pickups) {
    c.fillStyle = cols[p.key] || '#2b2b2b';
    c.beginPath(); c.arc(p.x * sx, p.y * sy, 5, 0, 7); c.fill();
  }
  // spawn points
  c.fillStyle = '#4a7c59';
  for (const s of m.spawns) {
    c.beginPath(); c.arc(s.x * sx, s.y * sy, 3.5, 0, 7); c.fill();
  }
  return cv.toDataURL();
}
document.querySelectorAll('#map-row button').forEach((b) => {
  const img = b.querySelector('.map-thumb');
  if (img) img.src = drawMapThumb(b.dataset.map);
});

window.__sketchStrikeGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f3efe3',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1500 }, debug: false },
  },
  scene: [ArenaScene],
});
