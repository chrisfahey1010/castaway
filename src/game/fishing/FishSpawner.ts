import type { FishingZone } from "../data/fishingZones";
import { getFishSpecies } from "../data/fishSpecies";
import type { BaitDepth, BaitType } from "../data/equipment";
import { pickWeighted } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

const SECONDARY_PREFERENCE_MULTIPLIER = 0.25;

export interface FishSpawnChance {
  species: FishSpecies;
  weight: number;
  chance: number;
}

export class FishSpawner {
  pickFish(zone: FishingZone, baitDepth: BaitDepth, baitType: BaitType): FishSpecies | null {
    const eligible = this.getEligibleFish(zone, baitDepth, baitType);

    if (eligible.length === 0) {
      return null;
    }

    return pickWeighted(eligible.map((entry) => ({ item: entry.species, weight: entry.weight })));
  }

  getFishChances(zone: FishingZone, baitDepth: BaitDepth, baitType: BaitType): FishSpawnChance[] {
    const eligible = this.getEligibleFish(zone, baitDepth, baitType);
    const totalWeight = eligible.reduce((total, entry) => total + entry.weight, 0);
    if (totalWeight <= 0) {
      return [];
    }

    return eligible.map((entry) => ({
      ...entry,
      chance: entry.weight / totalWeight
    }));
  }

  private getEligibleFish(zone: FishingZone, baitDepth: BaitDepth, baitType: BaitType): Array<{ species: FishSpecies; weight: number }> {
    return zone.fishTable
      .map((entry) => {
        const species = getFishSpecies(entry.fishId);
        if (!species) {
          return null;
        }

        const biomeMultiplier = this.preferenceMultiplier(zone.type, species.preferredBiome, species.secondaryBiomes);
        const depthMultiplier = this.preferenceMultiplier(baitDepth.id, species.preferredDepth, species.secondaryDepths);
        const baitMultiplier = this.preferenceMultiplier(baitType.id, species.primaryBait, [species.secondaryBait]);
        if (biomeMultiplier <= 0 || depthMultiplier <= 0 || baitMultiplier <= 0) {
          return null;
        }

        return {
          species,
          weight: entry.weight * species.biteChanceModifier * biomeMultiplier * depthMultiplier * baitMultiplier
        };
      })
      .filter((entry): entry is { species: FishSpecies; weight: number } => entry !== null);
  }

  private preferenceMultiplier<TPreference extends string>(value: TPreference, preferred: TPreference, secondary: TPreference[]): number {
    if (value === preferred) {
      return 1;
    }

    return secondary.includes(value) ? SECONDARY_PREFERENCE_MULTIPLIER : 0;
  }
}
