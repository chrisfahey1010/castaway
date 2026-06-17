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
      { fishId: "lagoon-minnow", weight: 40 },
      { fishId: "silver-sardine", weight: 28 },
      { fishId: "sand-perch", weight: 22 },
      { fishId: "yellow-goatfish", weight: 18 },
      { fishId: "striped-mullet", weight: 16 },
      { fishId: "sergeant-major", weight: 12 },
      { fishId: "convict-surgeonfish", weight: 8 },
      { fishId: "spotted-scat", weight: 8 },
      { fishId: "needlefish", weight: 8 },
      { fishId: "bonefish", weight: 5 },
      { fishId: "picasso-triggerfish", weight: 3 },
      { fishId: "mangrove-jack", weight: 2 }
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
      { fishId: "blue-tang", weight: 24 },
      { fishId: "sergeant-major", weight: 22 },
      { fishId: "convict-surgeonfish", weight: 18 },
      { fishId: "moorish-idol", weight: 16 },
      { fishId: "silver-sardine", weight: 14 },
      { fishId: "parrotfish", weight: 14 },
      { fishId: "striped-mullet", weight: 10 },
      { fishId: "yellow-goatfish", weight: 10 },
      { fishId: "red-snapper", weight: 10 },
      { fishId: "sand-perch", weight: 9 },
      { fishId: "needlefish", weight: 9 },
      { fishId: "sargassum-filefish", weight: 8 },
      { fishId: "picasso-triggerfish", weight: 8 },
      { fishId: "ocean-spadefish", weight: 7 },
      { fishId: "flying-fish", weight: 6 },
      { fishId: "spotted-scat", weight: 6 },
      { fishId: "longspine-squirrelfish", weight: 6 },
      { fishId: "bluespine-unicornfish", weight: 6 },
      { fishId: "peacock-hind", weight: 6 },
      { fishId: "spanish-mackerel", weight: 5 },
      { fishId: "white-trevally", weight: 4 },
      { fishId: "barracuda", weight: 4 },
      { fishId: "bonefish", weight: 3 },
      { fishId: "mangrove-jack", weight: 3 },
      { fishId: "coral-grouper", weight: 3 },
      { fishId: "giant-trevally", weight: 2 }
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
      { fishId: "flying-fish", weight: 16 },
      { fishId: "sargassum-filefish", weight: 14 },
      { fishId: "longspine-squirrelfish", weight: 10 },
      { fishId: "red-snapper", weight: 10 },
      { fishId: "bluespine-unicornfish", weight: 8 },
      { fishId: "barracuda", weight: 8 },
      { fishId: "mahi-mahi", weight: 6 },
      { fishId: "ocean-spadefish", weight: 6 },
      { fishId: "spanish-mackerel", weight: 6 },
      { fishId: "peacock-hind", weight: 5 },
      { fishId: "white-trevally", weight: 5 },
      { fishId: "coral-grouper", weight: 5 },
      { fishId: "giant-trevally", weight: 5 },
      { fishId: "blackfin-tuna", weight: 4 },
      { fishId: "yellowfin-tuna", weight: 4 },
      { fishId: "wahoo", weight: 3 },
      { fishId: "blue-marlin", weight: 1 }
    ]
  }
];
