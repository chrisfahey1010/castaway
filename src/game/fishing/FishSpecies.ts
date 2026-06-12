import type { BaitDepthId, BaitTypeId } from "../data/equipment";

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
  preferredBiome: FishingZoneType;
  secondaryBiomes: FishingZoneType[];
  preferredDepth: BaitDepthId;
  secondaryDepths: BaitDepthId[];
  primaryBait: BaitTypeId;
  secondaryBait: BaitTypeId;
  minDepth: number;
  maxDepth: number;
  minLengthCm: number;
  maxLengthCm: number;
  minWeightG: number;
  maxWeightG: number;
  trophyLengthCm: number;
  baseValue: number;
  biteChanceModifier: number;
  hookWindowModifier: number;
  fight: FishFightStats;
  spriteKey: string;
  spriteUrl: string;
  color: string;
}
