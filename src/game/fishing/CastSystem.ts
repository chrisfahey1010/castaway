import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GAME_CONFIG } from "../constants";
import type { Rod } from "../data/equipment";
import { lerp, normalizeXZ } from "../utils/math";

export interface CastPlan {
  target: Vector3;
  powerPercent: number;
  distance: number;
}

export class CastSystem {
  planCast(origin: Vector3, pointerWorld: Vector3, chargeSeconds: number, rod: Rod): CastPlan {
    const direction = normalizeXZ(pointerWorld.subtract(origin));
    const powerPercent = Math.min(1, chargeSeconds / GAME_CONFIG.fishing.maxChargeSeconds);
    const distance = lerp(GAME_CONFIG.fishing.minCastDistance, GAME_CONFIG.fishing.maxCastDistance * rod.castDistanceMultiplier, powerPercent);
    const target = new Vector3(origin.x + direction.x * distance, 0.12, origin.z + direction.z * distance);
    return { target, powerPercent, distance };
  }
}
