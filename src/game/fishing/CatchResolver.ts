import type { FishingZone } from "../data/fishingZones";
import { catchValueModifiers } from "../data/lootTables";
import type { CaughtFish } from "../inventory/Inventory";
import { randomRange } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

export class CatchResolver {
  resolve(species: FishSpecies, zone: FishingZone): CaughtFish {
    const lengthCm = randomRange(species.minLengthCm, species.maxLengthCm);
    const weightKg = Math.max(0.1, (lengthCm / 100) ** 3 * (species.fight.strength + 0.8) * 4.8);
    const rarityModifier = catchValueModifiers.find((entry) => entry.rarity === species.rarity)?.multiplier ?? 1;
    const trophyBonus = lengthCm >= species.trophyLengthCm ? 1.4 : 1;

    return {
      id: `${species.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      speciesId: species.id,
      name: species.name,
      rarity: species.rarity,
      lengthCm: Math.round(lengthCm * 10) / 10,
      weightKg: Math.round(weightKg * 10) / 10,
      value: Math.round(species.baseValue * rarityModifier * trophyBonus * (lengthCm / species.minLengthCm)),
      zoneName: zone.name,
      spriteUrl: species.spriteUrl,
      caughtAt: Date.now()
    };
  }
}
