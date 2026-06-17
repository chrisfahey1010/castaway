# Castaway

Castaway is a browser fishing game built with TypeScript, Vite, and BabylonJS. You pilot a raft around a tropical island, cast into different water zones, catch fish, unlock better equipment, and fill out a collection log.

## Features

- Top-down BabylonJS world with an island, shallow lagoon, reef, and open ocean zones.
- Raft movement with zone-based speed changes and obstacle collision.
- Fishing loop with casting, bites, hook timing, reeling, fish tension, escapes, and catches.
- Fish collection log, inventory, records, progression unlocks, rods, lines, bait types, and bait depths.
- HUD and touch controls for desktop and mobile play.
- Autosave using browser `localStorage`.
- Generated WebAudio sound effects, so no audio files are required for the MVP.

## Requirements

- Node.js 20 or newer is recommended.
- npm, using the checked-in `package-lock.json`.

## Getting Started

Install dependencies:

```sh
npm ci
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

Run a focused TypeScript check:

```sh
npx tsc --noEmit
```

## Controls

- Move or steer the raft with `WASD` or arrow keys.
- Aim with the mouse.
- Hold left click or `Space` to cast and reel.
- Click or press `Space` during a bite to hook the fish.
- Use on-screen controls on touch devices.
- Press `/` to toggle the developer view.

## Gameplay Notes

- Water zones are radial bands around the island: Shallows, Reef, and Ocean.
- Fish availability depends on the current zone, equipped bait, bait depth, and loot tables.
- Better rods, fishing lines, bait types, and bait depths unlock through progression.
- Saves are stored under `castaway.save.v1` in `localStorage`.
- Resetting or starting a new game is available through the HUD.

## Project Structure

```text
index.html             Browser entry HTML with #game-canvas and #hud-root
src/main.ts            Game bootstrap
src/style.css          Page and HUD styling
src/game/Game.ts       Main game wiring and update loop
src/game/assets        Asset manifest, loader, and registry
src/game/audio         WebAudio and sound playback
src/game/data          Equipment, fish, fishing zones, and loot tables
src/game/fishing       Casting, bites, fights, catches, and fish spawning
src/game/input         Keyboard, pointer, and touch input handling
src/game/inventory     Inventory and collection log state
src/game/player        Raft, rod, and player controllers
src/game/state         Saveable game, player, and progression state
src/game/ui            HUD, fishing UI, inventory UI, collection log, toasts
src/game/world         Island, water, zones, collision, and camera control
public/assets          Static sprite assets
```

## Development Notes

- The render loop update order in `src/game/Game.ts` is intentional: input, player/world/camera, fishing, HUD, autosave, then input frame cleanup.
- The scene uses X/Z for map movement and Y for elevation.
- The camera is an orthographic top-down `FreeCamera`.
- Missing future asset manifest entries should not break MVP behavior.
- There are currently no test, lint, or formatter scripts.
