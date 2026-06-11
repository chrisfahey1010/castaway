import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GAME_CONFIG } from "../constants";

export interface CircleObstacle {
  center: Vector3;
  radius: number;
}

export function resolveCircleCollisions(position: Vector3, radius: number, obstacles: CircleObstacle[]): Vector3 {
  let resolved = position.clone();

  for (const obstacle of obstacles) {
    const dx = resolved.x - obstacle.center.x;
    const dz = resolved.z - obstacle.center.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = radius + obstacle.radius;

    if (distance < minDistance) {
      const nx = distance > 0.0001 ? dx / distance : 1;
      const nz = distance > 0.0001 ? dz / distance : 0;
      resolved = new Vector3(obstacle.center.x + nx * minDistance, resolved.y, obstacle.center.z + nz * minDistance);
    }
  }

  const worldDistance = Math.hypot(resolved.x, resolved.z);
  const maxDistance = GAME_CONFIG.world.radius - radius;
  if (worldDistance > maxDistance) {
    resolved.x = (resolved.x / worldDistance) * maxDistance;
    resolved.z = (resolved.z / worldDistance) * maxDistance;
  }

  return resolved;
}

export function isInsideAnyObstacle(position: Vector3, obstacles: CircleObstacle[]): boolean {
  return obstacles.some((obstacle) => Math.hypot(position.x - obstacle.center.x, position.z - obstacle.center.z) <= obstacle.radius);
}
