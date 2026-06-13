import { baitDepths, baitTypes, fishingLines, rods, type BaitDepthId, type BaitTypeId } from "../data/equipment";

const UNLOCK_REQUIREMENT = 5;
const DEPTH_UNLOCK_REQUIREMENT = 10;
const BAMBOO_ROD_UNIQUE_SPECIES_REQUIREMENT = 6;
const REINFORCED_ROD_UNIQUE_SPECIES_REQUIREMENT = 12;

export interface ProgressionSnapshot {
  catchesAtLeast300G?: number;
  catchesAtLeast500G?: number;
  catchesAtLeast1000G?: number;
  uniqueSpeciesCaught?: number;
  catchesByBait?: Partial<Record<BaitTypeId, number>>;
  catchesByDepth?: Partial<Record<BaitDepthId, number>>;
}

export interface ProgressionUnlock {
  kind: "line" | "bait" | "rod" | "depth";
  name: string;
}

const baitUnlockRequirements: Partial<Record<BaitTypeId, BaitTypeId>> = {
  "coconut-grub": "questionable-seaweed",
  "hermit-crab-bits": "coconut-grub",
  pork: "hermit-crab-bits"
};

const depthUnlockRequirements: Partial<Record<BaitDepthId, BaitDepthId>> = {
  medium: "shallow",
  deep: "medium"
};

export class ProgressionState {
  catchesAtLeast300G = 0;
  catchesAtLeast1000G = 0;
  uniqueSpeciesCaught = 0;
  catchesByBait: Record<BaitTypeId, number> = {
    "questionable-seaweed": 0,
    "coconut-grub": 0,
    "hermit-crab-bits": 0,
    pork: 0
  };
  catchesByDepth: Record<BaitDepthId, number> = {
    shallow: 0,
    medium: 0,
    deep: 0
  };

  toSnapshot(): ProgressionSnapshot {
    return {
      catchesAtLeast300G: this.catchesAtLeast300G,
      catchesAtLeast1000G: this.catchesAtLeast1000G,
      uniqueSpeciesCaught: this.uniqueSpeciesCaught,
      catchesByBait: { ...this.catchesByBait },
      catchesByDepth: { ...this.catchesByDepth }
    };
  }

  applySnapshot(snapshot?: ProgressionSnapshot): void {
    this.catchesAtLeast300G = this.cleanCount(snapshot?.catchesAtLeast300G ?? snapshot?.catchesAtLeast500G);
    this.catchesAtLeast1000G = this.cleanCount(snapshot?.catchesAtLeast1000G);
    this.uniqueSpeciesCaught = this.cleanCount(snapshot?.uniqueSpeciesCaught);
    for (const baitType of baitTypes) {
      this.catchesByBait[baitType.id] = this.cleanCount(snapshot?.catchesByBait?.[baitType.id]);
    }
    for (const depth of baitDepths) {
      this.catchesByDepth[depth.id] = this.cleanCount(snapshot?.catchesByDepth?.[depth.id]);
    }
  }

  recordCatch(weightG: number, baitTypeId: BaitTypeId, baitDepthId: BaitDepthId, uniqueSpeciesCaught: number): ProgressionUnlock[] {
    const unlockedBefore = this.unlockedNamesSet();

    if (weightG >= 300) {
      this.catchesAtLeast300G += 1;
    }

    if (weightG >= 1000) {
      this.catchesAtLeast1000G += 1;
    }

    this.catchesByBait[baitTypeId] += 1;
    this.catchesByDepth[baitDepthId] += 1;
    this.setUniqueSpeciesCaught(uniqueSpeciesCaught);

    return this.unlockedNames().filter((unlock) => !unlockedBefore.has(this.unlockKey(unlock)));
  }

  setUniqueSpeciesCaught(count: number): void {
    this.uniqueSpeciesCaught = this.cleanCount(count);
  }

  isLineUnlocked(lineId: string): boolean {
    return this.getLineLockLabel(lineId) === null;
  }

  isRodUnlocked(rodId: string): boolean {
    return this.getRodLockLabel(rodId) === null;
  }

  isBaitTypeUnlocked(baitTypeId: string): boolean {
    return this.getBaitTypeLockLabel(baitTypeId) === null;
  }

  isBaitDepthUnlocked(baitDepthId: string): boolean {
    return this.getBaitDepthLockLabel(baitDepthId) === null;
  }

  getLineLockLabel(lineId: string): string | null {
    if (lineId === "medium-line" && this.catchesAtLeast300G < UNLOCK_REQUIREMENT) {
      return `Catch fish weighing 300g or more (${this.catchesAtLeast300G}/${UNLOCK_REQUIREMENT})`;
    }

    if (lineId === "heavy-line" && this.catchesAtLeast1000G < UNLOCK_REQUIREMENT) {
      return `Catch fish weighing 1.0 kg or more (${this.catchesAtLeast1000G}/${UNLOCK_REQUIREMENT})`;
    }

    return null;
  }

  getRodLockLabel(rodId: string): string | null {
    if (rodId === "bamboo-rod" && this.uniqueSpeciesCaught < BAMBOO_ROD_UNIQUE_SPECIES_REQUIREMENT) {
      return `Catch ${BAMBOO_ROD_UNIQUE_SPECIES_REQUIREMENT} unique fish species (${this.uniqueSpeciesCaught}/${BAMBOO_ROD_UNIQUE_SPECIES_REQUIREMENT})`;
    }

    if (rodId === "reinforced-rod" && this.uniqueSpeciesCaught < REINFORCED_ROD_UNIQUE_SPECIES_REQUIREMENT) {
      return `Catch ${REINFORCED_ROD_UNIQUE_SPECIES_REQUIREMENT} unique fish species (${this.uniqueSpeciesCaught}/${REINFORCED_ROD_UNIQUE_SPECIES_REQUIREMENT})`;
    }

    return null;
  }

  getBaitTypeLockLabel(baitTypeId: string): string | null {
    const requiredBaitTypeId = baitUnlockRequirements[baitTypeId as BaitTypeId];
    if (!requiredBaitTypeId) {
      return null;
    }

    const count = this.catchesByBait[requiredBaitTypeId];
    if (count >= UNLOCK_REQUIREMENT) {
      return null;
    }

    const requiredBaitType = baitTypes.find((baitType) => baitType.id === requiredBaitTypeId);
    return `Catch fish using ${requiredBaitType?.name ?? "the previous bait"} (${count}/${UNLOCK_REQUIREMENT})`;
  }

  getBaitDepthLockLabel(baitDepthId: string): string | null {
    const requiredDepthId = depthUnlockRequirements[baitDepthId as BaitDepthId];
    if (!requiredDepthId) {
      return null;
    }

    const count = this.catchesByDepth[requiredDepthId];
    if (count >= DEPTH_UNLOCK_REQUIREMENT) {
      return null;
    }

    const requiredDepth = baitDepths.find((depth) => depth.id === requiredDepthId);
    return `Catch fish at ${requiredDepth?.name ?? "the previous"} depth (${count}/${DEPTH_UNLOCK_REQUIREMENT})`;
  }

  private unlockedNames(): ProgressionUnlock[] {
    const lineUnlocks = fishingLines
      .filter((line) => line.id !== "light-line" && this.isLineUnlocked(line.id))
      .map((line) => ({ kind: "line" as const, name: line.name }));
    const baitUnlocks = baitTypes
      .filter((baitType) => baitType.id !== "questionable-seaweed" && this.isBaitTypeUnlocked(baitType.id))
      .map((baitType) => ({ kind: "bait" as const, name: baitType.name }));
    const depthUnlocks = baitDepths
      .filter((depth) => depth.id !== "shallow" && this.isBaitDepthUnlocked(depth.id))
      .map((depth) => ({ kind: "depth" as const, name: depth.name }));
    const rodUnlocks = rods
      .filter((rod) => rod.id !== "driftwood-rod" && this.isRodUnlocked(rod.id))
      .map((rod) => ({ kind: "rod" as const, name: rod.name }));

    return [...lineUnlocks, ...baitUnlocks, ...depthUnlocks, ...rodUnlocks];
  }

  private unlockKey(unlock: ProgressionUnlock): string {
    return `${unlock.kind}:${unlock.name}`;
  }

  private unlockedNamesSet(): Set<string> {
    return new Set(this.unlockedNames().map((unlock) => this.unlockKey(unlock)));
  }

  private cleanCount(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.floor(value));
  }
}
