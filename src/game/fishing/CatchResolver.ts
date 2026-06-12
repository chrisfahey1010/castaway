import type { FishingZone } from "../data/fishingZones";
import { catchValueModifiers } from "../data/lootTables";
import type { CaughtFish } from "../inventory/Inventory";
import { randomNormalRatio } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

const NORMAL_SIZE_RATIO = 0.5;
const SIZE_STANDARD_DEVIATION = 0.18;

export class CatchResolver {
  resolve(species: FishSpecies, zone: FishingZone): CaughtFish {
    const sizeRatio = randomNormalRatio(NORMAL_SIZE_RATIO, SIZE_STANDARD_DEVIATION);
    const lengthCm = species.minLengthCm + (species.maxLengthCm - species.minLengthCm) * sizeRatio;
    const weightG = Math.round(species.minWeightG + (species.maxWeightG - species.minWeightG) * sizeRatio);
    const rarityModifier = catchValueModifiers.find((entry) => entry.rarity === species.rarity)?.multiplier ?? 1;
    const trophyBonus = lengthCm >= species.trophyLengthCm ? 1.4 : 1;

    return {
      id: `${species.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      speciesId: species.id,
      name: species.name,
      rarity: species.rarity,
      lengthCm: Math.round(lengthCm * 10) / 10,
      weightG,
      value: Math.round(species.baseValue * rarityModifier * trophyBonus * (lengthCm / species.minLengthCm)),
      zoneName: zone.name,
      spriteUrl: species.spriteUrl,
      caughtAt: Date.now()
    };
  }
}
