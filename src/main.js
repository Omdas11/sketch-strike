import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene.js';

// ---- mobile web: landscape-first -------------------------------------------
// The game is designed for landscape. On phones held in portrait we show a
// "rotate your phone" overlay; on the first tap we best-effort request
// fullscreen + orientation lock (Android Chrome). iOS can't lock
// programmatically, so the overlay prompt is the fallback there.
const isMobile =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && Math.min(window.screen.width, window.screen.height) < 820);

const rotateHint = document.getElementById('rotate-hint');
function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  if (rotateHint) rotateHint.style.display = isMobile && portrait ? 'flex' : 'none';
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 250));
checkOrientation();

let lockAttempted = false;
window.addEventListener('pointerdown', async () => {
  if (!isMobile || lockAttempted) return;
  lockAttempted = true;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (e) { /* denied or unsupported */ }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) { /* iOS / not fullscreen: overlay prompt covers it */ }
}, { passive: true });

// no long-press menu / text selection getting in the way of the game
document.addEventListener('contextmenu', (e) => { if (isMobile) e.preventDefault(); });

window.game = new Phaser.Game({
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
