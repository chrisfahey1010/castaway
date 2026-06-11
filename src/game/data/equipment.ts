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

export const rods: Rod[] = [
  {
    id: "driftwood-rod",
    name: "Driftwood Rod",
    castDistanceMultiplier: 1,
    hookWindowModifier: 1,
    tensionLimit: 1,
    reelSpeed: 0.34
  },
  {
    id: "bamboo-rod",
    name: "Bamboo Rod",
    castDistanceMultiplier: 1.12,
    hookWindowModifier: 1.08,
    tensionLimit: 1.08,
    reelSpeed: 0.39
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

export function getFishingLine(id: string): FishingLine {
  return fishingLines.find((line) => line.id === id) ?? startingFishingLine;
}
