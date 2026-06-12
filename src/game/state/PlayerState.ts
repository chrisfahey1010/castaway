import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GAME_CONFIG } from "../constants";
import { getBaitDepth, getBaitType, startingBaitDepth, startingBaitType, startingFishingLine, startingRod } from "../data/equipment";

export interface PlayerStateSnapshot {
  position: { x: number; z: number };
  equippedRodId: string;
  equippedLineId?: string;
  equippedBaitTypeId?: string;
  equippedBaitDepthId?: string;
}

export class PlayerState {
  position = new Vector3(0, 0, GAME_CONFIG.world.islandRadius * 1.1);
  equippedRodId = startingRod.id;
  equippedLineId = startingFishingLine.id;
  equippedBaitTypeId = startingBaitType.id;
  equippedBaitDepthId = startingBaitDepth.id;

  toSnapshot(): PlayerStateSnapshot {
    return {
      position: { x: this.position.x, z: this.position.z },
      equippedRodId: this.equippedRodId,
      equippedLineId: this.equippedLineId,
      equippedBaitTypeId: this.equippedBaitTypeId,
      equippedBaitDepthId: this.equippedBaitDepthId
    };
  }

  applySnapshot(snapshot: PlayerStateSnapshot): void {
    this.position = new Vector3(snapshot.position.x, 0, snapshot.position.z);
    this.equippedRodId = snapshot.equippedRodId;
    this.equippedLineId = snapshot.equippedLineId ?? startingFishingLine.id;
    this.equippedBaitTypeId = getBaitType(snapshot.equippedBaitTypeId ?? startingBaitType.id).id;
    this.equippedBaitDepthId = getBaitDepth(snapshot.equippedBaitDepthId ?? startingBaitDepth.id).id;
  }
}
