import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { FishingZone } from "../data/fishingZones";
import type { BaitDepth, BaitType, FishingLine, Rod } from "../data/equipment";
import type { InputManager } from "../input/InputManager";
import type { CaughtFish } from "../inventory/Inventory";
import type { AudioManager } from "../audio/AudioManager";
import type { World } from "../world/World";
import { normalizeXZ, xzDistance } from "../utils/math";
import type { FishFightStats, FishSpecies } from "./FishSpecies";
import { Bobber } from "./Bobber";
import { BiteSystem } from "./BiteSystem";
import { CastSystem } from "./CastSystem";
import { CatchResolver } from "./CatchResolver";
import { FishFightSystem, type FishFightState } from "./FishFightSystem";
import { FishSpawner, type FishSpawnChance } from "./FishSpawner";

export type FishingState = "idle" | "chargingCast" | "casting" | "waitingForBite" | "biteWindow" | "reeling" | "caught" | "escaped";

export interface FishingSnapshot {
  state: FishingState;
  castPower: number;
  tension: number;
  reelProgress: number;
  hookWindow: number;
  hookWindowRemaining: number;
  hookedFish: HookedFishSnapshot | null;
  possibleFish: FishSpawnChance[];
}

export interface HookedFishSnapshot {
  species: FishSpecies;
  catch: CaughtFish;
  fight: FishFightStats;
  zoneName: string;
}

export interface CatchEvent {
  caught: CaughtFish;
  species: FishSpecies;
}

export class FishingSystem {
  readonly bobber: Bobber;
  state: FishingState = "idle";
  snapshot: FishingSnapshot = {
    state: "idle",
    castPower: 0,
    tension: 0,
    reelProgress: 0,
    hookWindow: 0,
    hookWindowRemaining: 0,
    hookedFish: null,
    possibleFish: []
  };

  private readonly castSystem = new CastSystem();
  private readonly biteSystem = new BiteSystem();
  private readonly fightSystem = new FishFightSystem();
  private readonly fishSpawner = new FishSpawner();
  private readonly catchResolver = new CatchResolver();
  private readonly lineMesh: LinesMesh;

  private chargeSeconds = 0;
  private castStart = new Vector3(0, 0, 0);
  private castTarget = new Vector3(0, 0, 0);
  private castTravelSeconds = 0;
  private castElapsed = 0;
  private biteTimer = 0;
  private hookWindow = 0;
  private hookWindowRemaining = 0;
  private activeZone: FishingZone | null = null;
  private activeFish: FishSpecies | null = null;
  private activeCatch: CaughtFish | null = null;
  private activeFight: FishFightStats | null = null;
  private possibleFish: FishSpawnChance[] = [];
  private fightState: FishFightState | null = null;
  private fishSwimDirection = new Vector3(0, 0, 1);
  private resetTimer = 0;
  private catchQueue: CatchEvent[] = [];
  private messageQueue: string[] = [];

  constructor(scene: Scene, private readonly audio: AudioManager, bobberTexture?: Texture) {
    this.bobber = new Bobber(scene, bobberTexture);
    this.lineMesh = MeshBuilder.CreateLines("fishing-line", { points: [Vector3.Zero(), Vector3.Zero()], updatable: true }, scene);
    this.lineMesh.renderingGroupId = 2;
    this.lineMesh.color = new Color3(0.94, 0.9, 0.78);
    this.lineMesh.isVisible = false;
  }

  update(input: InputManager, world: World, raftPosition: Vector3, lineAnchorPosition: Vector3, rod: Rod, line: FishingLine, baitDepth: BaitDepth, baitType: BaitType, deltaSeconds: number): void {
    switch (this.state) {
      case "idle":
        this.updateIdle(input);
        break;
      case "chargingCast":
        this.updateCharging(input, raftPosition, lineAnchorPosition, rod, world, baitDepth, deltaSeconds);
        break;
      case "casting":
        this.updateCasting(world, baitDepth, baitType, deltaSeconds);
        break;
      case "waitingForBite":
        this.updateWaiting(input, world, rod, line, lineAnchorPosition, deltaSeconds);
        break;
      case "biteWindow":
        this.updateBiteWindow(input, rod, lineAnchorPosition, deltaSeconds);
        break;
      case "reeling":
        this.updateReeling(input, world, rod, line, lineAnchorPosition, deltaSeconds);
        break;
      case "caught":
      case "escaped":
        this.updateReset(deltaSeconds);
        break;
    }

    this.updateLine(lineAnchorPosition, line);
    this.updateSnapshot();
  }

  drainCatchEvents(): CatchEvent[] {
    return this.catchQueue.splice(0);
  }

  drainMessages(): string[] {
    return this.messageQueue.splice(0);
  }

  private updateIdle(input: InputManager): void {
    this.bobber.hide();
    if (input.interactPressed) {
      this.state = "chargingCast";
      this.chargeSeconds = 0;
    }
  }

  private updateCharging(input: InputManager, raftPosition: Vector3, lineAnchorPosition: Vector3, rod: Rod, world: World, baitDepth: BaitDepth, deltaSeconds: number): void {
    this.chargeSeconds = Math.min(GAME_CONFIG.fishing.maxChargeSeconds, this.chargeSeconds + deltaSeconds);
    const plan = this.castSystem.planCast(raftPosition, input.pointerWorld, this.chargeSeconds, rod);
    this.castTarget = plan.target;

    if (!input.interactDown || input.interactReleased) {
      if (!world.isWaterPosition(this.castTarget)) {
        this.failCast("The bobber clattered onto land. Aim for open water.");
        return;
      }

      const zone = world.getZoneAt(this.castTarget);
      if (zone && !this.isBaitDepthAllowed(zone, baitDepth)) {
        this.failCast(this.baitDepthTooDeepMessage(zone, baitDepth));
        return;
      }

      this.castStart = lineAnchorPosition.clone();
      this.castElapsed = 0;
      this.castTravelSeconds = Math.max(0.25, plan.distance / GAME_CONFIG.fishing.castTravelSpeed);
      this.bobber.show(this.castStart);
      this.audio.play("cast");
      this.state = "casting";
    }
  }

  private updateCasting(world: World, baitDepth: BaitDepth, baitType: BaitType, deltaSeconds: number): void {
    this.castElapsed += deltaSeconds;
    const progress = Math.min(1, this.castElapsed / this.castTravelSeconds);
    const arcHeight = Math.sin(progress * Math.PI) * 3.6;
    const position = Vector3.Lerp(this.castStart, this.castTarget, progress);
    position.y = 0.16 + arcHeight;
    this.bobber.setPosition(position);

    if (progress >= 1) {
      this.bobber.setPosition(new Vector3(this.castTarget.x, 0.16, this.castTarget.z));
      world.createRipple(this.castTarget);
      this.audio.play("splash");
      this.activeZone = world.getZoneAt(this.castTarget);

      if (!this.activeZone) {
        this.failCast("No fish are biting here.");
        return;
      }

      const activeFish = this.fishSpawner.pickFish(this.activeZone, baitDepth, baitType);
      if (!activeFish) {
        this.possibleFish = [];
        this.failCast("No fish are biting with that bait and depth combo.");
        return;
      }

      this.possibleFish = this.fishSpawner.getFishChances(this.activeZone, baitDepth, baitType);
      this.activeFish = activeFish;
      this.activeCatch = this.catchResolver.resolve(activeFish, this.activeZone);
      this.activeFight = this.fightSystem.createFightStats(activeFish, this.activeCatch.weightG);
      this.biteTimer = this.biteSystem.nextBiteSeconds(activeFish);
      this.state = "waitingForBite";
    }
  }

  private updateWaiting(input: InputManager, world: World, rod: Rod, line: FishingLine, lineAnchorPosition: Vector3, deltaSeconds: number): void {
    this.biteTimer -= deltaSeconds;
    const bob = Math.sin(performance.now() * 0.004) * 0.06;
    this.bobber.mesh.position.y = 0.16 + bob;

    if (input.interactDown) {
      if (this.reelEmptyBobber(lineAnchorPosition, rod, line, deltaSeconds)) {
        return;
      }
      this.audio.playLoop("reel");
    } else {
      this.audio.stop("reel");
    }

    if (this.biteTimer <= 0 && this.activeFish) {
      this.hookWindow = this.biteSystem.hookWindowSeconds(this.activeFish, rod);
      this.hookWindowRemaining = this.hookWindow;
      world.createRipple(this.bobber.mesh.position, new Color3(1, 0.94, 0.42));
      this.audio.play("bite");
      if (input.interactDown) {
        this.startFight(lineAnchorPosition);
        return;
      }
      this.state = "biteWindow";
    }
  }

  private updateBiteWindow(input: InputManager, rod: Rod, lineAnchorPosition: Vector3, deltaSeconds: number): void {
    if (!this.activeFish) {
      this.escape("The fish slipped away.");
      return;
    }

    this.hookWindow = this.biteSystem.hookWindowSeconds(this.activeFish, rod);
    this.hookWindowRemaining -= deltaSeconds;
    this.bobber.mesh.position.y = 0.16 + Math.sin(performance.now() * 0.04) * 0.07;

    if (input.interactPressed) {
      this.startFight(lineAnchorPosition);
      return;
    }

    if (this.hookWindowRemaining <= 0) {
      this.escape("Too late. It got away.");
    }
  }

  private updateReeling(input: InputManager, world: World, rod: Rod, line: FishingLine, lineAnchorPosition: Vector3, deltaSeconds: number): void {
    if (!this.fightState || !this.activeFish || !this.activeCatch || !this.activeFight || !this.activeZone) {
      this.escape("The line went slack.");
      return;
    }

    const lineDistance = this.lineDistance(lineAnchorPosition, this.bobber.mesh.position);

    const result = this.fightSystem.update(
      this.fightState,
      this.activeFight,
      this.activeCatch.weightG,
      rod,
      line,
      input.interactDown,
      lineDistance,
      deltaSeconds
    );
    this.updateFightingBobber(world, lineAnchorPosition, deltaSeconds);

    if (input.interactDown) {
      this.audio.playLoop("reel");
    } else {
      this.audio.stop("reel");
    }

    if (result === "caught") {
      const caught = { ...this.activeCatch, caughtAt: Date.now() };
      this.catchQueue.push({ caught, species: this.activeFish });
      this.audio.stop("reel");
      this.audio.play("catchSuccess");
      this.state = "caught";
      this.resetTimer = 1.3;
      return;
    }

    if (result === "snapped") {
      this.escape("The line snapped under the strain.");
      return;
    }

    if (result === "escaped") {
      this.escape("The fish ran out the clock and shook free.");
    }
  }

  private updateReset(deltaSeconds: number): void {
    this.resetTimer -= deltaSeconds;
    if (this.resetTimer <= 0) {
      this.activeFish = null;
      this.activeCatch = null;
      this.activeFight = null;
      this.activeZone = null;
      this.possibleFish = [];
      this.fightState = null;
      this.chargeSeconds = 0;
      this.bobber.hide();
      this.state = "idle";
    }
  }

  private reelEmptyBobber(lineAnchorPosition: Vector3, rod: Rod, line: FishingLine, deltaSeconds: number): boolean {
    const bobberPosition = this.bobber.mesh.position;
    const distance = this.lineDistance(lineAnchorPosition, bobberPosition);
    const retrieveDistance = GAME_CONFIG.fishing.reelLineSpeed * rod.reelSpeed * line.reelSpeedMultiplier * deltaSeconds;

    if (distance <= 1.8 || retrieveDistance >= distance) {
      this.activeFish = null;
      this.activeCatch = null;
      this.activeFight = null;
      this.activeZone = null;
      this.possibleFish = [];
      this.fightState = null;
      this.audio.stop("reel");
      this.bobber.hide();
      this.state = "idle";
      return true;
    }

    const towardRod = normalizeXZ(lineAnchorPosition.subtract(bobberPosition));
    this.bobber.setPosition(new Vector3(
      bobberPosition.x + towardRod.x * retrieveDistance,
      bobberPosition.y,
      bobberPosition.z + towardRod.z * retrieveDistance
    ));
    return false;
  }

  private startFight(lineAnchorPosition: Vector3): void {
    this.hookWindowRemaining = 0;
    this.fightState = this.fightSystem.createState(this.lineDistance(lineAnchorPosition, this.bobber.mesh.position));
    this.fishSwimDirection = normalizeXZ(this.bobber.mesh.position.subtract(lineAnchorPosition));
    this.state = "reeling";
  }

  private failCast(message: string): void {
    this.messageQueue.push(message);
    this.audio.stop("reel");
    this.audio.play("escape");
    this.state = "escaped";
    this.resetTimer = 1.0;
  }

  private escape(message: string): void {
    this.messageQueue.push(message);
    this.audio.stop("reel");
    this.audio.play("escape");
    this.state = "escaped";
    this.resetTimer = 1.0;
  }

  private updateLine(lineAnchorPosition: Vector3, line: FishingLine): void {
    if (!this.bobber.mesh.isVisible) {
      this.lineMesh.isVisible = false;
      return;
    }

    const bobberAnchor = this.bobber.getLineAnchorPosition();
    this.lineMesh.color = Color3.FromHexString(line.colorHex);
    MeshBuilder.CreateLines("fishing-line", { points: [lineAnchorPosition, bobberAnchor], instance: this.lineMesh });
    this.lineMesh.isVisible = true;
  }

  private updateFightingBobber(world: World, lineAnchorPosition: Vector3, deltaSeconds: number): void {
    if (!this.fightState || !this.activeFight) {
      return;
    }

    const bobberPosition = this.bobber.mesh.position;
    const awayFromRod = normalizeXZ(bobberPosition.subtract(lineAnchorPosition));
    const lateral = new Vector3(-this.fishSwimDirection.z, 0, this.fishSwimDirection.x).scale(
      Math.sin(this.fightState.elapsed * (1.6 + this.activeFight.erraticness * 2.5)) * this.activeFight.erraticness * 0.85
    );
    const tautness = this.lineDistance(lineAnchorPosition, bobberPosition) / Math.max(0.001, this.fightState.lineLength);
    const desiredSwimDirection = normalizeXZ(
      this.fishSwimDirection
        .scale(1.35)
        .add(awayFromRod.scale(Math.max(0, tautness - 0.45) * (0.85 + this.activeFight.strength * 0.35)))
        .add(lateral)
    );
    const turnFactor = 1 - Math.exp(-(1.2 + this.activeFight.erraticness * 2.4) * deltaSeconds);
    this.fishSwimDirection = normalizeXZ(
      this.fishSwimDirection.scale(1 - turnFactor).add(desiredSwimDirection.scale(turnFactor))
    );
    const swimSpeed = GAME_CONFIG.fishing.fishRunLineSpeed * this.activeFight.stamina * (0.5 + this.fightState.runIntensity * this.activeFight.strength);
    const unconstrained = bobberPosition.add(this.fishSwimDirection.scale(swimSpeed * deltaSeconds));
    const constrained = this.constrainToLineLength(unconstrained, lineAnchorPosition, this.fightState.lineLength);
    constrained.y = 0.14 + Math.sin(this.fightState.elapsed * 11) * (0.035 + this.fightState.tension * 0.045);

    if (world.isWaterPosition(constrained)) {
      this.bobber.setPosition(constrained);
    } else {
      bobberPosition.y = constrained.y;
      this.bobber.setPosition(bobberPosition);
    }
  }

  private constrainToLineLength(position: Vector3, lineAnchorPosition: Vector3, lineLength: number): Vector3 {
    const distance = this.lineDistance(lineAnchorPosition, position);
    if (distance <= lineLength || distance < 0.0001) {
      return position.clone();
    }

    const direction = normalizeXZ(position.subtract(lineAnchorPosition));
    return new Vector3(
      lineAnchorPosition.x + direction.x * lineLength,
      position.y,
      lineAnchorPosition.z + direction.z * lineLength
    );
  }

  private lineDistance(a: Vector3, b: Vector3): number {
    return xzDistance(a, b);
  }

  private isBaitDepthAllowed(zone: FishingZone, baitDepth: BaitDepth): boolean {
    switch (zone.type) {
      case "lagoon":
        return baitDepth.id === "shallow";
      case "reef":
        return baitDepth.id === "shallow" || baitDepth.id === "medium";
      case "deep":
        return true;
    }
  }

  private baitDepthTooDeepMessage(zone: FishingZone, baitDepth: BaitDepth): string {
    return `${baitDepth.name} bait is too deep for the ${zone.name}. Select ${this.formatDepthList(this.allowedBaitDepthNames(zone))} bait depth to cast here.`;
  }

  private allowedBaitDepthNames(zone: FishingZone): string[] {
    switch (zone.type) {
      case "lagoon":
        return ["Shallow"];
      case "reef":
        return ["Shallow", "Medium"];
      case "deep":
        return ["Shallow", "Medium", "Deep"];
    }
  }

  private formatDepthList(names: string[]): string {
    if (names.length <= 1) {
      return names[0] ?? "Shallow";
    }

    return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  }

  private updateSnapshot(): void {
    const isHooked = this.state === "reeling" || this.state === "caught";
    const possibleFish = this.state === "waitingForBite" || this.state === "biteWindow" ? this.possibleFish : [];
    const hookedFish = isHooked && this.activeFish && this.activeCatch && this.activeFight && this.activeZone
      ? {
          species: this.activeFish,
          catch: this.activeCatch,
          fight: this.activeFight,
          zoneName: this.activeZone.name
        }
      : null;

    this.snapshot = {
      state: this.state,
      castPower: this.state === "chargingCast" ? Math.min(1, this.chargeSeconds / GAME_CONFIG.fishing.maxChargeSeconds) : 0,
      tension: this.fightState?.tension ?? 0,
      reelProgress: this.fightState?.progress ?? 0,
      hookWindow: this.hookWindow,
      hookWindowRemaining: this.hookWindowRemaining,
      hookedFish,
      possibleFish
    };
  }
}
