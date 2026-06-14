import type { Camera } from "@babylonjs/core/Cameras/camera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { BaitDepth, BaitType, FishingLine, Rod } from "../data/equipment";
import { fishSpecies, getFishSpriteUrl } from "../data/fishSpecies";
import type { FishingZone } from "../data/fishingZones";
import type { FishingSnapshot, HookedFishSnapshot } from "../fishing/FishingSystem";
import type { RaftControlInput } from "../input/InputManager";
import type { CaughtFish } from "../inventory/Inventory";
import type { FishCollectionEntry } from "../inventory/CollectionLog";
import type { ProgressionState } from "../state/ProgressionState";
import { renderCollectionLog } from "./CollectionLogUI";
import { promptForFishing } from "./FishingUI";
import { formatFishWeight } from "./formatters";
import { renderInventory } from "./InventoryUI";
import { Toasts } from "./Toasts";

const LOST_HOOKED_FISH_CARD_SECONDS = 2;

export interface HudState {
  zone: FishingZone | null;
  rod: Rod;
  rods: Rod[];
  line: FishingLine;
  lines: FishingLine[];
  baitType: BaitType;
  baitTypes: BaitType[];
  baitDepth: BaitDepth;
  baitDepths: BaitDepth[];
  fishing: FishingSnapshot;
  inventory: CaughtFish[];
  collectionLog: Record<string, FishCollectionEntry>;
  progression: ProgressionState;
  playerPosition: Vector3;
  camera: Camera;
  developerViewVisible: boolean;
}

export class Hud {
  readonly toasts: Toasts;
  private readonly root: HTMLElement;
  private readonly onStartGame: () => void;
  private readonly zoneEl: HTMLElement;
  private readonly promptEl: HTMLElement;
  private readonly rodOptionsEl: HTMLElement;
  private readonly rodSelectorEl: HTMLElement;
  private readonly rodToggleButton: HTMLButtonElement;
  private readonly lineOptionsEl: HTMLElement;
  private readonly lineSelectorEl: HTMLElement;
  private readonly lineToggleButton: HTMLButtonElement;
  private readonly baitTypeOptionsEl: HTMLElement;
  private readonly baitTypeSelectorEl: HTMLElement;
  private readonly baitTypeToggleButton: HTMLButtonElement;
  private readonly baitDepthOptionsEl: HTMLElement;
  private readonly baitDepthSelectorEl: HTMLElement;
  private readonly baitDepthToggleButton: HTMLButtonElement;
  private readonly helpCard: HTMLElement;
  private readonly helpActionButton: HTMLButtonElement;
  private readonly playerMeterEl: HTMLElement;
  private readonly playerMeterValue: HTMLElement;
  private readonly playerMeterFill: HTMLElement;
  private readonly catchCard: HTMLElement;
  private readonly developerCard: HTMLElement;
  private readonly inventoryDrawer: HTMLElement;
  private readonly logDrawer: HTMLElement;
  private readonly activeMovePointers = new Map<number, string>();
  private readonly mobileViewport = window.matchMedia("(pointer: coarse), (max-width: 680px)");
  private catchHideTimer: number | null = null;
  private idlePromptVisible = true;
  private inventoryHtml = "";
  private logHtml = "";
  private rodOptionsKey = "";
  private lineOptionsKey = "";
  private baitTypeOptionsKey = "";
  private baitDepthOptionsKey = "";
  private helpMode: "start" | "reset" = "reset";
  private retainedHookedFish: HookedFishSnapshot | null = null;
  private retainedHookedFishUntil = 0;

  constructor(
    root: HTMLElement,
    onRodSelected: (rodId: string) => void,
    onLineSelected: (lineId: string) => void,
    onBaitTypeSelected: (baitTypeId: string) => void,
    onBaitDepthSelected: (baitDepthId: string) => void,
    onMoveControlsChanged: (controls: RaftControlInput) => void,
    onResetGame: () => void,
    onStartGame: () => void,
    showInitialHelp: boolean
  ) {
    this.root = root;
    this.onStartGame = onStartGame;
    root.innerHTML = `
      <div class="hud">
        <div class="hud-top">
          <div class="panel status-panel">
            <div class="status-header">
              <div class="zone" data-zone>Shallows</div>
            </div>
            <div class="prompt" data-prompt>Loading...</div>
            <div class="status-controls">
              <div class="line-selector" data-rod-selector>
                <button type="button" class="line-select-button" data-rod-toggle aria-expanded="false">Select Rod</button>
                <div class="line-menu" data-rod-options></div>
              </div>
              <div class="line-selector" data-line-selector>
                <button type="button" class="line-select-button" data-line-toggle aria-expanded="false">Select Line</button>
                <div class="line-menu" data-line-options></div>
              </div>
              <div class="line-selector" data-bait-type-selector>
                <button type="button" class="line-select-button" data-bait-type-toggle aria-expanded="false">Select Bait</button>
                <div class="line-menu" data-bait-type-options></div>
              </div>
              <div class="line-selector" data-bait-depth-selector>
                <button type="button" class="line-select-button" data-bait-depth-toggle aria-expanded="false">Select Bait Depth</button>
                <div class="line-menu" data-bait-depth-options></div>
              </div>
              <div class="status-actions">
                <button type="button" data-inventory>Inventory</button>
                <button type="button" data-log>Collection</button>
              </div>
            </div>
          </div>
          <div class="buttons">
            <button type="button" data-inventory>Inventory</button>
            <button type="button" data-log>Collection</button>
          </div>
        </div>
        <div></div>
        <div class="mobile-controls" data-mobile-controls aria-label="Raft movement controls">
          <button type="button" class="move-button move-up" data-move="forward" aria-label="Move forward">↑</button>
          <button type="button" class="move-button move-left" data-move="left" aria-label="Turn left">←</button>
          <button type="button" class="move-button move-down" data-move="backward" aria-label="Move backward">↓</button>
          <button type="button" class="move-button move-right" data-move="right" aria-label="Turn right">→</button>
        </div>
        <div class="player-meter" data-player-meter aria-hidden="true">
          <div class="player-meter-value" data-player-meter-value></div>
          <div class="meter"><div class="meter-fill" data-player-meter-fill></div></div>
        </div>
        <button type="button" class="icon-button help-toggle-button" data-help-toggle aria-label="Show instructions">?</button>
      </div>
      <div class="catch-card" data-catch-card></div>
      <div class="developer-card panel" data-developer-card aria-hidden="true"></div>
      <div class="help-card panel" data-help-card aria-hidden="true">
        <button type="button" class="drawer-close" data-help-close aria-label="Close instructions">x</button>
        <h2>How to Play</h2>
        <h3>Catch Fish</h3>
        <ul class="help-list">
          <li>Move the raft with WASD or arrow keys.</li>
          <li>Choose rod, line, bait, and depth, then aim at water.</li>
          <li>Hold click, Space, or touch to charge a cast. Release to throw.</li>
          <li>When BITE appears, click, tap, or press Space to hook the fish.</li>
        </ul>
        <h3>Fight Smart</h3>
        <ul class="help-list">
          <li>Hold to reel. Let go when tension climbs too high.</li>
          <li>Steer the raft toward the bobber during a fight to give the line slack.</li>
          <li>Keep the fish close and tension under control to land it.</li>
        </ul>
        <h3>Progress</h3>
        <ul class="help-list">
          <li>Catch new species and bigger fish to unlock stronger rods and lines.</li>
          <li>Catch fish with each bait and depth to unlock more options.</li>
          <li>Better rods reel faster. Heavier lines handle more tension but reel slower. Each species prefers certain bait and depths.</li>
          <li>Locked menu items show the exact goal. The Collection shows where each species lives.</li>
        </ul>
        <div class="help-actions">
          <button type="button" class="help-action-button reset-game-button" data-help-action>Reset Game</button>
        </div>
      </div>
      <div class="drawer" data-inventory-drawer></div>
      <div class="drawer" data-log-drawer></div>
    `;

    this.zoneEl = this.must(root, "[data-zone]");
    this.promptEl = this.must(root, "[data-prompt]");
    this.rodOptionsEl = this.must(root, "[data-rod-options]");
    this.rodSelectorEl = this.must(root, "[data-rod-selector]");
    this.rodToggleButton = this.must(root, "[data-rod-toggle]") as HTMLButtonElement;
    this.lineOptionsEl = this.must(root, "[data-line-options]");
    this.lineSelectorEl = this.must(root, "[data-line-selector]");
    this.lineToggleButton = this.must(root, "[data-line-toggle]") as HTMLButtonElement;
    this.baitTypeOptionsEl = this.must(root, "[data-bait-type-options]");
    this.baitTypeSelectorEl = this.must(root, "[data-bait-type-selector]");
    this.baitTypeToggleButton = this.must(root, "[data-bait-type-toggle]") as HTMLButtonElement;
    this.baitDepthOptionsEl = this.must(root, "[data-bait-depth-options]");
    this.baitDepthSelectorEl = this.must(root, "[data-bait-depth-selector]");
    this.baitDepthToggleButton = this.must(root, "[data-bait-depth-toggle]") as HTMLButtonElement;
    this.playerMeterEl = this.must(root, "[data-player-meter]");
    this.playerMeterValue = this.must(root, "[data-player-meter-value]");
    this.playerMeterFill = this.must(root, "[data-player-meter-fill]");
    this.catchCard = this.must(root, "[data-catch-card]");
    this.developerCard = this.must(root, "[data-developer-card]");
    this.helpCard = this.must(root, "[data-help-card]");
    this.helpActionButton = this.must(root, "[data-help-action]") as HTMLButtonElement;
    this.inventoryDrawer = this.must(root, "[data-inventory-drawer]");
    this.logDrawer = this.must(root, "[data-log-drawer]");
    this.toasts = new Toasts(root);

    root.addEventListener("pointerdown", this.stopHudPointerPropagation);
    root.addEventListener("pointerup", this.stopHudPointerPropagation);
    root.addEventListener("pointercancel", this.stopHudPointerPropagation);
    root.querySelectorAll("[data-inventory]").forEach((button) => button.addEventListener("click", () => this.toggleDrawer(this.inventoryDrawer, this.logDrawer)));
    root.querySelectorAll("[data-log]").forEach((button) => button.addEventListener("click", () => this.toggleDrawer(this.logDrawer, this.inventoryDrawer)));
    this.must(root, "[data-help-toggle]").addEventListener("click", () => this.toggleHelp());
    this.must(root, "[data-help-close]").addEventListener("click", () => this.closeHelp());
    this.helpActionButton.addEventListener("click", () => {
      if (this.helpMode === "start") {
        this.closeHelp();
        return;
      }

      if (window.confirm("Reset all progress and restart the game?")) {
        this.setHelpVisible(false);
        onResetGame();
      }
    });
    this.rodToggleButton.addEventListener("click", () => this.toggleRodMenu());
    this.lineToggleButton.addEventListener("click", () => this.toggleLineMenu());
    this.baitTypeToggleButton.addEventListener("click", () => this.toggleBaitTypeMenu());
    this.baitDepthToggleButton.addEventListener("click", () => this.toggleBaitDepthMenu());
    root.addEventListener("click", (event) => {
      const closeButton = (event.target as HTMLElement).closest("[data-drawer-close]");
      if (closeButton) {
        closeButton.closest(".drawer")?.classList.remove("visible");
      }
    });
    this.rodOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-rod-id]");
      if (button) {
        onRodSelected(button.dataset.rodId ?? "");
        this.setRodMenuOpen(false);
      }
    });
    this.lineOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-line-id]");
      if (button) {
        onLineSelected(button.dataset.lineId ?? "");
        this.setLineMenuOpen(false);
      }
    });
    this.baitTypeOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-bait-type-id]");
      if (button) {
        onBaitTypeSelected(button.dataset.baitTypeId ?? "");
        this.setBaitTypeMenuOpen(false);
      }
    });
    this.baitDepthOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-bait-depth-id]");
      if (button) {
        onBaitDepthSelected(button.dataset.baitDepthId ?? "");
        this.setBaitDepthMenuOpen(false);
      }
    });
    this.setupMobileControls(this.must(root, "[data-mobile-controls]"), onMoveControlsChanged);
    if (showInitialHelp) {
      this.setHelpMode("start");
      this.setHelpVisible(true);
    }

    window.setTimeout(() => {
      this.idlePromptVisible = false;
      this.promptEl.classList.add("hidden");
    }, 5000);
  }

  update(state: HudState): void {
    this.zoneEl.textContent = state.zone?.name ?? "Island Shore";
    const prompt = state.fishing.state === "idle" && !this.idlePromptVisible ? "" : promptForFishing(state.fishing, this.mobileViewport.matches);
    this.promptEl.textContent = prompt;
    this.promptEl.classList.toggle("hidden", prompt.length === 0);
    this.setSelectorLabel(this.rodToggleButton, state.rod.name, "Select fishing rod");
    this.setSelectorLabel(this.lineToggleButton, state.line.name, "Select fishing line");
    this.setSelectorLabel(this.baitTypeToggleButton, `${state.baitType.name} Bait`, "Select bait");
    this.setSelectorLabel(this.baitDepthToggleButton, `${state.baitDepth.name} Depth`, "Select bait depth");
    this.updateRodOptions(state.rods, state.rod, state.progression);
    this.updateLineOptions(state.lines, state.line, state.progression);
    this.updateBaitTypeOptions(state.baitTypes, state.baitType, state.progression);
    this.updateBaitDepthOptions(state.baitDepths, state.baitDepth, state.progression);
    this.updatePlayerMeter(state);
    this.updateDeveloperCard(state);
    const inventoryHtml = `<button type="button" class="drawer-close" data-drawer-close aria-label="Close inventory">x</button><h2>Inventory</h2>${renderInventory(state.inventory)}`;
    if (inventoryHtml !== this.inventoryHtml) {
      this.inventoryHtml = inventoryHtml;
      this.inventoryDrawer.innerHTML = inventoryHtml;
    }

    const discoveredSpecies = Object.keys(state.collectionLog).length;
    const logHtml = `<button type="button" class="drawer-close" data-drawer-close aria-label="Close collection log">x</button><h2>Species (${discoveredSpecies}/${fishSpecies.length})</h2>${renderCollectionLog(state.collectionLog)}`;
    if (logHtml !== this.logHtml) {
      this.logHtml = logHtml;
      this.logDrawer.innerHTML = logHtml;
    }
  }

  showCatch(caught: CaughtFish, isNewRecord: boolean): void {
    const spriteUrl = caught.spriteUrl ?? getFishSpriteUrl(caught.speciesId);
    const spriteMarkup = spriteUrl
      ? `<img class="catch-sprite" src="${spriteUrl}" alt="${caught.name}" draggable="false">`
      : "";

    this.catchCard.innerHTML = `
      <div class="catch-title">Caught!</div>
      ${spriteMarkup}
      <div class="catch-name">${caught.name}</div>
      <div class="catch-meta">${caught.lengthCm} cm · ${formatFishWeight(caught.weightG)} · ${caught.rarity}</div>
      <div class="catch-meta">${caught.value} shells${isNewRecord ? " · New record!" : ""}</div>
    `;
    this.catchCard.classList.add("visible");
    if (this.catchHideTimer !== null) {
      window.clearTimeout(this.catchHideTimer);
    }
    this.catchHideTimer = window.setTimeout(() => this.catchCard.classList.remove("visible"), 3200);
  }

  private updatePlayerMeter(state: HudState): void {
    const isCasting = state.fishing.state === "chargingCast";
    const isReeling = state.fishing.state === "reeling";

    if (!isCasting && !isReeling) {
      this.playerMeterEl.classList.remove("visible");
      this.playerMeterEl.setAttribute("aria-hidden", "true");
      return;
    }

    const value = isCasting
      ? state.fishing.castPower
      : state.fishing.tension / (state.rod.tensionLimit * state.line.tensionLimitMultiplier);
    const maxTension = state.rod.tensionLimit * state.line.tensionLimitMultiplier;
    this.playerMeterValue.textContent = `${state.fishing.tension.toFixed(2)} / ${maxTension.toFixed(2)}`;
    this.playerMeterValue.classList.toggle("visible", state.developerViewVisible && isReeling);
    this.playerMeterFill.classList.toggle("tension", isReeling);
    this.setMeter(this.playerMeterFill, value, true);
    this.positionPlayerMeter(state.playerPosition, state.camera);
    this.playerMeterEl.classList.add("visible");
    this.playerMeterEl.setAttribute("aria-hidden", "false");
  }

  private updateDeveloperCard(state: HudState): void {
    this.developerCard.classList.toggle("visible", state.developerViewVisible);
    this.developerCard.setAttribute("aria-hidden", String(!state.developerViewVisible));
    const hookedFish = this.resolveDeveloperHookedFish(state);

    if (!state.developerViewVisible) {
      return;
    }

    if (!hookedFish) {
      const possibleFish = state.fishing.possibleFish;
      if (possibleFish.length > 0) {
        this.developerCard.innerHTML = `
          <div class="developer-kicker">Developer View</div>
          <div class="developer-section-title">Possible Hook Table</div>
          <div class="developer-possible-grid">
            ${possibleFish.map((entry) => `
              <div class="developer-possible-fish" style="--fish-color: ${entry.species.color}" title="${entry.species.name}">
                <img src="${entry.species.spriteUrl}" alt="${entry.species.name}" draggable="false">
                <strong>${this.formatChance(entry.chance)}</strong>
              </div>
            `).join("")}
          </div>
        `;
        return;
      }

      this.developerCard.innerHTML = `
        <div class="developer-kicker">Developer View</div>
        <div class="developer-empty">
          <strong>No fish hooked</strong>
          <span>Hook a fish to inspect its generated size and fight stats.</span>
        </div>
      `;
      return;
    }

    const { species, catch: caught, fight, zoneName } = hookedFish;
    this.developerCard.innerHTML = `
      <div class="developer-kicker">Developer View</div>
      <div class="developer-fish-card" style="--fish-color: ${species.color}">
        <img class="developer-fish-sprite" src="${caught.spriteUrl ?? species.spriteUrl}" alt="${caught.name}" draggable="false">
        <div class="developer-fish-summary">
          <div class="developer-label">Hooked Fish</div>
          <div class="developer-fish-name">${caught.name}</div>
          <div class="developer-fish-meta">${species.id} · ${caught.rarity} · ${zoneName}</div>
        </div>
      </div>
      <div class="developer-stats">
        ${this.developerStat("Generated Length", `${caught.lengthCm} cm`, `${species.minLengthCm}-${species.maxLengthCm} cm range`)}
        ${this.developerStat("Generated Weight", formatFishWeight(caught.weightG), `${formatFishWeight(species.minWeightG)}-${formatFishWeight(species.maxWeightG)} range`)}
        ${this.developerStat("Value", `${caught.value} shells`, `${species.baseValue} base`)}
        ${this.developerStat("Depth", `${species.minDepth}-${species.maxDepth} m`, `${species.preferredDepth} preferred`)}
        ${this.developerStat("Bite Chance", `${species.biteChanceModifier.toFixed(2)}x`, "species modifier")}
        ${this.developerStat("Hook Window", `${species.hookWindowModifier.toFixed(2)}x`, "species modifier")}
        ${this.developerStat("Stamina", fight.stamina.toFixed(2), "fight stat")}
        ${this.developerStat("Strength", fight.strength.toFixed(2), "fight stat")}
        ${this.developerStat("Erraticness", fight.erraticness.toFixed(2), "fight stat")}
        ${this.developerStat("Tension Gain", fight.baseTensionGain.toFixed(2), "fight stat")}
        ${this.developerStat("Resistance", fight.progressResistance.toFixed(2), "reel progress")}
      </div>
    `;
  }

  private resolveDeveloperHookedFish(state: HudState): HookedFishSnapshot | null {
    const now = performance.now();
    if (state.fishing.hookedFish) {
      this.retainedHookedFish = state.fishing.hookedFish;
      this.retainedHookedFishUntil = 0;
      return state.fishing.hookedFish;
    }

    if (state.fishing.state === "escaped" && this.retainedHookedFish) {
      if (this.retainedHookedFishUntil === 0) {
        this.retainedHookedFishUntil = now + LOST_HOOKED_FISH_CARD_SECONDS * 1000;
      }

      if (now < this.retainedHookedFishUntil) {
        return this.retainedHookedFish;
      }
    }

    this.retainedHookedFish = null;
    this.retainedHookedFishUntil = 0;
    return null;
  }

  private developerStat(label: string, value: string, detail: string): string {
    return `
      <div class="developer-stat">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${detail}</small>
      </div>
    `;
  }

  private formatChance(chance: number): string {
    const percent = chance * 100;
    if (percent > 0 && percent < 0.1) {
      return "<0.1%";
    }

    return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
  }

  private positionPlayerMeter(position: Vector3, camera: Camera): void {
    const scene = camera.getScene();
    const engine = scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    const viewport = camera.viewport.toGlobal(canvas?.clientWidth ?? engine.getRenderWidth(), canvas?.clientHeight ?? engine.getRenderHeight());
    const screenPosition = Vector3.Project(position, Matrix.Identity(), scene.getTransformMatrix(), viewport);
    this.playerMeterEl.style.left = `${screenPosition.x}px`;
    this.playerMeterEl.style.top = `${screenPosition.y}px`;
  }

  private setMeter(fill: HTMLElement, value: number, preserveGradientRange = false): void {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    if (preserveGradientRange) {
      fill.style.width = `${percent}%`;
      fill.style.backgroundSize = percent > 0 ? `${10000 / percent}% 100%` : "100% 100%";
    } else {
      fill.style.width = `${percent}%`;
    }
  }

  private setSelectorLabel(button: HTMLButtonElement, label: string, ariaLabel: string): void {
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
  }

  private updateLineOptions(lines: FishingLine[], selectedLine: FishingLine, progression: ProgressionState): void {
    const key = `${selectedLine.id}:${lines.map((line) => `${line.id}:${progression.getLineLockLabel(line.id) ?? "unlocked"}`).join(",")}`;
    if (key === this.lineOptionsKey) {
      return;
    }

    this.lineOptionsKey = key;
    this.lineOptionsEl.innerHTML = lines
      .map((line) => {
        const lockLabel = progression.getLineLockLabel(line.id);
        return `<button type="button" class="line-option${line.id === selectedLine.id ? " selected" : ""}${lockLabel ? " locked" : ""}${lockLabel === "🔒" ? " unknown-lock" : ""}"${lockLabel ? " disabled aria-disabled=\"true\"" : ` data-line-id="${line.id}"`}>${lockLabel ?? line.name}</button>`;
      })
      .join("");
  }

  private updateRodOptions(rods: Rod[], selectedRod: Rod, progression: ProgressionState): void {
    const key = `${selectedRod.id}:${rods.map((rod) => `${rod.id}:${progression.getRodLockLabel(rod.id) ?? "unlocked"}`).join(",")}`;
    if (key === this.rodOptionsKey) {
      return;
    }

    this.rodOptionsKey = key;
    this.rodOptionsEl.innerHTML = rods
      .map((rod) => {
        const lockLabel = progression.getRodLockLabel(rod.id);
        return `<button type="button" class="line-option${rod.id === selectedRod.id ? " selected" : ""}${lockLabel ? " locked" : ""}${lockLabel === "🔒" ? " unknown-lock" : ""}"${lockLabel ? " disabled aria-disabled=\"true\"" : ` data-rod-id="${rod.id}"`}>${lockLabel ?? rod.name}</button>`;
      })
      .join("");
  }

  private updateBaitDepthOptions(depths: BaitDepth[], selectedDepth: BaitDepth, progression: ProgressionState): void {
    const key = `${selectedDepth.id}:${depths.map((depth) => `${depth.id}:${progression.getBaitDepthLockLabel(depth.id) ?? "unlocked"}`).join(",")}`;
    if (key === this.baitDepthOptionsKey) {
      return;
    }

    this.baitDepthOptionsKey = key;
    this.baitDepthOptionsEl.innerHTML = depths
      .map((depth) => {
        const lockLabel = progression.getBaitDepthLockLabel(depth.id);
        return `<button type="button" class="line-option${depth.id === selectedDepth.id ? " selected" : ""}${lockLabel ? " locked" : ""}${lockLabel === "🔒" ? " unknown-lock" : ""}"${lockLabel ? " disabled aria-disabled=\"true\"" : ` data-bait-depth-id="${depth.id}"`}>${lockLabel ?? depth.name}</button>`;
      })
      .join("");
  }

  private updateBaitTypeOptions(baitTypes: BaitType[], selectedBaitType: BaitType, progression: ProgressionState): void {
    const key = `${selectedBaitType.id}:${baitTypes.map((baitType) => `${baitType.id}:${progression.getBaitTypeLockLabel(baitType.id) ?? "unlocked"}`).join(",")}`;
    if (key === this.baitTypeOptionsKey) {
      return;
    }

    this.baitTypeOptionsKey = key;
    this.baitTypeOptionsEl.innerHTML = baitTypes
      .map((baitType) => {
        const lockLabel = progression.getBaitTypeLockLabel(baitType.id);
        return `<button type="button" class="line-option${baitType.id === selectedBaitType.id ? " selected" : ""}${lockLabel ? " locked" : ""}${lockLabel === "🔒" ? " unknown-lock" : ""}"${lockLabel ? " disabled aria-disabled=\"true\"" : ` data-bait-type-id="${baitType.id}"`}>${lockLabel ?? baitType.name}</button>`;
      })
      .join("");
  }

  private toggleLineMenu(): void {
    this.setRodMenuOpen(false);
    this.setBaitTypeMenuOpen(false);
    this.setBaitDepthMenuOpen(false);
    this.setLineMenuOpen(!this.lineSelectorEl.classList.contains("open"));
  }

  private toggleRodMenu(): void {
    this.setLineMenuOpen(false);
    this.setBaitTypeMenuOpen(false);
    this.setBaitDepthMenuOpen(false);
    this.setRodMenuOpen(!this.rodSelectorEl.classList.contains("open"));
  }

  private setRodMenuOpen(isOpen: boolean): void {
    this.rodSelectorEl.classList.toggle("open", isOpen);
    this.rodToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  private setLineMenuOpen(isOpen: boolean): void {
    this.lineSelectorEl.classList.toggle("open", isOpen);
    this.lineToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  private toggleBaitDepthMenu(): void {
    this.setRodMenuOpen(false);
    this.setLineMenuOpen(false);
    this.setBaitTypeMenuOpen(false);
    this.setBaitDepthMenuOpen(!this.baitDepthSelectorEl.classList.contains("open"));
  }

  private toggleBaitTypeMenu(): void {
    this.setRodMenuOpen(false);
    this.setLineMenuOpen(false);
    this.setBaitDepthMenuOpen(false);
    this.setBaitTypeMenuOpen(!this.baitTypeSelectorEl.classList.contains("open"));
  }

  private setBaitTypeMenuOpen(isOpen: boolean): void {
    this.baitTypeSelectorEl.classList.toggle("open", isOpen);
    this.baitTypeToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  private setBaitDepthMenuOpen(isOpen: boolean): void {
    this.baitDepthSelectorEl.classList.toggle("open", isOpen);
    this.baitDepthToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  private toggleHelp(): void {
    if (this.helpCard.classList.contains("visible")) {
      this.closeHelp();
      return;
    }

    this.setHelpVisible(true);
  }

  private closeHelp(): void {
    if (this.helpMode === "start") {
      this.onStartGame();
      this.setHelpMode("reset");
    }

    this.setHelpVisible(false);
  }

  private setHelpVisible(isVisible: boolean): void {
    if (isVisible) {
      this.setRodMenuOpen(false);
      this.setLineMenuOpen(false);
      this.setBaitTypeMenuOpen(false);
      this.setBaitDepthMenuOpen(false);
      this.inventoryDrawer.classList.remove("visible");
      this.logDrawer.classList.remove("visible");
    }

    this.root.classList.toggle("help-open", isVisible);
    this.helpCard.classList.toggle("visible", isVisible);
    this.helpCard.setAttribute("aria-hidden", String(!isVisible));
  }

  private setHelpMode(mode: "start" | "reset"): void {
    this.helpMode = mode;
    this.helpActionButton.textContent = mode === "start" ? "Start Game" : "Reset Game";
    this.helpCard.classList.toggle("start-mode", mode === "start");
    this.helpActionButton.classList.toggle("start-game-button", mode === "start");
    this.helpActionButton.classList.toggle("reset-game-button", mode === "reset");
  }

  private setupMobileControls(controlRoot: HTMLElement, onMoveControlsChanged: (controls: RaftControlInput) => void): void {
    const emitControls = (): void => {
      const activeDirections = new Set(this.activeMovePointers.values());
      onMoveControlsChanged({
        throttle: (activeDirections.has("forward") ? 1 : 0) - (activeDirections.has("backward") ? 1 : 0),
        turn: (activeDirections.has("right") ? 1 : 0) - (activeDirections.has("left") ? 1 : 0)
      });
    };

    controlRoot.addEventListener("pointerdown", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-move]");
      if (!button) {
        return;
      }

      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      this.activeMovePointers.set(event.pointerId, button.dataset.move ?? "");
      button.classList.add("active");
      emitControls();
    });

    const endMove = (event: PointerEvent): void => {
      const direction = this.activeMovePointers.get(event.pointerId);
      if (!direction) {
        return;
      }

      event.preventDefault();
      this.activeMovePointers.delete(event.pointerId);
      controlRoot.querySelector<HTMLButtonElement>(`[data-move="${direction}"]`)?.classList.remove("active");
      emitControls();
    };

    controlRoot.addEventListener("pointerup", endMove);
    controlRoot.addEventListener("pointercancel", endMove);
    controlRoot.addEventListener("lostpointercapture", endMove);
  }

  private toggleDrawer(active: HTMLElement, other: HTMLElement): void {
    other.classList.remove("visible");
    active.classList.toggle("visible");
  }

  private readonly stopHudPointerPropagation = (event: PointerEvent): void => {
    if ((event.target as HTMLElement).closest("button, .drawer, .help-card, .line-menu")) {
      event.stopPropagation();
    }
  };

  private must(root: HTMLElement, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Missing HUD element: ${selector}`);
    }

    return element;
  }
}
