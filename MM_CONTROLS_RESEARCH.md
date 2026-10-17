# Mini Militia UI / Controls — research spec for Sketch Strike

Source: user request 2026-10-17 ~21:28 IST — "Still not fixed. Go study the
mini militia UI and controls and implement it, improve the graphics and maps,
currently all are geometry shapes only, use REA skill to reverse engineer the
mini militia app for the website but with different open source assets."

Method note: the REA skill was NOT run against the Mini Militia APK. REA's
Android tooling exists, but (a) deep decompilation engines (JADX/Ghidra) are
not installed here, (b) we have no Mini Militia APK locally, and (c) pulling
its proprietary art/audio/code out of the commercial app would be copyright
infringement. The user's own framing — "with different open source assets" —
keeps this in the legal lane the project already claims: same game logic
recreated, zero copied art/sound/name. The scheme below is compiled from
public documentation (reviews, guides, wikis), which is enough to clone the
FEEL without touching the binary.

---

## 1. The actual Mini Militia control scheme (public sources)

Doodle Army 2: Mini Militia (Appsomniacs LLC). Dual-stick layout:

- **Left virtual joystick (bottom-left):** moves the soldier left/right.
  Pushing the stick UP fires the jetpack — there is no separate fly button in
  the modern layout. (This matches what the user already asked for:
  "control up should fly the character".)
- **Right virtual joystick (bottom-right):** aims the weapon; pushing it out
  past a threshold fires in that direction. Newer versions also auto-fire
  once the aim is on a target (aim-assist).
- **Between the sticks (bottom-center-right):** two round buttons —
  GRENADE icon and FIST (melee) icon — for close encounters.
- **Top-right corner:** current-weapon box. Tapping it switches weapons;
  tapping the AMMO indicator beside it reloads. A zoom-capacity readout sits
  with the weapon box (long for snipers, short for pistols).
- **Top-center:** two bars — HEALTH (pink) and JETPACK FUEL (blue).
- **Above every soldier:** floating name label + small health bar.
- Match flow: players drop in from the sky with a primary + secondary weapon
  and a few grenades; ~6:30 rounds; quick respawns; kill feed.

Sources: mouthshut.com Mini Militia review (detailed HUD/control breakdown);
gettoplists.com ("Left joystick: Move / Right joystick: Aim and shoot /
Tap icons: Switch weapons, throw grenades, or activate jetpacks");
taptap.io review ("dual-stick... one virtual stick controls movement, and
the other controls aiming and firing" + jetpack as the defining feature);
appdecider.com (dual-stick, auto-fire on target); filesusr PDF
("Intuitive double stick shooting control with jetpack flight", zoom
control, melee attacks, dual wield, grenades).

## 2. Gap analysis — Sketch Strike (Phase 2, commit 5a1e872) vs MM

Already matches MM: twin sticks, left-up = fly, right-stick aim + push-to-fire,
pink HP bar, blue fuel bar, 3 pickup weapons, killfeed, 5:00 / first-to-7 loop.

Missing MM pieces (implementation order suggested):
1. **Grenade + melee (fist) buttons** between the sticks (DOM buttons, like
   the existing sticks). Grenades: arcing throwable, small AoE. Melee: short
   range, high damage, knockback.
2. **Top-right weapon box:** shows current weapon icon + ammo; tap to swap
   primary/secondary; tap ammo to reload. (Currently weapons are single-slot
   pickups; MM gives every player a basic pistol + pickups upgrade it.)
3. **Floating name + health bar above every soldier** (player + CPU-1/CPU-2).
   This is the single biggest "looks like Mini Militia" cue.
4. **Zoom readout** next to the weapon box per weapon (rifle 1x, scatter 1x,
   bolt 3x — cosmetic at first, real zoom later).
5. **Drop-in spawn:** players fall from the sky at match start (MM's iconic
   opening) instead of appearing on platforms.
6. **Auto-fire assist option** (fire when aim is on a target) — MM has it;
   keep it toggleable so purists keep manual push-to-fire.

## 3. Graphics / maps — open-source asset leads (no MM assets)

User complaint: "currently all are geometry shapes only". Constraints: zero
MM art, zero copied sprites. Leads, all with clean licenses:

- **Kenney (kenney.nl) — CC0, no attribution.** The single best source.
  - "Onscreen Controls" pack: ready-made virtual joystick bases/knobs and
    round touch buttons — ideal for grenade/fist buttons.
  - "UI Pack" / "Input Prompts": buttons, panels, icons for the weapon box,
    ammo, menu.
  - Platformer packs (e.g. Platformer Art Deluxe): terrain tiles and
    parallax backgrounds to replace the flat doodle slabs. Style will shift
    from notebook-doodle to clean cartoon — a deliberate art-direction call
    for the user (doodle is MM's signature; Kenney is cleaner).
  - SFX packs (Interface Sounds, etc.): WebAudio-ready UI/weapon sounds —
    Phase 2 has no sound at all.
- **OpenGameArt.org — filter by CC0.** The "2D - Complete Characters"
  collection lists candidates worth checking individually (verify each page's
  license before use): "SNES Style Soldier Sprite", "Soldier Ak47,M4",
  "Space Soldier (M484 Games)", "Jetpack robot", "MV Platformer Male (32x64)".
  https://opengameart.org/content/2d-complete-characters
- **game-icons.net — CC-BY 3.0 (attribution required).** Grenade and fist
  icons that visually match MM's grenade/fist buttons. Attribution line in
  README + credits screen satisfies the license.
- **Fallback / recommended:** keep the ORIGINAL hand-drawn doodle soldier
  (it's the game's identity and avoids license/style-clash risk), but redraw
  it as proper sprite frames (idle/run/fly/aim) instead of code-drawn
  geometry, and give maps textured doodle terrain (grass tufts, cracked
  earth, clouds already exist — extend that language). Original art = zero
  legal risk, keeps the "Sketch" in Sketch Strike.

## 4. "Controller still not working" — ranked hypotheses (2026-10-17)

The 15:19 IST fix addressed the portrait overlay (z-50) covering the sticks
(z-30). The user reports it is still broken. Ranked by likelihood:

1. **Stale tab (most likely).** The fix only exists in the NEW deploy. If the
   user's phone tab was opened before ~20:50 IST and never reloaded, it is
   still running the OLD JS where the portrait overlay eats all touches.
   Fix: hard-reload the page on the phone (or close/reopen the tab). The
   15:19 message never explicitly said "reload the page".
2. **Control mode stuck on DESKTOP.** `ui.mode` persists in localStorage
   ('sketch-mode'); if the user ever tapped the DESKTOP/MOBILE toggle, the
   sticks are `display:none` and nothing responds. The button label shows the
   CURRENT mode, which reads ambiguously. Check: is #touch-ui visible at all?
3. **Genuine touch-pipeline bug in landscape** (unconfirmed). Code review of
   touch-controls.js + main.js + ArenaScene.js found no smoking gun; the
   consumption logic (update(), lines ~734+) reads ts.moveX/ts.thrust/
   ts.aiming/ts.firing correctly. Note: initTouchControls() re-runs on every
   scene.restart(), stacking duplicate pointer listeners on the stick
   elements (harmless but leaky — should guard with an initialized flag).
4. **Physics paused behind a stale rotate hint.** applyOverlays() pauses the
   world when `innerHeight > innerWidth`; if orientation state went stale
   (URL-bar resize without orientationchange), the game looks alive but
   frozen — feels like "controller not working".

**Diagnostic plan (same technique that cracked the black-screen bug):**
ship a temporary on-page touch-debug badge showing, live: pointerdown/move/up
counts per stick, current ts.moveX / ts.thrust / ts.aiming / ts.firing, and
ui.mode. One phone tap sequence identifies which of (1)-(4) it is; remove
the badge after. Do NOT attempt a third blind fix — ask the user for the
badge readout (or a screen recording) first.

## 5. Suggested build order for the MM pass

1. Touch-debug badge → confirm root cause of the stick failure → fix it.
2. Grenade + fist buttons, weapon box top-right (Kenney onscreen-controls /
   game-icons.net assets), floating name+HP bars, drop-in spawn.
3. Soldier sprite frames (original doodle art, properly drawn) + textured
   doodle terrain for the 3 maps; MM-style HUD polish (zoom readout).
4. Sound (Kenney CC0 SFX via WebAudio).
5. THEN multiplayer/PvP/LAN lobby (separate session — netcode, rooms, sync).

Multiplayer stays out of this pass per the 9pm scope decision already
communicated to the user.
