import { GAME_CONFIG } from "../constants";
import type { FishingLine, Rod } from "../data/equipment";
import { clamp } from "../utils/math";
import type { FishSpecies } from "./FishSpecies";

export interface FishFightState {
  progress: number;
  tension: number;
  elapsed: number;
  lineRemaining: number;
  requiredLineDistance: number;
}

export type FishFightResult = "fighting" | "caught" | "snapped" | "escaped";

export class FishFightSystem {
  createState(requiredLineDistance: number): FishFightState {
    const distance = Math.max(GAME_CONFIG.fishing.minCastDistance, requiredLineDistance);
    return { progress: 0, tension: 0.22, elapsed: 0, lineRemaining: distance, requiredLineDistance: distance };
  }

  update(
    state: FishFightState,
    species: FishSpecies,
    rod: Rod,
    line: FishingLine,
    isReeling: boolean,
    boatTensionAdjustment: number,
    deltaSeconds: number
  ): FishFightResult {
    state.elapsed += deltaSeconds;
    const pulse = Math.max(0, Math.sin(state.elapsed * (3.2 + species.fight.erraticness * 5))) * species.fight.erraticness;
    const fishPull = species.fight.baseTensionGain + species.fight.strength * 0.08 + pulse * 0.14;
    const fishRunSpeed = GAME_CONFIG.fishing.fishRunLineSpeed * species.fight.stamina * (0.35 + pulse * species.fight.strength);

    if (isReeling) {
      state.lineRemaining -= (GAME_CONFIG.fishing.reelLineSpeed * rod.reelSpeed * line.reelSpeedMultiplier * deltaSeconds) / species.fight.progressResistance;
      if (pulse > 0.5) {
        state.lineRemaining += fishRunSpeed * (pulse - 0.5) * deltaSeconds;
      }
      state.tension += (fishPull + 0.32) * deltaSeconds;
    } else {
      state.tension += fishPull * 0.45 * deltaSeconds;
      state.tension -= 0.46 * line.tensionLimitMultiplier * deltaSeconds;
      state.lineRemaining += fishRunSpeed * 0.7 * deltaSeconds;
    }

    state.lineRemaining = clamp(state.lineRemaining, 0, state.requiredLineDistance);
    state.progress = clamp(1 - state.lineRemaining / state.requiredLineDistance, 0, 1);
    state.tension += boatTensionAdjustment;
    const tensionLimit = rod.tensionLimit * line.tensionLimitMultiplier;
    state.tension = clamp(state.tension, 0, tensionLimit + 0.2);

    if (state.tension > tensionLimit) {
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
