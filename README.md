# Sketch Strike (working title)

An original 2D jetpack arena-shooter playground for the web. Phase 1: a
controllable doodle soldier in a sketch-style arena - run around, fly with the
jetpack, get a feel for the movement. No bots, no shooting yet.

## Originality note

All code and artwork in this repo are original (the doodle art is drawn in
code at runtime). The game *logic* is inspired by the 2D jetpack-shooter genre
(Mini Militia-style movement: run + fuel-limited jetpack, weapon pickups,
arena combat). No sprites, sounds, music, or names are taken from Mini Militia
or any other game. The working title "Sketch Strike" is original.

## Controls

- Desktop: A/D or arrow keys to move, hold W / Up / Space for the jetpack.
- Touch: left third of the screen = move left, right third = move right,
  middle third = jetpack thrust.

Watch the blue fuel bar - the jetpack only works while it has fuel, and fuel
refills when you touch the ground.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # static build in dist/
```

Deploys as a static site (Vercel).

## Roadmap

- Phase 1 (this): movement playground - player, jetpack, arena, HUD.
- Phase 2: arsenal + pickups, kill feed, mobile twin-stick aiming, bots.
- Phase 3: peer-to-peer multiplayer rooms.
- Phase 4: polish - particles, sound, scoreboard, rematch.
