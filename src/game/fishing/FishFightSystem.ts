import { GAME_CONFIG } from "../constants";
import type { FishingLine, Rod } from "../data/equipment";
import { clamp } from "../utils/math";
import type { FishFightStats, FishSpecies } from "./FishSpecies";

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

const CATCH_LINE_LENGTH = 2.4; // Line length at which the fish is close enough to count as caught.
const EXTRA_FIGHT_LINE = 34; // Extra line the fish can pull beyond the starting cast distance before escaping pressure caps out.
const REFERENCE_WEIGHT_G = 3550; // Weight used as the baseline where weight adds no bonus or penalty to resistance.
const PROGRESS_RESISTANCE_STRENGTH_BLEND = 0.50; // Share of final resistance controlled by strength instead of weight.
const PROGRESS_RESISTANCE_STRENGTH_STEP = 2.0; // Larger values make strength affect reel resistance less; smaller values make it matter more.
const PROGRESS_RESISTANCE_WEIGHT_STEP_G = 1000; // Grams needed to shift the weight resistance factor by 1.
const MIN_PROGRESS_RESISTANCE = 0.5; // Lower bound for reel resistance so very small/easy fish cannot reel in instantly.

export function calculateProgressResistance(strength: number, weightG: number): number {
  const strengthFactor = Math.max(0, strength) / PROGRESS_RESISTANCE_STRENGTH_STEP;
  const weightFactor = (Math.max(0, weightG) - REFERENCE_WEIGHT_G) / PROGRESS_RESISTANCE_WEIGHT_STEP_G;
  const resistance = 
    strengthFactor * PROGRESS_RESISTANCE_STRENGTH_BLEND +
    weightFactor * (1 - PROGRESS_RESISTANCE_STRENGTH_BLEND);

  return Math.max(MIN_PROGRESS_RESISTANCE, resistance);
}

export class FishFightSystem {
  createFightStats(species: FishSpecies, weightG: number): FishFightStats {
    const weightRange = species.maxWeightG - species.minWeightG;
    const weightRatio = weightRange > 0 ? clamp((weightG - species.minWeightG) / weightRange, 0, 1) : 0.5;
    const powerScale = 0.5 + weightRatio;
    const erraticnessScale = 0.8 + weightRatio * 0.4;

    return {
      stamina: species.fight.stamina * powerScale,
      strength: species.fight.strength * powerScale,
      erraticness: species.fight.erraticness * erraticnessScale,
      baseTensionGain: species.fight.baseTensionGain * powerScale
    };
  }

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
    fight: FishFightStats,
    fishWeightG: number,
    rod: Rod,
    line: FishingLine,
    isReeling: boolean,
    currentLineDistance: number,
    deltaSeconds: number
  ): FishFightResult {
    state.elapsed += deltaSeconds;
    const pulse = Math.max(0, Math.sin(state.elapsed * (3.2 + fight.erraticness * 5))) * fight.erraticness;
    const baseTensionGain = clamp(0.00025 * fishWeightG, 0.3, 2.4)
    const fishPull = baseTensionGain + fight.strength * 0.08 + pulse * 0.14;
    const fishRunSpeed = GAME_CONFIG.fishing.fishRunLineSpeed * fight.stamina * (0.35 + pulse * fight.strength);
    const progressResistance = calculateProgressResistance(fight.strength, fishWeightG);
    const reelSpeed = (GAME_CONFIG.fishing.reelLineSpeed * rod.reelSpeed * line.reelSpeedMultiplier) / progressResistance;
    state.runIntensity = clamp(0.18 + pulse + fight.strength * 0.18, 0, 1.5);

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
    let tensionTarget = fishPull * 0.36;
    if (slack > 3) {
      tensionTarget = fishPull * 0.24;
    } else if (tautness > 1) {
      tensionTarget = fishPull * 1.60 + (tautness - 1);
    } else {
      tensionTarget += tautness * (0.25 + fight.strength * 0.18);
    }

    if (isReeling) {
      tensionTarget += fishPull * 0.96;
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

    if (state.elapsed >= GAME_CONFIG.fishing.maxFightSeconds + fight.stamina * 5) {
      return "escaped";
    }

    return "fighting";
  }
}
