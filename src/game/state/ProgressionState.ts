import { baitTypes, fishingLines, type BaitTypeId } from "../data/equipment";

const UNLOCK_REQUIREMENT = 5;

export interface ProgressionSnapshot {
  catchesAtLeast300G?: number;
  catchesAtLeast500G?: number;
  catchesAtLeast1000G?: number;
  catchesByBait?: Partial<Record<BaitTypeId, number>>;
}

export interface ProgressionUnlock {
  kind: "line" | "bait";
  name: string;
}

const baitUnlockRequirements: Partial<Record<BaitTypeId, BaitTypeId>> = {
  "coconut-grub": "questionable-seaweed",
  "hermit-crab-bits": "coconut-grub",
  pork: "hermit-crab-bits"
};

export class ProgressionState {
  catchesAtLeast300G = 0;
  catchesAtLeast1000G = 0;
  catchesByBait: Record<BaitTypeId, number> = {
    "questionable-seaweed": 0,
    "coconut-grub": 0,
    "hermit-crab-bits": 0,
    pork: 0
  };

  toSnapshot(): ProgressionSnapshot {
    return {
      catchesAtLeast300G: this.catchesAtLeast300G,
      catchesAtLeast1000G: this.catchesAtLeast1000G,
      catchesByBait: { ...this.catchesByBait }
    };
  }

  applySnapshot(snapshot?: ProgressionSnapshot): void {
    this.catchesAtLeast300G = this.cleanCount(snapshot?.catchesAtLeast300G ?? snapshot?.catchesAtLeast500G);
    this.catchesAtLeast1000G = this.cleanCount(snapshot?.catchesAtLeast1000G);
    for (const baitType of baitTypes) {
      this.catchesByBait[baitType.id] = this.cleanCount(snapshot?.catchesByBait?.[baitType.id]);
    }
  }

  recordCatch(weightG: number, baitTypeId: BaitTypeId): ProgressionUnlock[] {
    const unlockedBefore = this.unlockedNamesSet();

    if (weightG >= 300) {
      this.catchesAtLeast300G += 1;
    }

    if (weightG >= 1000) {
      this.catchesAtLeast1000G += 1;
    }

    this.catchesByBait[baitTypeId] += 1;

    return this.unlockedNames().filter((unlock) => !unlockedBefore.has(this.unlockKey(unlock)));
  }

  isLineUnlocked(lineId: string): boolean {
    return this.getLineLockLabel(lineId) === null;
  }

  isBaitTypeUnlocked(baitTypeId: string): boolean {
    return this.getBaitTypeLockLabel(baitTypeId) === null;
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

  private unlockedNames(): ProgressionUnlock[] {
    const lineUnlocks = fishingLines
      .filter((line) => line.id !== "light-line" && this.isLineUnlocked(line.id))
      .map((line) => ({ kind: "line" as const, name: line.name }));
    const baitUnlocks = baitTypes
      .filter((baitType) => baitType.id !== "questionable-seaweed" && this.isBaitTypeUnlocked(baitType.id))
      .map((baitType) => ({ kind: "bait" as const, name: baitType.name }));

    return [...lineUnlocks, ...baitUnlocks];
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
