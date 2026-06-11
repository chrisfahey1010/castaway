import type { InputManager } from "../input/InputManager";
import type { World } from "../world/World";
import { RaftController } from "./RaftController";

export class PlayerController {
  constructor(readonly raft: RaftController) {}

  update(input: InputManager, world: World, deltaSeconds: number): void {
    this.raft.update(input, world, deltaSeconds);
  }
}
