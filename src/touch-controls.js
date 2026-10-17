// DOM twin-stick touch controls (Mini Militia layout):
// left stick = move, right stick = aim (push past ~55% to fire), FLY = jetpack.
// Writes into scene.touchState every pointer event; the scene reads it in update().
export function setTouchUIVisible(v) {
  const el = document.getElementById('touch-ui');
  if (el) el.style.display = v ? 'block' : 'none';
}

export function initTouchControls(scene) {
  const ts = scene.touchState;
  const leftEl = document.getElementById('stick-left');
  const rightEl = document.getElementById('stick-right');
  const flyEl = document.getElementById('btn-fly');
  if (!leftEl || !rightEl || !flyEl || !ts) return;

  makeStick(leftEl, (x) => {
    ts.moveX = Math.abs(x) < 0.18 ? 0 : x; // deadzone
  });

  makeStick(rightEl, (x, y, active, mag) => {
    ts.aiming = active;
    if (active) {
      ts.aimAngle = Math.atan2(y, x);
      ts.firing = mag > 0.55; // push the stick out to shoot, like the original
    } else {
      ts.firing = false;
    }
  });

  const setFly = (v) => {
    ts.thrust = v;
    flyEl.classList.toggle('held', v);
  };
  flyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { flyEl.setPointerCapture(e.pointerId); } catch (err) {}
    setFly(true);
  });
  flyEl.addEventListener('pointerup', () => setFly(false));
  flyEl.addEventListener('pointercancel', () => setFly(false));
}

function makeStick(baseEl, onMove) {
  const knob = baseEl.querySelector('.knob');
  const R = 46; // max knob travel in px
  let pid = null;

  const render = (dx, dy) => {
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  };

  const handle = (e) => {
    const r = baseEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 0.0001;
    const mag = Math.min(len / R, 1);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    render(dx, dy);
    onMove(dx / R, dy / R, len > 10, mag);
  };

  baseEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    try { baseEl.setPointerCapture(pid); } catch (err) {}
    handle(e);
  });
  baseEl.addEventListener('pointermove', (e) => {
    if (e.pointerId === pid) handle(e);
  });
  const release = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    render(0, 0);
    onMove(0, 0, false, 0);
  };
  baseEl.addEventListener('pointerup', release);
  baseEl.addEventListener('pointercancel', release);
}
