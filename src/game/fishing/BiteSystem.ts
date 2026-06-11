import { GAME_CONFIG } from "../constants";
import type { Rod } from "../data/equipment";
import { randomRange } from "../utils/random";
import type { FishSpecies } from "./FishSpecies";

export class BiteSystem {
  nextBiteSeconds(species: FishSpecies): number {
    const base = randomRange(GAME_CONFIG.fishing.biteMinSeconds, GAME_CONFIG.fishing.biteMaxSeconds);
    return base / species.biteChanceModifier;
  }

  hookWindowSeconds(species: FishSpecies, rod: Rod): number {
    return GAME_CONFIG.fishing.baseHookWindowSeconds * species.hookWindowModifier * rod.hookWindowModifier;
  }
}
