import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { startingRod } from "../data/equipment";

export interface PlayerStateSnapshot {
  position: { x: number; z: number };
  equippedRodId: string;
}

export class PlayerState {
  position = new Vector3(0, 0, 34);
  equippedRodId = startingRod.id;

  toSnapshot(): PlayerStateSnapshot {
    return {
      position: { x: this.position.x, z: this.position.z },
      equippedRodId: this.equippedRodId
    };
  }

  applySnapshot(snapshot: PlayerStateSnapshot): void {
    this.position = new Vector3(snapshot.position.x, 0, snapshot.position.z);
    this.equippedRodId = snapshot.equippedRodId;
  }
}
