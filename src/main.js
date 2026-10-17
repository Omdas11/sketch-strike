import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene.js';
import { ui } from './state.js';
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

function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  if (rotateHint) rotateHint.style.display = isMobile && portrait ? 'flex' : 'none';
}

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
