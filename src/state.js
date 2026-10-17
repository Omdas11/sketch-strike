// Shared UI state between main.js (DOM/mode buttons) and the scene.
export const ui = {
  mode: 'desktop', // 'desktop' | 'mobile'
  isMobile: false,
  map: 'yard', // 'yard' | 'sky' | 'maze'
  bots: 2,
  started: false, // flips true when the player presses START in the menu
  wantMenu: false, // menu overlay intent (main.js decides if it actually shows)
};

// Three original arena layouts. Coordinates are world-space; platforms and
// crates are axis-aligned doodle slabs, pickups are weapon keys, spawns are
// {x, y} points spread across the map.
export const MAPS = {
  yard: {
    name: 'Doodle Yard',
    spawns: [{ x: 300, y: 1100 }, { x: 2100, y: 1100 }, { x: 1200, y: 500 }],
    platforms: [
      [500, 1050], [950, 880], [1400, 1060], [1850, 880],
      [1200, 660], [300, 700], [2100, 700],
    ],
    crates: [[700, -32], [700, -96], [764, -32], [1700, -32]],
    pickups: [
      { key: 'rifle', x: 950, y: 830 },
      { key: 'scatter', x: 1560, y: 1294 },
      { key: 'bolt', x: 1200, y: 610 },
    ],
  },
  sky: {
    name: 'Sky Bridges',
    spawns: [{ x: 300, y: 1100 }, { x: 2100, y: 1100 }, { x: 1200, y: 300 }],
    platforms: [
      [350, 1150], [750, 1000], [1200, 1120], [1650, 1000], [2050, 1150],
      [550, 800], [1000, 700], [1400, 700], [1850, 800],
      [750, 480], [1200, 420], [1650, 480], [1200, 220],
    ],
    crates: [[1200, -32], [1168, -32]],
    pickups: [
      { key: 'rifle', x: 1000, y: 650 },
      { key: 'scatter', x: 1400, y: 650 },
      { key: 'bolt', x: 1200, y: 370 },
      { key: 'rifle', x: 1200, y: 170 },
    ],
  },
  maze: {
    name: 'Crate Maze',
    spawns: [{ x: 200, y: 1100 }, { x: 2200, y: 1100 }, { x: 1200, y: 1100 }],
    platforms: [
      [600, 950], [1200, 900], [1800, 950],
      [900, 650], [1500, 650],
    ],
    crates: [
      [400, -32], [400, -96], [900, -32], [964, -32], [1100, -32],
      [1300, -32], [1364, -32], [1500, -32], [1500, -96],
      [2000, -32], [2000, -96], [2064, -32],
    ],
    pickups: [
      { key: 'rifle', x: 600, y: 900 },
      { key: 'scatter', x: 1800, y: 900 },
      { key: 'bolt', x: 1200, y: 850 },
      { key: 'scatter', x: 1200, y: 1294 },
    ],
  },
};

// crate y values above are offsets from GROUND_TOP (1310); resolved by scene.
export const GROUND_TOP = 1310;
