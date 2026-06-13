export interface Rod {
  id: string;
  name: string;
  castDistanceMultiplier: number;
  hookWindowModifier: number;
  tensionLimit: number;
  reelSpeed: number;
}

export interface FishingLine {
  id: string;
  name: string;
  tensionLimitMultiplier: number;
  reelSpeedMultiplier: number;
  colorHex: string;
}

export type BaitDepthId = "shallow" | "medium" | "deep";
export type BaitTypeId = "pork" | "coconut-grub" | "hermit-crab-bits" | "questionable-seaweed";

export interface BaitDepth {
  id: BaitDepthId;
  name: string;
}

export interface BaitType {
  id: BaitTypeId;
  name: string;
}

export const rods: Rod[] = [
  {
    id: "driftwood-rod",
    name: "Driftwood Rod",
    castDistanceMultiplier: 0.85,
    hookWindowModifier: 0.8,
    tensionLimit: 0.9,
    reelSpeed: 0.26
  },
  {
    id: "bamboo-rod",
    name: "Bamboo Rod",
    castDistanceMultiplier: 1,
    hookWindowModifier: 1,
    tensionLimit: 1,
    reelSpeed: 0.34
  },
  {
    id: "reinforced-rod",
    name: "Reinforced Rod",
    castDistanceMultiplier: 1.15,
    hookWindowModifier: 1.2,
    tensionLimit: 1.1,
    reelSpeed: 0.42
  }
];

export const startingRod = rods[0];

export const fishingLines: FishingLine[] = [
  {
    id: "light-line",
    name: "Light Line",
    tensionLimitMultiplier: 1,
    reelSpeedMultiplier: 1,
    colorHex: "#f0e6c7"
  },
  {
    id: "medium-line",
    name: "Medium Line",
    tensionLimitMultiplier: 2,
    reelSpeedMultiplier: 0.86,
    colorHex: "#d7eef2"
  },
  {
    id: "heavy-line",
    name: "Heavy Line",
    tensionLimitMultiplier: 3,
    reelSpeedMultiplier: 0.72,
    colorHex: "#bac7d4"
  }
];

export const startingFishingLine = fishingLines[0];

export const baitTypes: BaitType[] = [
  {
    id: "questionable-seaweed",
    name: "Tasty Kelp"
  },
  {
    id: "coconut-grub",
    name: "Coconut Grub"
  },
  {
    id: "hermit-crab-bits",
    name: "Crab Meat"
  },
  {
    id: "pork",
    name: "Salted Pork"
  }
];

export const startingBaitType = baitTypes[0];

export const baitDepths: BaitDepth[] = [
  {
    id: "shallow",
    name: "Shallow"
  },
  {
    id: "medium",
    name: "Medium"
  },
  {
    id: "deep",
    name: "Deep"
  }
];

export const startingBaitDepth = baitDepths[0];

export function getFishingLine(id: string): FishingLine {
  return fishingLines.find((line) => line.id === id) ?? startingFishingLine;
}

export function getRod(id: string): Rod {
  return rods.find((rod) => rod.id === id) ?? startingRod;
}

export function getBaitType(id: string): BaitType {
  return baitTypes.find((bait) => bait.id === id) ?? startingBaitType;
}

export function getBaitDepth(id: string): BaitDepth {
  return baitDepths.find((depth) => depth.id === id) ?? startingBaitDepth;
}
