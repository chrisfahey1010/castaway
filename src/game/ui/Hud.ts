import type { FishingLine, Rod } from "../data/equipment";
import { getFishSpriteUrl } from "../data/fishSpecies";
import type { FishingZone } from "../data/fishingZones";
import type { FishingSnapshot } from "../fishing/FishingSystem";
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
  private readonly zoneEl: HTMLElement;
  private readonly promptEl: HTMLElement;
  private readonly subtleEl: HTMLElement;
  private readonly lineOptionsEl: HTMLElement;
  private readonly powerFill: HTMLElement;
  private readonly tensionFill: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly catchCard: HTMLElement;
  private readonly inventoryDrawer: HTMLElement;
  private readonly logDrawer: HTMLElement;
  private catchHideTimer: number | null = null;
  private lineOptionsKey = "";

  constructor(root: HTMLElement, onLineSelected: (lineId: string) => void) {
    root.innerHTML = `
      <div class="hud">
        <div class="hud-top">
          <div class="panel status-panel">
            <div class="zone" data-zone>Shallow Lagoon</div>
            <div class="prompt" data-prompt>Loading...</div>
            <div class="subtle" data-subtle></div>
            <div class="line-selector" data-line-options></div>
          </div>
          <div class="buttons">
            <button type="button" data-inventory>Inventory</button>
            <button type="button" data-log>Collection</button>
          </div>
        </div>
        <div></div>
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
            <div class="meter"><div class="meter-fill" data-progress></div></div>
          </div>
        </div>
      </div>
      <div class="catch-card" data-catch-card></div>
      <div class="drawer" data-inventory-drawer></div>
      <div class="drawer" data-log-drawer></div>
    `;

    this.zoneEl = this.must(root, "[data-zone]");
    this.promptEl = this.must(root, "[data-prompt]");
    this.subtleEl = this.must(root, "[data-subtle]");
    this.lineOptionsEl = this.must(root, "[data-line-options]");
    this.powerFill = this.must(root, "[data-power]");
    this.tensionFill = this.must(root, "[data-tension]");
    this.progressFill = this.must(root, "[data-progress]");
    this.catchCard = this.must(root, "[data-catch-card]");
    this.inventoryDrawer = this.must(root, "[data-inventory-drawer]");
    this.logDrawer = this.must(root, "[data-log-drawer]");
    this.toasts = new Toasts(root);

    this.must(root, "[data-inventory]").addEventListener("click", () => this.toggleDrawer(this.inventoryDrawer, this.logDrawer));
    this.must(root, "[data-log]").addEventListener("click", () => this.toggleDrawer(this.logDrawer, this.inventoryDrawer));
    this.lineOptionsEl.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-line-id]");
      if (button) {
        onLineSelected(button.dataset.lineId ?? "");
      }
    });
  }

  update(state: HudState): void {
    this.zoneEl.textContent = state.zone?.name ?? "Island Shore";
    this.promptEl.textContent = promptForFishing(state.fishing);
    this.subtleEl.textContent = `${state.rod.name} · ${state.line.name}${state.fishing.hookedFishName ? ` · ${state.fishing.hookedFishName}` : ""}`;
    this.updateLineOptions(state.lines, state.line);
    this.setMeter(this.powerFill, "[data-power-text]", state.fishing.castPower);
    this.setMeter(this.tensionFill, "[data-tension-text]", state.fishing.tension / (state.rod.tensionLimit * state.line.tensionLimitMultiplier));
    this.setMeter(this.progressFill, "[data-progress-text]", state.fishing.reelProgress);
    this.inventoryDrawer.innerHTML = `<h2>Inventory</h2>${renderInventory(state.inventory)}`;
    this.logDrawer.innerHTML = `<h2>Collection Log</h2>${renderCollectionLog(state.collectionLog)}`;
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

  private setMeter(fill: HTMLElement, labelSelector: string, value: number): void {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    fill.style.width = `${percent}%`;
    const label = document.querySelector<HTMLElement>(labelSelector);
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

  private toggleDrawer(active: HTMLElement, other: HTMLElement): void {
    other.classList.remove("visible");
    active.classList.toggle("visible");
  }

  private must(root: HTMLElement, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Missing HUD element: ${selector}`);
    }

    return element;
  }
}
