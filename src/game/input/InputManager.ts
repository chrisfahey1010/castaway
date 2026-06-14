import "@babylonjs/core/Culling/ray";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import { KeyboardInput } from "./KeyboardInput";
import { PointerInput } from "./PointerInput";

export interface RaftControlInput {
  throttle: number;
  turn: number;
}

export class InputManager {
  readonly keyboard = new KeyboardInput();
  readonly pointer: PointerInput;
  pointerWorld = new Vector3(0, 0, 0);

  private spaceWasDown = false;
  spacePressed = false;
  spaceReleased = false;
  private slashWasDown = false;
  slashPressed = false;
  private touchControls: RaftControlInput = { throttle: 0, turn: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.pointer = new PointerInput(canvas);
  }

  attach(): void {
    this.keyboard.attach();
    this.pointer.attach();
  }

  detach(): void {
    this.keyboard.detach();
    this.pointer.detach();
  }

  update(scene: Scene, camera: Camera): void {
    const ray = scene.createPickingRay(this.pointer.x, this.pointer.y, Matrix.Identity(), camera);
    const distance = Math.abs(ray.direction.y) > 0.0001 ? -ray.origin.y / ray.direction.y : 0;
    this.pointerWorld = ray.origin.add(ray.direction.scale(distance));

    const spaceDown = this.keyboard.isDown("Space");
    this.spacePressed = spaceDown && !this.spaceWasDown;
    this.spaceReleased = !spaceDown && this.spaceWasDown;
    this.spaceWasDown = spaceDown;

    const slashDown = this.keyboard.isDown("Slash");
    this.slashPressed = slashDown && !this.slashWasDown;
    this.slashWasDown = slashDown;
  }

  get movementAxis(): { x: number; z: number } {
    const keyboardAxis = this.keyboard.axis();
    return {
      x: clampAxis(keyboardAxis.x + this.touchControls.turn),
      z: clampAxis(keyboardAxis.z - this.touchControls.throttle)
    };
  }

  get raftControls(): RaftControlInput {
    const keyboardControls = this.keyboard.raftControls();
    return {
      throttle: clampAxis(keyboardControls.throttle + this.touchControls.throttle),
      turn: clampAxis(keyboardControls.turn + this.touchControls.turn)
    };
  }

  setTouchControls(controls: RaftControlInput): void {
    this.touchControls = {
      throttle: clampAxis(controls.throttle),
      turn: clampAxis(controls.turn)
    };
  }

  get interactDown(): boolean {
    return this.pointer.primaryDown || this.keyboard.isDown("Space");
  }

  get interactPressed(): boolean {
    return this.pointer.primaryPressed || this.spacePressed;
  }

  get interactReleased(): boolean {
    return this.pointer.primaryReleased || this.spaceReleased;
  }

  endFrame(): void {
    this.pointer.endFrame();
    this.spacePressed = false;
    this.spaceReleased = false;
    this.slashPressed = false;
  }
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
