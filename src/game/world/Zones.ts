import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { fishingZones, type FishingZone } from "../data/fishingZones";

export function getZoneAt(position: Vector3): FishingZone | null {
  const distance = Math.hypot(position.x, position.z);
  return fishingZones.find((zone) => distance > zone.innerRadius && distance <= zone.radius) ?? null;
}
