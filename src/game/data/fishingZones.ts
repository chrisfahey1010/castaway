import { GAME_CONFIG } from "../constants";
import type { FishingZoneType } from "../fishing/FishSpecies";

export interface WeightedFishSpawn {
  fishId: string;
  weight: number;
}

export interface FishingZone {
  id: string;
  name: string;
  type: FishingZoneType;
  innerRadius: number;
  radius: number;
  depth: number;
  colorTint: string;
  fishTable: WeightedFishSpawn[];
  speedMultiplier: number;
}

export const fishingZones: FishingZone[] = [
  {
    id: "shallow-lagoon",
    name: "Shallows",
    type: "lagoon",
    innerRadius: GAME_CONFIG.world.islandRadius,
    radius: GAME_CONFIG.world.shallowRadius,
    depth: 5,
    colorTint: "#42d6c9",
    speedMultiplier: GAME_CONFIG.raft.shallowSpeedMultiplier,
    fishTable: [
      { fishId: "lagoon-minnow", weight: 42 },
      { fishId: "silver-sardine", weight: 30 },
      { fishId: "needlefish", weight: 9 }
    ]
  },
  {
    id: "coral-reef",
    name: "Reef",
    type: "reef",
    innerRadius: GAME_CONFIG.world.shallowRadius,
    radius: GAME_CONFIG.world.reefRadius,
    depth: 18,
    colorTint: "#148dc2",
    speedMultiplier: GAME_CONFIG.raft.reefSpeedMultiplier,
    fishTable: [
      { fishId: "silver-sardine", weight: 18 },
      { fishId: "blue-tang", weight: 28 },
      { fishId: "parrotfish", weight: 16 },
      { fishId: "red-snapper", weight: 11 },
      { fishId: "needlefish", weight: 12 },
      { fishId: "barracuda", weight: 4 }
    ]
  },
  {
    id: "open-blue",
    name: "Ocean",
    type: "deep",
    innerRadius: GAME_CONFIG.world.reefRadius,
    radius: GAME_CONFIG.world.deepRadius,
    depth: 64,
    colorTint: "#064f9b",
    speedMultiplier: 1,
    fishTable: [
      { fishId: "red-snapper", weight: 12 },
      { fishId: "barracuda", weight: 9 },
      { fishId: "mahi-mahi", weight: 6 }
    ]
  }
];
