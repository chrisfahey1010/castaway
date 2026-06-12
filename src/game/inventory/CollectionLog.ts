import type { CaughtFish } from "./Inventory";
import type { FishRarity, FishSpecies } from "../fishing/FishSpecies";

export interface FishCollectionEntry {
  speciesId: string;
  name: string;
  rarity: FishRarity;
  description: string;
  totalCaught: number;
  bestLengthCm: number;
  bestWeightG: number;
  firstCaughtAt: number;
}

export class CollectionLog {
  entries: Record<string, FishCollectionEntry> = {};

  recordCatch(caught: CaughtFish, species: FishSpecies): { isFirstCatch: boolean; isNewRecord: boolean } {
    const existing = this.entries[caught.speciesId];
    const isFirstCatch = !existing;
    const isNewRecord = !existing || caught.weightG > (existing.bestWeightG ?? 0);

    this.entries[caught.speciesId] = {
      speciesId: caught.speciesId,
      name: species.name,
      rarity: species.rarity,
      description: species.description,
      totalCaught: (existing?.totalCaught ?? 0) + 1,
      bestLengthCm: Math.max(existing?.bestLengthCm ?? 0, caught.lengthCm),
      bestWeightG: Math.max(existing?.bestWeightG ?? 0, caught.weightG),
      firstCaughtAt: existing?.firstCaughtAt ?? caught.caughtAt
    };

    return { isFirstCatch, isNewRecord };
  }

  load(entries: Record<string, FishCollectionEntry>, caughtFish: CaughtFish[] = []): void {
    this.entries = Object.fromEntries(
      Object.entries(entries).map(([speciesId, entry]) => {
        const inventoryBestWeight = caughtFish
          .filter((fish) => fish.speciesId === speciesId)
          .reduce((best, fish) => Math.max(best, fish.weightG), 0);

        return [
          speciesId,
          {
            ...entry,
            bestWeightG: entry.bestWeightG ?? inventoryBestWeight
          }
        ];
      })
    );
  }
}
