import type { FishingZone } from "../data/fishingZones";
import { getFishSpecies } from "../data/fishSpecies";
import type { BaitDepth } from "../data/equipment";
import { pickWeighted } from "../utils/random";
import type { FishingZoneType, FishSpecies } from "./FishSpecies";

const SECONDARY_PREFERENCE_MULTIPLIER = 0.25;

export class FishSpawner {
  pickFish(zone: FishingZone, baitDepth: BaitDepth): FishSpecies | null {
    const eligible = zone.fishTable
      .map((entry) => {
        const species = getFishSpecies(entry.fishId);
        if (!species) {
          return null;
        }

        const biomeMultiplier = this.preferenceMultiplier(zone.type, species.preferredBiome, species.secondaryBiomes);
        const depthMultiplier = this.preferenceMultiplier(baitDepth.id, species.preferredDepth, species.secondaryDepths);
        if (biomeMultiplier <= 0 || depthMultiplier <= 0) {
          return null;
        }

        return {
          item: species,
          weight: entry.weight * species.biteChanceModifier * biomeMultiplier * depthMultiplier
        };
      })
      .filter((entry): entry is { item: FishSpecies; weight: number } => entry !== null);

    if (eligible.length === 0) {
      return null;
    }

    return pickWeighted(eligible);
  }

  private preferenceMultiplier<TPreference extends FishingZoneType | BaitDepth["id"]>(value: TPreference, preferred: TPreference, secondary: TPreference[]): number {
    if (value === preferred) {
      return 1;
    }

    return secondary.includes(value) ? SECONDARY_PREFERENCE_MULTIPLIER : 0;
  }
}
