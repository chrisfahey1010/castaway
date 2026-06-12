import { GAME_CONFIG } from "../constants";
import type { FishingLine, Rod } from "../data/equipment";
import { clamp } from "../utils/math";
import type { FishSpecies } from "./FishSpecies";

export interface FishFightState {
  progress: number;
  tension: number;
  elapsed: number;
  lineLength: number;
  initialLineLength: number;
  maxLineLength: number;
  catchLineLength: number;
  runIntensity: number;
  overloadSeconds: number;
}

export type FishFightResult = "fighting" | "caught" | "snapped" | "escaped";

const CATCH_LINE_LENGTH = 2.4;
const EXTRA_FIGHT_LINE = 34;

export class FishFightSystem {
  createState(initialLineDistance: number): FishFightState {
    const lineLength = Math.max(CATCH_LINE_LENGTH, initialLineDistance);
    return {
      progress: 0,
      tension: 0.22,
      elapsed: 0,
      lineLength,
      initialLineLength: lineLength,
      maxLineLength: Math.max(lineLength + EXTRA_FIGHT_LINE, lineLength * 2.35),
      catchLineLength: CATCH_LINE_LENGTH,
      runIntensity: 0,
      overloadSeconds: 0
    };
  }

  update(
    state: FishFightState,
    species: FishSpecies,
    rod: Rod,
    line: FishingLine,
    isReeling: boolean,
    currentLineDistance: number,
    deltaSeconds: number
  ): FishFightResult {
    state.elapsed += deltaSeconds;
    const pulse = Math.max(0, Math.sin(state.elapsed * (3.2 + species.fight.erraticness * 5))) * species.fight.erraticness;
    const fishPull = species.fight.baseTensionGain + species.fight.strength * 0.08 + pulse * 0.14;
    const fishRunSpeed = GAME_CONFIG.fishing.fishRunLineSpeed * species.fight.stamina * (0.35 + pulse * species.fight.strength);
    const elitePressure = Math.max(0, species.fight.strength * 0.8 + species.fight.stamina * 0.45 + species.fight.baseTensionGain * 1.7 - 1.9);
    const reelSpeed = (GAME_CONFIG.fishing.reelLineSpeed * rod.reelSpeed * line.reelSpeedMultiplier) / species.fight.progressResistance;
    state.runIntensity = clamp(0.18 + pulse + species.fight.strength * 0.18, 0, 1.5);

    if (isReeling) {
      state.lineLength -= reelSpeed * deltaSeconds;
      if (pulse > 0.42) {
        state.lineLength += fishRunSpeed * (pulse - 0.42) * 0.95 * deltaSeconds;
      }
    } else {
      state.lineLength += fishRunSpeed * (0.55 + pulse * 0.45) * deltaSeconds;
    }

    state.lineLength = clamp(state.lineLength, state.catchLineLength, state.maxLineLength);

    const safeLineLength = Math.max(0.001, state.lineLength);
    const tautness = currentLineDistance / safeLineLength;
    const slack = state.lineLength - currentLineDistance;
    let tensionTarget = 0.14 + fishPull * 0.36;
    if (slack > 3) {
      tensionTarget = 0.05 + fishPull * 0.12;
    } else if (tautness > 1) {
      tensionTarget = 0.55 + fishPull * 0.7 + elitePressure * 1.15 + (tautness - 1) * (1.85 + elitePressure * 0.7);
    } else {
      tensionTarget += tautness * (0.25 + species.fight.strength * 0.11 + elitePressure * 0.9);
    }

    if (isReeling) {
      tensionTarget += 0.2 + fishPull * 0.48 + species.fight.strength * 0.065 + elitePressure * 0.72;
    } else {
      tensionTarget -= 0.14 * line.tensionLimitMultiplier;
    }

    const tensionResponse = 1 - Math.exp(-(isReeling ? 2.8 : 2) * deltaSeconds);
    state.tension += (tensionTarget - state.tension) * tensionResponse;

    const progressRange = Math.max(0.001, state.initialLineLength - state.catchLineLength);
    state.progress = clamp(1 - (state.lineLength - state.catchLineLength) / progressRange, 0, 1);
    const tensionLimit = rod.tensionLimit * line.tensionLimitMultiplier;
    state.tension = clamp(state.tension, 0, tensionLimit + 0.2);

    if (state.tension > tensionLimit) {
      const overload = state.tension - tensionLimit;
      state.overloadSeconds += deltaSeconds * (1 + overload * 4.5);
    } else {
      state.overloadSeconds = Math.max(0, state.overloadSeconds - deltaSeconds * 2.5);
    }

    if (state.overloadSeconds >= 0.45) {
      return "snapped";
    }

    if (state.lineLength <= state.catchLineLength + 0.15 && currentLineDistance <= state.catchLineLength + 1.25) {
      return "caught";
    }

    if (state.elapsed >= GAME_CONFIG.fishing.maxFightSeconds + species.fight.stamina * 5) {
      return "escaped";
    }

    return "fighting";
  }
}
