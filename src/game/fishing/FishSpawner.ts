import type { FishingZone } from "../data/fishingZones";
import { getFishSpecies } from "../data/fishSpecies";
import { pickWeighted } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

export class FishSpawner {
  pickFish(zone: FishingZone): FishSpecies {
    const eligible = zone.fishTable
      .map((entry) => {
        const species = getFishSpecies(entry.fishId);
        return species ? { item: species, weight: entry.weight * species.biteChanceModifier } : null;
      })
      .filter((entry): entry is { item: FishSpecies; weight: number } => entry !== null);

    return pickWeighted(eligible);
  }
}
