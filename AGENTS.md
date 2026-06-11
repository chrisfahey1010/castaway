# AGENTS.md

## Commands
- Install dependencies with `npm ci`; this repo uses `package-lock.json`.
- Start the dev server with `npm run dev`; Vite is configured to bind `0.0.0.0` in `vite.config.ts`.
- Use `npm run build` for full verification; it runs `tsc` before `vite build`.
- Use `npx tsc --noEmit` for a focused TypeScript check.
- There are no repo test, lint, or formatter scripts yet; do not invent `npm test`/lint commands.

## App Shape
- Browser entry is `index.html` -> `/src/main.ts`; required DOM nodes are `#game-canvas` and `#hud-root`.
- `src/game/Game.ts` wires the Babylon engine, scene, assets, world, input, player, fishing, HUD, autosave, and render loop.
- Gameplay is a top-down BabylonJS scene: X/Z are map movement axes and Y is height/elevation.
- The camera is an orthographic `FreeCamera`; keep top-down readability unless intentionally changing camera behavior.
- Keep data in `src/game/data/*`, state in `src/game/state/*`, and rendering/controllers/systems under their existing `src/game/*` areas.

## Game Flow
- `Game.update` order is significant: input -> player/world/camera -> fishing -> HUD -> autosave -> `input.endFrame()`.
- Movement controls are W/A/S/D or arrow keys; fishing/interaction is pointer primary button or Space.
- Fishing zones are radial rings from `GAME_CONFIG.world` and `fishingZones`; land/obstacles reject casts through `World.isWaterPosition`.
- Saves use `localStorage` key `castaway.save.v1`; `GameState.applySave` ignores mismatched versions rather than migrating.

## Assets And Audio
- Current public assets are only `public/assets/sprites/raft.png` and `public/assets/sprites/palmtree.png`.
- Other `assetManifest` entries are placeholders/future assets; missing textures should not break MVP behavior.
- Audio currently comes from generated WebAudio tones in `AudioManager`, not files from `assetManifest.audio`.

## TypeScript Conventions
- `tsconfig.json` is strict and enables `noUnusedLocals`/`noUnusedParameters`; remove unused code or prefix intentionally unused parameters with `_`.
- Relative imports are extensionless; `allowImportingTsExtensions` is false and module resolution is `bundler`.
