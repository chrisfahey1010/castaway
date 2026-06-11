import "@babylonjs/core/Engines/Extensions/engine.views";
import { Engine } from "@babylonjs/core/Engines/engine";
import { AssetLoader } from "./assets/AssetLoader";
import { AudioManager } from "./audio/AudioManager";
import { fishingLines, getFishingLine, startingFishingLine, type FishingLine } from "./data/equipment";
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
  private fishing: FishingSystem | null = null;
  private hud: Hud | null = null;
  private autosaveTimer = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    this.input = new InputManager(canvas);
  }

  async init(): Promise<void> {
    this.saveManager.load(this.state);
    this.sceneBundle = createScene(this.engine);
    this.assetLoader = new AssetLoader(this.sceneBundle.scene);
    const assets = await this.assetLoader.load();
    this.equippedLine = getFishingLine(this.state.player.equippedLineId);

    this.world = new World(this.sceneBundle.scene, assets.getTexture("palmTree"));
    this.cameraController = new CameraController(this.sceneBundle.camera, this.canvas);
    const raft = new RaftController(this.sceneBundle.scene, this.state.player.position, assets.getTexture("raft"));
    this.player = new PlayerController(raft);
    this.fishing = new FishingSystem(this.sceneBundle.scene, this.audio, assets.getTexture("bobber"));
    const hudRoot = document.querySelector<HTMLElement>("#hud-root");
    if (!hudRoot) {
      throw new Error("Missing #hud-root element");
    }
    this.hud = new Hud(hudRoot, (lineId) => this.selectLine(lineId), (controls) => this.input.setTouchControls(controls));
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
    this.persistState();
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
    this.fishing.update(this.input, this.world, this.player.raft.root.position, this.rod.equipped, this.equippedLine, deltaSeconds);
    this.handleFishingEvents();

    const zone = this.world.getZoneAt(this.player.raft.root.position);
    this.hud.update({
      zone,
      rod: this.rod.equipped,
      line: this.equippedLine,
      lines: fishingLines,
      fishing: this.fishing.snapshot,
      inventory: this.state.inventory.caughtFish,
      collectionLog: this.state.collectionLog.entries
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
      this.hud.showCatch(event.caught, result.isNewRecord);
      this.hud.toasts.show(result.isFirstCatch ? `New species logged: ${event.caught.name}` : `Caught ${event.caught.name}`);
      this.persistState();
    }

    for (const message of this.fishing.drainMessages()) {
      this.hud.toasts.show(message);
    }
  }

  private persistState(): void {
    this.saveManager.save(this.state);
  }

  private selectLine(lineId: string): void {
    if (this.fishing && this.fishing.state !== "idle") {
      this.hud?.toasts.show("Change fishing line before casting.");
      return;
    }

    this.equippedLine = getFishingLine(lineId);
    this.state.player.equippedLineId = this.equippedLine.id;
    this.persistState();
    this.hud?.toasts.show(`Equipped ${this.equippedLine.name}`);
  }

  private readonly resize = (): void => {
    this.engine.resize();
    this.cameraController?.resize();
  };
}
