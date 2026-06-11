# Castaway — Browser Game Implementation Plan

## 1. Project Summary

**Castaway** is a top-down fishing/exploration browser game set around a tropical desert island. The player controls a stranded castaway rowing a small raft through shallow lagoons, coral reefs, and deeper offshore waters. The core loop is:

1. Explore waters around the island.
2. Find promising fishing spots.
3. Cast a fishing line.
4. Wait for a bite.
5. Hook the fish.
6. Complete a short reeling/tension mini-game.
7. Catch, catalog, and optionally use or sell the fish.
8. Unlock better gear and explore farther from shore.

The project should be built with extensibility in mind so future sprites, fish species, raft upgrades, zones, weather, sounds, and progression systems can be added without rewriting the core engine.

Use **BabylonJS + TypeScript** as the rendering/game framework. Treat the game as a **2.5D top-down scene** rather than a flat HTML canvas game. This allows attractive water, particles, lighting, camera effects, and later 3D or pseudo-3D assets.

---

## 2. Recommended Tech Stack

Use:

* **Vite**
* **TypeScript**
* **BabylonJS**
* **@babylonjs/core**
* **@babylonjs/gui**
* **@babylonjs/loaders**
* **Howler.js** or a simple custom Babylon audio wrapper
* **localStorage** for MVP saves
* Optional later: IndexedDB for larger save data

Avoid React for the actual game loop unless there is a strong reason. A simple Vite + TypeScript app is cleaner for a game. React can be added later for surrounding website menus, but the game itself should be controlled by BabylonJS and plain TypeScript systems.

---

## 3. Visual Direction

The game should feel like a cozy survival/fishing game, not a hardcore simulator.

Target visual style:

* Bright tropical colors
* Clear shallow water near shore
* Darker blue deeper water offshore
* Soft animated waves
* Coral patches and sandbars
* Palm-covered island center
* Small raft with a castaway character
* Fish shadows moving below the water
* Splash/ripple particles when casting or catching fish
* Day/night or late-afternoon lighting as a future upgrade

Initial assets can be simple placeholders:

* Raft: textured plane or simple colored rectangle
* Player: tiny sprite attached to raft
* Fish: colored simple sprites/shadows
* Bobber: small red/white sphere or sprite
* Island: irregular sand/grass mesh or layered flat shapes
* Water: large plane with animated material

The game should be designed so real sprites can be swapped in later through asset manifests.

---

## 4. BabylonJS Scene Setup

Use Babylon’s standard 3D coordinate system but constrain gameplay to a top-down 2D plane.

Recommended world plane:

* X axis: horizontal map position
* Z axis: vertical map position
* Y axis: height/elevation

Camera:

* Use an orthographic camera looking downward at the X/Z plane.
* Camera follows the raft smoothly.
* Slight camera smoothing is important so movement feels polished.
* Optional: very slight camera tilt later for a 2.5D look, but MVP should stay readable and top-down.

Scene layers:

1. Water plane
2. Underwater zone tint overlays
3. Island sand/grass geometry
4. Rocks/coral/obstacles
5. Fish shadows/sprites
6. Raft/player/bobber
7. Particles/ripples
8. GUI/HUD

Do not make the game tile-based unless necessary. Use free movement with collision boundaries.

---

## 5. Core Game Architecture

Use a modular system-based architecture. Do not put everything in one `main.ts`.

Recommended folder structure:

```txt
src/
  main.ts
  game/
    Game.ts
    SceneFactory.ts
    GameLoop.ts
    constants.ts

    assets/
      AssetLoader.ts
      AssetRegistry.ts
      assetManifest.ts

    state/
      GameState.ts
      SaveManager.ts
      PlayerState.ts

    input/
      InputManager.ts
      KeyboardInput.ts
      PointerInput.ts

    world/
      World.ts
      Island.ts
      Water.ts
      Zones.ts
      Collision.ts
      CameraController.ts

    player/
      RaftController.ts
      PlayerController.ts
      RodController.ts

    fishing/
      FishingSystem.ts
      CastSystem.ts
      Bobber.ts
      BiteSystem.ts
      FishFightSystem.ts
      CatchResolver.ts
      FishSpawner.ts
      FishSpecies.ts

    inventory/
      Inventory.ts
      CollectionLog.ts
      Equipment.ts

    ui/
      Hud.ts
      FishingUI.ts
      InventoryUI.ts
      CollectionLogUI.ts
      Toasts.ts

    audio/
      AudioManager.ts

    data/
      fishSpecies.ts
      fishingZones.ts
      equipment.ts
      lootTables.ts

    utils/
      math.ts
      random.ts
      timers.ts
```

The coding agent should keep game logic separate from Babylon rendering where practical. For example, fish species data should not live inside sprite code.

---

## 6. Major Systems

### 6.1 Game Class

Responsible for:

* Creating the Babylon engine
* Creating the scene
* Initializing systems
* Running the update loop
* Handling resize/dispose
* Managing high-level game state

Pseudo-flow:

```ts
const game = new Game(canvas);
await game.init();
game.start();
```

The `Game` class should own:

* `engine`
* `scene`
* `assetLoader`
* `world`
* `input`
* `player`
* `fishingSystem`
* `ui`
* `audio`
* `saveManager`

---

### 6.2 Asset Loader / Asset Registry

Build a data-driven asset system from the beginning.

The game should load from a manifest like:

```ts
export const assetManifest = {
  textures: {
    waterNormal: "/assets/textures/water-normal.png",
    raftPlaceholder: "/assets/sprites/raft-placeholder.png",
    bobber: "/assets/sprites/bobber.png",
    fishShadow: "/assets/sprites/fish-shadow.png"
  },
  spritesheets: {
    fish: {
      url: "/assets/sprites/fish-sheet.png",
      cellWidth: 64,
      cellHeight: 64
    }
  },
  audio: {
    cast: "/assets/audio/cast.mp3",
    splash: "/assets/audio/splash.mp3",
    catchSuccess: "/assets/audio/catch-success.mp3"
  }
};
```

MVP can use generated placeholder materials, but the code should already expect replaceable assets.

Requirements:

* Centralize all asset paths.
* No hardcoded asset URLs inside gameplay systems.
* Missing assets should fail gracefully with placeholders.
* Support future spritesheets for raft, fish, bobber, water effects, and character animations.

---

### 6.3 World System

The world contains the island, water, collision boundaries, and fishing zones.

World should include:

* Central island
* Shallow lagoon
* Reef ring
* Deep water edge
* A few rocks/coral obstacles
* Invisible map boundary

Recommended starting map:

```txt
             Deep Water
      ~~~~~~~~~~~~~~~~~~~~~
   ~~~~~~~~ Reef Zone ~~~~~~~~
  ~~~~~~~~ Shallows ~~~~~~~~~~~
  ~~~~      Island       ~~~~~~
  ~~~~~~~~ Shallows ~~~~~~~~~~~
   ~~~~~~~~ Reef Zone ~~~~~~~~
      ~~~~~~~~~~~~~~~~~~~~~
```

Zones should be data-driven polygons or circles.

Example zone data:

```ts
export interface FishingZone {
  id: string;
  name: string;
  type: "shore" | "lagoon" | "reef" | "deep";
  center: { x: number; z: number };
  radius: number;
  depth: number;
  colorTint?: string;
  fishTable: WeightedFishSpawn[];
}
```

Different fish should appear in different zones.

---

### 6.4 Water System

Water should make the game feel alive.

MVP water:

* Large plane
* Blue material
* Subtle animated UV offset
* Optional normal map
* Slight opacity/tint changes by zone

Polish pass:

* Procedural wave shader
* Shoreline foam
* Ripple particles near raft
* Splash effect when casting
* Circular ripple where bobber lands
* Fish shadow movement under the surface

The coding agent should prioritize a good simple water effect early because this game lives or dies visually on the ocean feel.

---

### 6.5 Raft Movement System

The raft should feel like it is rowing through water, not sliding on ice or moving like a car.

Controls:

* `WASD` / arrow keys: move
* Mouse: aim fishing cast
* Left click or space: cast/reel/interact
* Escape: pause/menu

Movement model:

* Acceleration-based movement
* Water drag
* Max speed
* Rotation toward movement direction
* Slight bobbing animation
* Slower movement in shallow/coral zones
* Collision against island/rocks/map boundary

Suggested raft physics variables:

```ts
interface RaftMovementConfig {
  acceleration: number;
  maxSpeed: number;
  drag: number;
  turnSpeed: number;
  shallowSpeedMultiplier: number;
}
```

Do not use a full physics engine for MVP unless necessary. Simple circle collision and velocity integration should be enough.

---

## 7. Fishing Gameplay

Fishing should be the central mechanic and should feel better than a random “press button, get fish” system.

### 7.1 Fishing State Machine

Use a clear state machine:

```ts
type FishingState =
  | "idle"
  | "aiming"
  | "chargingCast"
  | "casting"
  | "waitingForBite"
  | "biteWindow"
  | "hooked"
  | "reeling"
  | "caught"
  | "escaped";
```

State flow:

```txt
idle
  -> aiming
  -> chargingCast
  -> casting
  -> waitingForBite
  -> biteWindow
  -> hooked
  -> reeling
  -> caught / escaped
```

### 7.2 Casting

Casting should include:

* Aim direction based on mouse position relative to raft
* Hold button to charge cast power
* Release to cast
* Bobber arcs or travels outward to target point
* Bobber lands with splash/ripple
* If cast lands on island/rock, fail or bounce back
* If cast lands in water, enter waiting state

Variables:

```ts
interface CastConfig {
  minDistance: number;
  maxDistance: number;
  chargeTimeMax: number;
  castTravelSpeed: number;
  invalidCastPenaltySeconds: number;
}
```

### 7.3 Bite Logic

When the bobber is in water:

* Determine current fishing zone.
* Pick possible fish from that zone’s weighted fish table.
* Apply modifiers:

  * distance from shore
  * time of day, future
  * bait/lure, future
  * rod quality, future
  * fish rarity
* Start randomized bite timer.
* Show subtle bobber movement before bite.
* When bite happens, open hook timing window.

Bite window:

* Player must press reel/interact within a limited time.
* Easy fish have longer windows.
* Rare/aggressive fish have shorter windows.
* Missing the window causes escape.

### 7.4 Fish Fight / Reeling Mini-game

For MVP, use a simple tension meter.

Mechanic:

* Player holds/repeatedly presses reel button.
* Reeling increases progress but also increases line tension.
* Fish pulls away, increasing tension.
* Letting go reduces tension.
* If tension exceeds max, line snaps.
* If progress reaches 100%, fish is caught.
* If fight timer runs out or fish stamina beats player, fish escapes.

Fish-specific variables:

```ts
interface FishFightStats {
  stamina: number;
  strength: number;
  erraticness: number;
  baseTensionGain: number;
  progressResistance: number;
}
```

The fight should feel different by fish:

* Small fish: quick, forgiving
* Reef fish: moderate fight
* Barracuda/tuna: high tension spikes
* Rare fish: longer fight, more erratic

### 7.5 Catch Resolution

When caught:

* Show catch modal/toast:

  * fish name
  * size
  * rarity
  * weight
  * new record indicator
* Add fish to inventory
* Add fish to collection log
* Play sound
* Spawn splash/celebration particles

Catch size should be randomized within species range:

```ts
interface FishSizeRange {
  minCm: number;
  maxCm: number;
  trophyCm: number;
}
```

---

## 8. Fish Species Data

All fish should be defined in data files, not hardcoded.

Example:

```ts
export interface FishSpecies {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  habitats: FishingZoneType[];
  minDepth: number;
  maxDepth: number;
  minLengthCm: number;
  maxLengthCm: number;
  trophyLengthCm: number;
  baseValue: number;
  biteChanceModifier: number;
  fight: FishFightStats;
  spriteKey: string;
}
```

Initial fish list:

### Common

* **Lagoon Minnow**

  * Small starter fish
  * Easy to catch
  * Found in shallow lagoon

* **Silver Sardine**

  * Common schooling fish
  * Fast bite rate
  * Low value

* **Blue Tang**

  * Colorful reef fish
  * Easy/moderate fight

### Uncommon

* **Parrotfish**

  * Reef fish
  * Moderate value
  * Stronger fight

* **Red Snapper**

  * Reef/deeper edge fish
  * Good early-game catch

* **Needlefish**

  * Quick, erratic fight
  * Shorter hook window

### Rare

* **Barracuda**

  * Aggressive reef predator
  * High tension spikes

* **Mahi-Mahi**

  * Deep water fish
  * Valuable, fast fight

* **Grouper**

  * Heavy reef fish
  * Slow but strong

### Legendary / Special

* **Stormfin Tuna**

  * Deep water rare fish
  * Long fight
  * Requires better rod later

* **Golden Trevally**

  * Rare reef fish
  * Trophy catch

* **Island Marlin**

  * Endgame fish
  * Deep water only
  * High difficulty

For MVP, implement 6–8 species first, but structure data to support many more.

---

## 9. Player Progression

MVP progression should be simple but satisfying.

Player has:

* Fish inventory
* Collection log
* Best size records
* Basic rod
* Basic raft

Possible progression systems:

### Collection Log

Tracks:

* First catch
* Largest catch
* Number caught
* Rarity
* Habitat
* Description

### Equipment

Start with:

```ts
interface Rod {
  id: string;
  name: string;
  castDistanceMultiplier: number;
  hookWindowModifier: number;
  tensionLimit: number;
  reelSpeed: number;
}
```

Initial rods:

* Driftwood Rod
* Bamboo Rod
* Salvaged Fiberglass Rod
* Storm Rod

MVP only needs one rod, but code should support upgrades.

### Inventory

For MVP:

* Store caught fish
* Allow release/delete
* Track collection log
* Optional simple “value” number

Later:

* Sell fish to passing trader
* Cook fish
* Use fish as bait
* Craft upgrades

---

## 10. UI / HUD

Use Babylon GUI or HTML overlay. For fastest development, Babylon GUI is fine for in-game HUD; HTML can be used for menus if easier.

HUD elements:

* Current zone name
* Current rod
* Cast power meter
* Fishing state prompt
* Bite alert
* Tension meter
* Reel progress meter
* Inventory button
* Collection log button
* Toast notifications

Fishing UI states:

```txt
Idle:          "Move with WASD. Aim with mouse. Hold click to cast."
Charging:      Cast power bar fills.
Waiting:       "Waiting for a bite..."
Bite:          "BITE! Click now!"
Reeling:       Tension meter + progress bar.
Caught:        Catch card.
Escaped:       "It got away..."
```

Catch card should be fun and satisfying:

```txt
Caught!
Red Snapper
42 cm — 1.4 kg
Uncommon
New record!
```

---

## 11. Audio

Add simple audio hooks from the start, even if placeholder sounds are used.

Sounds:

* Water ambience loop
* Paddle/rowing sound
* Cast whoosh
* Bobber splash
* Bite plop
* Reel clicking
* Line tension warning
* Catch success
* Fish escape
* UI click

AudioManager should expose:

```ts
audio.play("cast");
audio.play("splash");
audio.playLoop("oceanAmbience");
audio.stop("oceanAmbience");
```

Keep it data-driven.

---

## 12. Save System

MVP save via localStorage.

Save data:

```ts
interface SaveGame {
  version: number;
  player: {
    position: { x: number; z: number };
    equippedRodId: string;
  };
  inventory: CaughtFish[];
  collectionLog: Record<string, FishCollectionEntry>;
  records: Record<string, FishRecord>;
  settings: {
    volume: number;
  };
}
```

Include save versioning from the beginning so future migrations are possible.

Save triggers:

* On catch
* On equipment change
* On settings change
* Every 60 seconds
* On page unload

---

## 13. MVP Scope

The first playable MVP should include:

### Must-have

* BabylonJS scene boots correctly
* Orthographic top-down camera
* Tropical island world
* Raft movement with water drag
* Basic collision with island/bounds
* Cast fishing line with mouse aim
* Bobber lands in water
* Bite timer
* Hook timing window
* Reeling/tension mini-game
* At least 6 fish species
* At least 3 fishing zones
* Catch result UI
* Inventory
* Collection log
* Local save
* Placeholder assets
* Simple audio hooks

### Nice-to-have

* Animated water
* Fish shadows swimming under water
* Ripple particles
* Raft bobbing
* Zone name display
* Rare fish announcement
* Basic day/night tinting

### Do not include in MVP

* Multiplayer
* Account system
* Backend server
* Complex crafting
* Procedural island generation
* Full economy
* Mobile controls
* 3D character animation
* Quest system

Those can come later.

---

## 14. Implementation Milestones

### Milestone 1 — Project Scaffold

Deliver:

* Vite + TypeScript project
* BabylonJS installed
* Main canvas fills screen
* Engine/scene lifecycle working
* Resize handling
* Basic orthographic camera
* Clean folder structure

Acceptance criteria:

* `npm install`
* `npm run dev`
* Game opens in browser with a blue water scene

---

### Milestone 2 — World Prototype

Deliver:

* Water plane
* Island shape
* Shallow/reef/deep zone overlays
* Basic rocks/coral obstacles
* Camera view centered on world

Acceptance criteria:

* Player can visually distinguish island, shallow water, reef, and deep water
* World boundaries exist
* Zones can be queried by position

---

### Milestone 3 — Raft Movement

Deliver:

* Raft placeholder object
* WASD/arrow movement
* Acceleration/drag movement feel
* Rotation toward movement
* Camera follow
* Collision with island and map edge

Acceptance criteria:

* Raft moves smoothly
* Raft cannot pass through island
* Camera follows without jitter
* Movement feels like rowing through water, not instant arcade sliding

---

### Milestone 4 — Casting System

Deliver:

* Mouse aim
* Hold-to-charge cast
* Cast power meter
* Bobber object
* Bobber travel animation
* Splash/ripple on landing
* Invalid cast handling

Acceptance criteria:

* Player can aim and cast into water
* Cast distance depends on charge
* Bobber lands at intended target
* Casting onto island fails gracefully

---

### Milestone 5 — Bite and Catch Prototype

Deliver:

* Fishing state machine
* Bite timer
* Hook timing window
* Basic catch resolver
* At least 3 fish species

Acceptance criteria:

* Casting into water can produce a bite
* Pressing at the correct time hooks fish
* Missing the window causes escape
* Successful hook can resolve into a caught fish

---

### Milestone 6 — Fish Fight Mini-game

Deliver:

* Tension meter
* Reel progress meter
* Fish stamina/strength behavior
* Line break condition
* Escape condition
* Catch success condition

Acceptance criteria:

* Fish fights feel interactive
* Stronger fish are harder
* Tension can break the line
* Player can learn the mechanic without tutorial text overload

---

### Milestone 7 — Data-driven Fish and Zones

Deliver:

* Fish species data file
* Fishing zone data file
* Weighted spawn tables
* At least 6–8 fish
* Zone-specific fish populations

Acceptance criteria:

* Lagoon, reef, and deep water produce different fish
* New fish can be added by editing data only
* Fish rarity affects bite chance and fight difficulty

---

### Milestone 8 — Inventory, Collection Log, Save

Deliver:

* Caught fish inventory
* Collection log
* Best-size records
* localStorage save/load
* Simple menu buttons

Acceptance criteria:

* Caught fish persist after refresh
* Collection log updates correctly
* New records are tracked
* Save version exists

---

### Milestone 9 — Polish Pass

Deliver:

* Better water animation
* Raft bobbing
* Fish shadows
* Ripple particles
* Basic sound effects
* Catch card polish
* Better placeholder sprites
* Simple title screen

Acceptance criteria:

* The game feels like a real prototype, not just a mechanics test
* Catching fish has satisfying feedback
* World has ambient motion

---

## 15. Implementation Details and Best Practices

### Keep Systems Decoupled

Bad:

```ts
if (fishSprite.name === "barracuda") {
  tension += 10;
}
```

Good:

```ts
tension += hookedFish.species.fight.baseTensionGain;
```

### Prefer Data-driven Configuration

Fish, rods, zones, loot tables, and asset references should live in data files.

### Use Placeholder Assets Intentionally

Placeholders are acceptable, but they should have the same dimensions and conceptual role as future assets.

Example:

* `raft-placeholder.png` later replaced by `raft-basic.png`
* `fish-shadow.png` later replaced by fish-specific sprites
* `bobber.png` later replaced by animated bobber sheet

### Use Simple Collision First

Use circles/polygons for collision:

* Raft collision radius
* Island collision circle or polygon
* Rock/coral circles
* Map boundary circle

Do not over-engineer physics early.

### Make the Fishing Mechanic Feel Good Early

The core fishing loop matters more than inventory, upgrades, or world size. Prioritize:

* Smooth cast
* Clear bite feedback
* Good reeling tension
* Satisfying catch reveal

---

## 16. Suggested Initial Constants

```ts
export const GAME_CONFIG = {
  world: {
    radius: 120,
    islandRadius: 22,
    shallowRadius: 48,
    reefRadius: 78,
    deepRadius: 120
  },
  raft: {
    acceleration: 18,
    maxSpeed: 9,
    drag: 0.92,
    turnSpeed: 8,
    collisionRadius: 2.2
  },
  fishing: {
    minCastDistance: 6,
    maxCastDistance: 28,
    maxChargeSeconds: 1.25,
    biteMinSeconds: 2,
    biteMaxSeconds: 8,
    baseHookWindowSeconds: 1.2
  }
};
```

These should be tuned during development.

---

## 17. Future Expansion Ideas

After MVP:

### Better Island Life

* Palm trees
* Campfire
* Hut
* Storage chest
* Washed-up supply crates
* Beach foraging

### Survival-lite Mechanics

* Hunger
* Fresh water
* Cooking fish
* Resting at camp
* Storm preparation

Keep these light. The main game should remain fishing/exploration.

### Raft Upgrades

* Faster paddles
* Sail
* Storage box
* Lantern
* Better anchor
* Deep-water hull

### Fishing Gear

* Rods
* Lines
* Hooks
* Lures
* Bait
* Nets
* Crab pots

### Environmental Systems

* Time of day
* Weather
* Storms
* Tides
* Moon phases
* Seasonal fish

### World Expansion

* Nearby reefs
* Shipwreck
* Deep trench
* Mangrove lagoon
* Volcanic rock area
* Hidden cave

### Special Fish Events

* Legendary fish only during storms
* Nocturnal fish at night
* Reef predators at dawn
* Marlin offshore at high tide

---

## 18. Initial Coding Agent Task

Build the first vertical slice:

> Create a Vite + TypeScript + BabylonJS browser game called Castaway. Implement a top-down tropical island scene with animated water, a controllable raft, simple collision, mouse-aimed fishing casts, bobber landing, bite timing, a basic reeling/tension mini-game, and catch results for at least six data-driven fish species across lagoon, reef, and deep-water zones. Use placeholder assets but structure the project so sprites, fish, rods, sounds, and zones can be replaced or expanded later through centralized data/config files.

The result should feel like a playable prototype, not just a technical demo.

