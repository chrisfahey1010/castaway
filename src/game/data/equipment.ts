export interface Rod {
  id: string;
  name: string;
  castDistanceMultiplier: number;
  hookWindowModifier: number;
  tensionLimit: number;
  reelSpeed: number;
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
