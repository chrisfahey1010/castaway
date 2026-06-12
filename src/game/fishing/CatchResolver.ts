import type { FishingZone } from "../data/fishingZones";
import { catchValueModifiers } from "../data/lootTables";
import type { CaughtFish } from "../inventory/Inventory";
import { randomRange } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

export class CatchResolver {
  resolve(species: FishSpecies, zone: FishingZone): CaughtFish {
    const lengthCm = randomRange(species.minLengthCm, species.maxLengthCm);
    const lengthRange = species.maxLengthCm - species.minLengthCm;
    const lengthRatio = lengthRange > 0 ? (lengthCm - species.minLengthCm) / lengthRange : 0;
    const expectedWeightG = species.minWeightG + (species.maxWeightG - species.minWeightG) * lengthRatio ** 3;
    const weightG = Math.min(
      species.maxWeightG,
      Math.max(species.minWeightG, Math.round(expectedWeightG * randomRange(0.9, 1.1)))
    );
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
