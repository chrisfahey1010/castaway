import type { FishingLine, Rod } from "../data/equipment";
import { getFishSpriteUrl } from "../data/fishSpecies";
import type { FishingZone } from "../data/fishingZones";
import type { FishingSnapshot } from "../fishing/FishingSystem";
import type { RaftControlInput } from "../input/InputManager";
import type { CaughtFish } from "../inventory/Inventory";
import type { FishCollectionEntry } from "../inventory/CollectionLog";
import { renderCollectionLog } from "./CollectionLogUI";
import { promptForFishing } from "./FishingUI";
import { renderInventory } from "./InventoryUI";
import { Toasts } from "./Toasts";

export interface HudState {
  zone: FishingZone | null;
  rod: Rod;
  line: FishingLine;
  lines: FishingLine[];
  fishing: FishingSnapshot;
  inventory: CaughtFish[];
  collectionLog: Record<string, FishCollectionEntry>;
}

export class Hud {
  readonly toasts: Toasts;
  private readonly root: HTMLElement;
  private readonly zoneEl: HTMLElement;
  private readonly promptEl: HTMLElement;
  private readonly subtleEl: HTMLElement;
  private readonly lineOptionsEl: HTMLElement;
  private readonly lineSelectorEl: HTMLElement;
  private readonly lineToggleButton: HTMLButtonElement;
  private readonly helpCard: HTMLElement;
  private readonly powerFill: HTMLElement;
  private readonly tensionFill: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly catchCard: HTMLElement;
  private readonly inventoryDrawer: HTMLElement;
  private readonly logDrawer: HTMLElement;
  private readonly activeMovePointers = new Map<number, string>();
  private readonly mobileViewport = window.matchMedia("(pointer: coarse), (max-width: 680px)");
  private catchHideTimer: number | null = null;
  private idlePromptVisible = true;
  private inventoryHtml = "";
  private logHtml = "";
  private lineOptionsKey = "";

  constructor(root: HTMLElement, onLineSelected: (lineId: string) => void, onMoveControlsChanged: (controls: RaftControlInput) => void) {
    this.root = root;
    root.innerHTML = `
      <div class="hud">
        <div class="hud-top">
          <div class="panel status-panel">
            <div class="status-header">
              <div class="zone" data-zone>Shallows</div>
              <button type="button" class="icon-button" data-help-toggle aria-label="Show instructions">?</button>
            </div>
            <div class="prompt" data-prompt>Loading...</div>
            <div class="subtle" data-subtle></div>
            <div class="status-controls">
              <div class="line-selector" data-line-selector>
                <button type="button" class="line-select-button" data-line-toggle aria-expanded="false">Select Line</button>
                <div class="line-menu" data-line-options></div>
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
        <div class="panel meters">
          <div class="meter-row">
            <div class="meter-label"><span>Cast Power</span><span data-power-text>0%</span></div>
            <div class="meter"><div class="meter-fill" data-power></div></div>
          </div>
          <div class="meter-row">
            <div class="meter-label"><span>Line Tension</span><span data-tension-text>0%</span></div>
            <div class="meter"><div class="meter-fill tension" data-tension></div></div>
          </div>
          <div class="meter-row">
            <div class="meter-label"><span>Reel Progress</span><span data-progress-text>0%</span></div>
            <div class="meter"><div class="meter-fill progress" data-progress></div></div>
          </div>
        </div>
      </div>
      <div class="catch-card" data-catch-card></div>
      <div class="help-card panel" data-help-card aria-hidden="true">
        <button type="button" class="drawer-close" data-help-close aria-label="Close instructions">x</button>
        <h2>How to Play</h2>
        <p>Move the raft with WASD, arrow keys, or the on-screen arrows on mobile.</p>
        <p>Aim at the water, then hold and release to cast. Tap during a bite, then hold to reel.</p>
        <p>Steer toward the bobber while reeling to reduce line tension.</p>
      </div>
      <div class="drawer" data-inventory-drawer></div>
      <div class="drawer" data-log-drawer></div>
    `;

    this.zoneEl = this.must(root, "[data-zone]");
    this.promptEl = this.must(root, "[data-prompt]");
    this.subtleEl = this.must(root, "[data-subtle]");
    this.lineOptionsEl = this.must(root, "[data-line-options]");
    this.lineSelectorEl = this.must(root, "[data-line-selector]");
    this.lineToggleButton = this.must(root, "[data-line-toggle]") as HTMLButtonElement;
    this.powerFill = this.must(root, "[data-power]");
    this.tensionFill = this.must(root, "[data-tension]");
    this.progressFill = this.must(root, "[data-progress]");
    this.catchCard = this.must(root, "[data-catch-card]");
    this.helpCard = this.must(root, "[data-help-card]");
    this.inventoryDrawer = this.must(root, "[data-inventory-drawer]");
    this.logDrawer = this.must(root, "[data-log-drawer]");
    this.toasts = new Toasts(root);

    root.addEventListener("pointerdown", this.stopHudPointerPropagation);
    root.addEventListener("pointerup", this.stopHudPointerPropagation);
    root.addEventListener("pointercancel", this.stopHudPointerPropagation);
    root.querySelectorAll("[data-inventory]").forEach((button) => button.addEventListener("click", () => this.toggleDrawer(this.inventoryDrawer, this.logDrawer)));
    root.querySelectorAll("[data-log]").forEach((button) => button.addEventListener("click", () => this.toggleDrawer(this.logDrawer, this.inventoryDrawer)));
    this.must(root, "[data-help-toggle]").addEventListener("click", () => this.toggleHelp());
    this.must(root, "[data-help-close]").addEventListener("click", () => this.setHelpVisible(false));
    this.lineToggleButton.addEventListener("click", () => this.toggleLineMenu());
    root.addEventListener("click", (event) => {
      const closeButton = (event.target as HTMLElement).closest("[data-drawer-close]");
      if (closeButton) {
        closeButton.closest(".drawer")?.classList.remove("visible");
      }
    });
    this.lineOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-line-id]");
      if (button) {
        onLineSelected(button.dataset.lineId ?? "");
        this.setLineMenuOpen(false);
      }
    });
    this.setupMobileControls(this.must(root, "[data-mobile-controls]"), onMoveControlsChanged);

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
    this.subtleEl.textContent = `${state.rod.name} · ${state.line.name}${state.fishing.hookedFishName ? ` · ${state.fishing.hookedFishName}` : ""}`;
    this.updateLineOptions(state.lines, state.line);
    this.setMeter(this.powerFill, "[data-power-text]", state.fishing.castPower, true);
    this.setMeter(this.tensionFill, "[data-tension-text]", state.fishing.tension / (state.rod.tensionLimit * state.line.tensionLimitMultiplier), true);
    this.setMeter(this.progressFill, "[data-progress-text]", state.fishing.reelProgress);
    const inventoryHtml = `<button type="button" class="drawer-close" data-drawer-close aria-label="Close inventory">x</button><h2>Inventory</h2>${renderInventory(state.inventory)}`;
    if (inventoryHtml !== this.inventoryHtml) {
      this.inventoryHtml = inventoryHtml;
      this.inventoryDrawer.innerHTML = inventoryHtml;
    }

    const logHtml = `<button type="button" class="drawer-close" data-drawer-close aria-label="Close collection log">x</button><h2>Collection Log</h2>${renderCollectionLog(state.collectionLog)}`;
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
      <div class="catch-meta">${caught.lengthCm} cm · ${caught.weightKg} kg · ${caught.rarity}</div>
      <div class="catch-meta">${caught.value} shells${isNewRecord ? " · New record!" : ""}</div>
    `;
    this.catchCard.classList.add("visible");
    if (this.catchHideTimer !== null) {
      window.clearTimeout(this.catchHideTimer);
    }
    this.catchHideTimer = window.setTimeout(() => this.catchCard.classList.remove("visible"), 3200);
  }

  private setMeter(fill: HTMLElement, labelSelector: string, value: number, preserveGradientRange = false): void {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    if (preserveGradientRange) {
      fill.style.width = `${percent}%`;
      fill.style.backgroundSize = percent > 0 ? `${10000 / percent}% 100%` : "100% 100%";
    } else {
      fill.style.width = `${percent}%`;
    }
    const label = this.root.querySelector<HTMLElement>(labelSelector);
    if (label) {
      label.textContent = `${percent}%`;
    }
  }

  private updateLineOptions(lines: FishingLine[], selectedLine: FishingLine): void {
    const key = `${selectedLine.id}:${lines.map((line) => line.id).join(",")}`;
    if (key === this.lineOptionsKey) {
      return;
    }

    this.lineOptionsKey = key;
    this.lineOptionsEl.innerHTML = lines
      .map((line) => `<button type="button" class="line-option${line.id === selectedLine.id ? " selected" : ""}" data-line-id="${line.id}">${line.name}</button>`)
      .join("");
  }

  private toggleLineMenu(): void {
    this.setLineMenuOpen(!this.lineSelectorEl.classList.contains("open"));
  }

  private setLineMenuOpen(isOpen: boolean): void {
    this.lineSelectorEl.classList.toggle("open", isOpen);
    this.lineToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  private toggleHelp(): void {
    this.setHelpVisible(!this.helpCard.classList.contains("visible"));
  }

  private setHelpVisible(isVisible: boolean): void {
    this.helpCard.classList.toggle("visible", isVisible);
    this.helpCard.setAttribute("aria-hidden", String(!isVisible));
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
