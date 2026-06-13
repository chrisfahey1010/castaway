import "@babylonjs/core/Engines/Extensions/engine.views";
import { Engine } from "@babylonjs/core/Engines/engine";
import { AssetLoader } from "./assets/AssetLoader";
import { AudioManager } from "./audio/AudioManager";
import {
  baitDepths,
  baitTypes,
  fishingLines,
  getBaitDepth,
  getBaitType,
  getFishingLine,
  getRod,
  rods,
  startingBaitDepth,
  startingBaitType,
  startingFishingLine,
  type BaitDepth,
  type BaitType,
  type FishingLine
} from "./data/equipment";
import { GameLoop } from "./GameLoop";
import { createScene } from "./SceneFactory";
import { FishingSystem } from "./fishing/FishingSystem";
import { InputManager } from "./input/InputManager";
import { PlayerController } from "./player/PlayerController";
import { RaftController } from "./player/RaftController";
import { RodController } from "./player/RodController";
import { GameState } from "./state/GameState";
import { SaveManager } from "./state/SaveManager";
import { Hud } from "./ui/Hud";
import { CameraController } from "./world/CameraController";
import { World } from "./world/World";

export class Game {
  private readonly engine: Engine;
  private readonly loop = new GameLoop();
  private readonly state = new GameState();
  private readonly saveManager = new SaveManager();
  private readonly input: InputManager;
  private readonly audio = new AudioManager();

  private sceneBundle: ReturnType<typeof createScene> | null = null;
  private assetLoader: AssetLoader | null = null;
  private world: World | null = null;
  private cameraController: CameraController | null = null;
  private player: PlayerController | null = null;
  private rod = new RodController();
  private equippedLine: FishingLine = startingFishingLine;
  private equippedBaitType: BaitType = startingBaitType;
  private equippedBaitDepth: BaitDepth = startingBaitDepth;
  private fishing: FishingSystem | null = null;
  private hud: Hud | null = null;
  private autosaveTimer = 0;
  private isResetting = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true });
    this.input = new InputManager(canvas);
  }

  async init(): Promise<void> {
    const hasSave = this.saveManager.load(this.state);
    this.sceneBundle = createScene(this.engine);
    this.assetLoader = new AssetLoader(this.sceneBundle.scene);
    const assets = await this.assetLoader.load();
    this.rod.equipped = getRod(this.state.player.equippedRodId);
    this.equippedLine = getFishingLine(this.state.player.equippedLineId);
    this.equippedBaitType = getBaitType(this.state.player.equippedBaitTypeId);
    this.equippedBaitDepth = getBaitDepth(this.state.player.equippedBaitDepthId);
    this.ensureUnlockedEquipment();

    this.world = new World(this.sceneBundle.scene, {
      palm: assets.getTexture("palmTree"),
      planeCrash: assets.getTexture("planeCrash"),
      sand: assets.getTexture("sand"),
      grass: assets.getTexture("grass"),
      coral: assets.getTexture("coral"),
      rock: assets.getTexture("rock"),
      fishShadow: assets.getTexture("fishShadow"),
      stingrayShadow: assets.getTexture("stingrayShadow"),
      waterShallow: assets.getTexture("waterShallow"),
      waterMedium: assets.getTexture("waterMedium"),
      waterDeep: assets.getTexture("waterDeep")
    });
    this.cameraController = new CameraController(this.sceneBundle.camera, this.canvas);
    const raft = new RaftController(this.sceneBundle.scene, this.state.player.position, assets.getTexture("raft"), assets.getTexture("fisherman"));
    this.player = new PlayerController(raft);
    this.fishing = new FishingSystem(this.sceneBundle.scene, this.audio, assets.getTexture("bobber"));
    const hudRoot = document.querySelector<HTMLElement>("#hud-root");
    if (!hudRoot) {
      throw new Error("Missing #hud-root element");
    }
    this.hud = new Hud(
      hudRoot,
      (rodId) => this.selectRod(rodId),
      (lineId) => this.selectLine(lineId),
      (baitTypeId) => this.selectBaitType(baitTypeId),
      (baitDepthId) => this.selectBaitDepth(baitDepthId),
      (controls) => this.input.setTouchControls(controls),
      () => this.resetGame(),
      () => this.startNewGame(),
      !hasSave
    );
    this.input.attach();
    window.addEventListener("resize", this.resize);
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      this.loop.tick((deltaSeconds) => this.update(deltaSeconds));
      this.sceneBundle?.scene.render();
    });
  }

  dispose(): void {
    if (!this.isResetting) {
      this.persistState();
    }
    window.removeEventListener("resize", this.resize);
    this.input.detach();
    this.engine.dispose();
  }

  private update(deltaSeconds: number): void {
    if (!this.sceneBundle || !this.world || !this.cameraController || !this.player || !this.fishing || !this.hud) {
      return;
    }

    this.input.update(this.sceneBundle.scene, this.sceneBundle.camera);
    this.player.update(this.input, this.world, deltaSeconds);
    this.world.update(deltaSeconds);
    this.cameraController.update(this.player.raft.root.position, deltaSeconds);
    this.fishing.update(
      this.input,
      this.world,
      this.player.raft.root.position,
      this.player.raft.getFishingLineAnchorPosition(),
      this.rod.equipped,
      this.equippedLine,
      this.equippedBaitDepth,
      this.equippedBaitType,
      deltaSeconds
    );
    this.handleFishingEvents();

    const zone = this.world.getZoneAt(this.player.raft.root.position);
    this.hud.update({
      zone,
      rod: this.rod.equipped,
      rods,
      line: this.equippedLine,
      lines: fishingLines,
      baitType: this.equippedBaitType,
      baitTypes,
      baitDepth: this.equippedBaitDepth,
      baitDepths,
      fishing: this.fishing.snapshot,
      inventory: this.state.inventory.caughtFish,
      collectionLog: this.state.collectionLog.entries,
      progression: this.state.progression,
      playerPosition: this.player.raft.root.position,
      camera: this.sceneBundle.camera
    });

    this.state.player.position = this.player.raft.root.position.clone();
    this.autosaveTimer += deltaSeconds;
    if (this.autosaveTimer >= 60) {
      this.autosaveTimer = 0;
      this.persistState();
    }

    this.input.endFrame();
  }

  private handleFishingEvents(): void {
    if (!this.fishing || !this.hud) {
      return;
    }

    for (const event of this.fishing.drainCatchEvents()) {
      this.state.inventory.add(event.caught);
      const result = this.state.collectionLog.recordCatch(event.caught, event.species);
      this.state.records[event.caught.speciesId] = Math.max(this.state.records[event.caught.speciesId] ?? 0, event.caught.lengthCm);
      const unlocks = this.state.progression.recordCatch(event.caught.weightG, this.equippedBaitType.id, this.equippedBaitDepth.id, Object.keys(this.state.collectionLog.entries).length);
      this.hud.showCatch(event.caught, result.isNewRecord);
      for (const unlock of unlocks) {
        const baitSuffix = unlock.kind === "bait" ? " bait" : "";
        const depthSuffix = unlock.kind === "depth" ? " depth" : "";
        this.hud.toasts.show(`Congratulations! You unlocked ${unlock.name}${baitSuffix}${depthSuffix}!`);
      }
      this.persistState();
    }

    for (const message of this.fishing.drainMessages()) {
      this.hud.toasts.show(message);
    }
  }

  private persistState(): void {
    this.saveManager.save(this.state);
  }

  private resetGame(): void {
    this.isResetting = true;
    this.saveManager.save(new GameState());
    window.location.reload();
  }

  private startNewGame(): void {
    this.persistState();
  }

  private ensureUnlockedEquipment(): void {
    if (!this.state.progression.isRodUnlocked(this.rod.equipped.id)) {
      this.rod.equipped = getRod("driftwood-rod");
    }

    if (!this.state.progression.isLineUnlocked(this.equippedLine.id)) {
      this.equippedLine = startingFishingLine;
    }

    if (!this.state.progression.isBaitTypeUnlocked(this.equippedBaitType.id)) {
      this.equippedBaitType = startingBaitType;
    }

    if (!this.state.progression.isBaitDepthUnlocked(this.equippedBaitDepth.id)) {
      this.equippedBaitDepth = startingBaitDepth;
    }

    this.state.player.equippedRodId = this.rod.equipped.id;
    this.state.player.equippedLineId = this.equippedLine.id;
    this.state.player.equippedBaitTypeId = this.equippedBaitType.id;
    this.state.player.equippedBaitDepthId = this.equippedBaitDepth.id;
  }

  private selectRod(rodId: string): void {
    if (this.fishing && this.fishing.state !== "idle") {
      this.hud?.toasts.show("Change fishing rod before casting.");
      return;
    }

    const lockLabel = this.state.progression.getRodLockLabel(rodId);
    if (lockLabel) {
      this.hud?.toasts.show(lockLabel);
      return;
    }

    this.rod.equipped = getRod(rodId);
    this.state.player.equippedRodId = this.rod.equipped.id;
    this.persistState();
    this.hud?.toasts.show(`Equipped ${this.rod.equipped.name}`);
  }

  private selectLine(lineId: string): void {
    if (this.fishing && this.fishing.state !== "idle") {
      this.hud?.toasts.show("Change fishing line before casting.");
      return;
    }

    const lockLabel = this.state.progression.getLineLockLabel(lineId);
    if (lockLabel) {
      this.hud?.toasts.show(lockLabel);
      return;
    }

    this.equippedLine = getFishingLine(lineId);
    this.state.player.equippedLineId = this.equippedLine.id;
    this.persistState();
    this.hud?.toasts.show(`Equipped ${this.equippedLine.name}`);
  }

  private selectBaitType(baitTypeId: string): void {
    if (this.fishing && this.fishing.state !== "idle") {
      this.hud?.toasts.show("Select bait before casting.");
      return;
    }

    const lockLabel = this.state.progression.getBaitTypeLockLabel(baitTypeId);
    if (lockLabel) {
      this.hud?.toasts.show(lockLabel);
      return;
    }

    this.equippedBaitType = getBaitType(baitTypeId);
    this.state.player.equippedBaitTypeId = this.equippedBaitType.id;
    this.persistState();
    this.hud?.toasts.show(`Selected ${this.equippedBaitType.name} bait`);
  }

  private selectBaitDepth(baitDepthId: string): void {
    if (this.fishing && this.fishing.state !== "idle") {
      this.hud?.toasts.show("Select bait depth before casting.");
      return;
    }

    const lockLabel = this.state.progression.getBaitDepthLockLabel(baitDepthId);
    if (lockLabel) {
      this.hud?.toasts.show(lockLabel);
      return;
    }

    this.equippedBaitDepth = getBaitDepth(baitDepthId);
    this.state.player.equippedBaitDepthId = this.equippedBaitDepth.id;
    this.persistState();
    this.hud?.toasts.show(`Selected ${this.equippedBaitDepth.name} bait depth`);
  }

  private readonly resize = (): void => {
    this.engine.resize();
    this.cameraController?.resize();
  };
}
