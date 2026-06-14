export class KeyboardInput {
  private readonly keys = new Set<string>();
  private readonly downHandler = (event: KeyboardEvent) => {
    if (event.code === "Slash") {
      event.preventDefault();
    }

    this.keys.add(event.code);
  };
  private readonly upHandler = (event: KeyboardEvent) => this.keys.delete(event.code);

  attach(): void {
    window.addEventListener("keydown", this.downHandler);
    window.addEventListener("keyup", this.upHandler);
  }

  detach(): void {
    window.removeEventListener("keydown", this.downHandler);
    window.removeEventListener("keyup", this.upHandler);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  axis(): { x: number; z: number } {
    const left = this.isDown("KeyA") || this.isDown("ArrowLeft") ? 1 : 0;
    const right = this.isDown("KeyD") || this.isDown("ArrowRight") ? 1 : 0;
    const up = this.isDown("KeyW") || this.isDown("ArrowUp") ? 1 : 0;
    const down = this.isDown("KeyS") || this.isDown("ArrowDown") ? 1 : 0;

    return { x: right - left, z: down - up };
  }

  raftControls(): { throttle: number; turn: number } {
    const forward = this.isDown("KeyW") || this.isDown("ArrowUp") ? 1 : 0;
    const backward = this.isDown("KeyS") || this.isDown("ArrowDown") ? 1 : 0;
    const left = this.isDown("KeyA") || this.isDown("ArrowLeft") ? 1 : 0;
    const right = this.isDown("KeyD") || this.isDown("ArrowRight") ? 1 : 0;

    return {
      throttle: forward - backward,
      turn: right - left
    };
  }
}
