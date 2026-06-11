import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GAME_CONFIG } from "../constants";
import { smoothDampFactor } from "../utils/math";

export class CameraController {
  constructor(private readonly camera: FreeCamera, private readonly canvas: HTMLCanvasElement) {
    this.resize();
  }

  update(target: Vector3, deltaSeconds: number): void {
    const desired = new Vector3(target.x, GAME_CONFIG.camera.height, target.z + 5);
    const factor = smoothDampFactor(GAME_CONFIG.camera.followSharpness, deltaSeconds);
    this.camera.position = Vector3.Lerp(this.camera.position, desired, factor);
    this.camera.setTarget(new Vector3(this.camera.position.x, 0, this.camera.position.z));
  }

  resize(): void {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const halfHeight = GAME_CONFIG.camera.orthoSize / 2;
    const halfWidth = halfHeight * aspect;
    this.camera.orthoTop = halfHeight;
    this.camera.orthoBottom = -halfHeight;
    this.camera.orthoLeft = -halfWidth;
    this.camera.orthoRight = halfWidth;
  }
}
