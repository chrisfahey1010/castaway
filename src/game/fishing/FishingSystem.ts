import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { FishingZone } from "../data/fishingZones";
import type { Rod } from "../data/equipment";
import type { InputManager } from "../input/InputManager";
import type { CaughtFish } from "../inventory/Inventory";
import type { AudioManager } from "../audio/AudioManager";
import type { World } from "../world/World";
import type { FishSpecies } from "./FishSpecies";
import { Bobber } from "./Bobber";
import { BiteSystem } from "./BiteSystem";
import { CastSystem } from "./CastSystem";
import { CatchResolver } from "./CatchResolver";
import { FishFightSystem, type FishFightState } from "./FishFightSystem";
import { FishSpawner } from "./FishSpawner";

export type FishingState = "idle" | "chargingCast" | "casting" | "waitingForBite" | "biteWindow" | "reeling" | "caught" | "escaped";

export interface FishingSnapshot {
  state: FishingState;
  castPower: number;
  tension: number;
  reelProgress: number;
  hookedFishName: string | null;
  hookWindow: number;
  hookWindowRemaining: number;
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
    hookedFishName: null,
    hookWindow: 0,
    hookWindowRemaining: 0
  };

  private readonly castSystem = new CastSystem();
  private readonly biteSystem = new BiteSystem();
  private readonly fightSystem = new FishFightSystem();
  private readonly fishSpawner = new FishSpawner();
  private readonly catchResolver = new CatchResolver();

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
  private fightState: FishFightState | null = null;
  private resetTimer = 0;
  private reelSoundTimer = 0;
  private catchQueue: CatchEvent[] = [];
  private messageQueue: string[] = [];

  constructor(scene: Scene, private readonly audio: AudioManager) {
    this.bobber = new Bobber(scene);
  }

  update(input: InputManager, world: World, raftPosition: Vector3, rod: Rod, deltaSeconds: number): void {
    switch (this.state) {
      case "idle":
        this.updateIdle(input);
        break;
      case "chargingCast":
        this.updateCharging(input, raftPosition, rod, world, deltaSeconds);
        break;
      case "casting":
        this.updateCasting(world, deltaSeconds);
        break;
      case "waitingForBite":
        this.updateWaiting(world, rod, deltaSeconds);
        break;
      case "biteWindow":
        this.updateBiteWindow(input, rod, deltaSeconds);
        break;
      case "reeling":
        this.updateReeling(input, rod, deltaSeconds);
        break;
      case "caught":
      case "escaped":
        this.updateReset(deltaSeconds);
        break;
    }

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
      this.audio.play("cast");
    }
  }

  private updateCharging(input: InputManager, raftPosition: Vector3, rod: Rod, world: World, deltaSeconds: number): void {
    this.chargeSeconds = Math.min(GAME_CONFIG.fishing.maxChargeSeconds, this.chargeSeconds + deltaSeconds);
    const plan = this.castSystem.planCast(raftPosition, input.pointerWorld, this.chargeSeconds, rod);
    this.castTarget = plan.target;

    if (!input.interactDown || input.interactReleased) {
      if (!world.isWaterPosition(this.castTarget)) {
        this.failCast("The bobber clattered onto land. Aim for open water.");
        return;
      }

      this.castStart = new Vector3(raftPosition.x, 1.1, raftPosition.z);
      this.castElapsed = 0;
      this.castTravelSeconds = Math.max(0.25, plan.distance / GAME_CONFIG.fishing.castTravelSpeed);
      this.bobber.show(this.castStart);
      this.state = "casting";
    }
  }

  private updateCasting(world: World, deltaSeconds: number): void {
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

      this.activeFish = this.fishSpawner.pickFish(this.activeZone);
      this.biteTimer = this.biteSystem.nextBiteSeconds(this.activeFish);
      this.state = "waitingForBite";
    }
  }

  private updateWaiting(world: World, rod: Rod, deltaSeconds: number): void {
    this.biteTimer -= deltaSeconds;
    const bob = Math.sin(performance.now() * 0.004) * 0.06;
    this.bobber.mesh.position.y = 0.16 + bob;

    if (this.biteTimer <= 0 && this.activeFish) {
      this.hookWindow = this.biteSystem.hookWindowSeconds(this.activeFish, rod);
      this.hookWindowRemaining = this.hookWindow;
      world.createRipple(this.bobber.mesh.position, new Color3(1, 0.94, 0.42));
      this.audio.play("bite");
      this.state = "biteWindow";
    }
  }

  private updateBiteWindow(input: InputManager, rod: Rod, deltaSeconds: number): void {
    if (!this.activeFish) {
      this.escape("The fish slipped away.");
      return;
    }

    this.hookWindow = this.biteSystem.hookWindowSeconds(this.activeFish, rod);
    this.hookWindowRemaining -= deltaSeconds;
    this.bobber.mesh.position.y = 0.06 + Math.sin(performance.now() * 0.04) * 0.16;

    if (input.interactPressed) {
      this.fightState = this.fightSystem.createState();
      this.state = "reeling";
      return;
    }

    if (this.hookWindowRemaining <= 0) {
      this.escape("Too late. It got away.");
    }
  }

  private updateReeling(input: InputManager, rod: Rod, deltaSeconds: number): void {
    if (!this.fightState || !this.activeFish || !this.activeZone) {
      this.escape("The line went slack.");
      return;
    }

    const result = this.fightSystem.update(this.fightState, this.activeFish, rod, input.interactDown, deltaSeconds);
    if (input.interactDown) {
      this.reelSoundTimer -= deltaSeconds;
      if (this.reelSoundTimer <= 0) {
        this.reelSoundTimer = 0.16;
        this.audio.play("reel");
      }
    }

    if (result === "caught") {
      const caught = this.catchResolver.resolve(this.activeFish, this.activeZone);
      this.catchQueue.push({ caught, species: this.activeFish });
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
      this.activeZone = null;
      this.fightState = null;
      this.chargeSeconds = 0;
      this.bobber.hide();
      this.state = "idle";
    }
  }

  private failCast(message: string): void {
    this.messageQueue.push(message);
    this.audio.play("escape");
    this.state = "escaped";
    this.resetTimer = 1.0;
  }

  private escape(message: string): void {
    this.messageQueue.push(message);
    this.audio.play("escape");
    this.state = "escaped";
    this.resetTimer = 1.0;
  }

  private updateSnapshot(): void {
    this.snapshot = {
      state: this.state,
      castPower: this.state === "chargingCast" ? Math.min(1, this.chargeSeconds / GAME_CONFIG.fishing.maxChargeSeconds) : 0,
      tension: this.fightState?.tension ?? 0,
      reelProgress: this.fightState?.progress ?? 0,
      hookedFishName: this.activeFish?.name ?? null,
      hookWindow: this.hookWindow,
      hookWindowRemaining: this.hookWindowRemaining
    };
  }
}
