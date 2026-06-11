export type FishingZoneType = "lagoon" | "reef" | "deep";
export type FishRarity = "common" | "uncommon" | "rare" | "legendary";

export interface FishFightStats {
  stamina: number;
  strength: number;
  erraticness: number;
  baseTensionGain: number;
  progressResistance: number;
}

export interface FishSpecies {
  id: string;
  name: string;
  description: string;
  rarity: FishRarity;
  habitats: FishingZoneType[];
  minDepth: number;
  maxDepth: number;
  minLengthCm: number;
  maxLengthCm: number;
  trophyLengthCm: number;
  baseValue: number;
  biteChanceModifier: number;
  hookWindowModifier: number;
  fight: FishFightStats;
  spriteKey: string;
  spriteUrl: string;
  color: string;
}
