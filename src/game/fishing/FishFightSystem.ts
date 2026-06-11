import { GAME_CONFIG } from "../constants";
import type { Rod } from "../data/equipment";
import { clamp } from "../utils/math";
import type { FishSpecies } from "./FishSpecies";

export interface FishFightState {
  progress: number;
  tension: number;
  elapsed: number;
}

export type FishFightResult = "fighting" | "caught" | "snapped" | "escaped";

export class FishFightSystem {
  createState(): FishFightState {
    return { progress: 0, tension: 0.22, elapsed: 0 };
  }

  update(state: FishFightState, species: FishSpecies, rod: Rod, isReeling: boolean, deltaSeconds: number): FishFightResult {
    state.elapsed += deltaSeconds;
    const pulse = Math.max(0, Math.sin(state.elapsed * (3.2 + species.fight.erraticness * 5))) * species.fight.erraticness;
    const fishPull = species.fight.baseTensionGain + species.fight.strength * 0.08 + pulse * 0.14;

    if (isReeling) {
      state.progress += (rod.reelSpeed / species.fight.progressResistance) * deltaSeconds;
      state.tension += (fishPull + 0.32) * deltaSeconds;
    } else {
      state.tension += (fishPull * 0.45 - 0.46) * deltaSeconds;
      state.progress -= species.fight.stamina * 0.028 * deltaSeconds;
    }

    state.progress = clamp(state.progress, 0, 1);
    state.tension = clamp(state.tension, 0, 1.45);

    if (state.tension > rod.tensionLimit) {
      return "snapped";
    }

    if (state.progress >= 1) {
      return "caught";
    }

    if (state.elapsed >= GAME_CONFIG.fishing.maxFightSeconds + species.fight.stamina * 5) {
      return "escaped";
    }

    return "fighting";
  }
}
