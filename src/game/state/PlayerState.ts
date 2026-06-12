import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { getBaitDepth, startingBaitDepth, startingFishingLine, startingRod } from "../data/equipment";

export interface PlayerStateSnapshot {
  position: { x: number; z: number };
  equippedRodId: string;
  equippedLineId?: string;
  equippedBaitDepthId?: string;
}

export class PlayerState {
  position = new Vector3(0, 0, 34);
  equippedRodId = startingRod.id;
  equippedLineId = startingFishingLine.id;
  equippedBaitDepthId = startingBaitDepth.id;

  toSnapshot(): PlayerStateSnapshot {
    return {
      position: { x: this.position.x, z: this.position.z },
      equippedRodId: this.equippedRodId,
      equippedLineId: this.equippedLineId,
      equippedBaitDepthId: this.equippedBaitDepthId
    };
  }

  applySnapshot(snapshot: PlayerStateSnapshot): void {
    this.position = new Vector3(snapshot.position.x, 0, snapshot.position.z);
    this.equippedRodId = snapshot.equippedRodId;
    this.equippedLineId = snapshot.equippedLineId ?? startingFishingLine.id;
    this.equippedBaitDepthId = getBaitDepth(snapshot.equippedBaitDepthId ?? startingBaitDepth.id).id;
  }
}
