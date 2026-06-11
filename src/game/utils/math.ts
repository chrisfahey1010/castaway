import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function smoothDampFactor(sharpness: number, deltaSeconds: number): number {
  return 1 - Math.exp(-sharpness * deltaSeconds);
}

export function xzDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function normalizeXZ(vector: Vector3): Vector3 {
  const length = Math.hypot(vector.x, vector.z);
  if (length < 0.0001) {
    return new Vector3(0, 0, 1);
  }

  return new Vector3(vector.x / length, 0, vector.z / length);
}
