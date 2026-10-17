import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene.js';

new Phaser.Game({
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
