export class PointerInput {
  x = window.innerWidth / 2;
  y = window.innerHeight / 2;
  primaryDown = false;
  primaryPressed = false;
  primaryReleased = false;

  private readonly moveHandler = (event: PointerEvent) => {
    this.x = event.clientX;
    this.y = event.clientY;
  };

  private readonly downHandler = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    this.primaryDown = true;
    this.primaryPressed = true;
  };

  private readonly upHandler = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    this.primaryDown = false;
    this.primaryReleased = true;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {}

  attach(): void {
    this.canvas.addEventListener("pointermove", this.moveHandler);
    this.canvas.addEventListener("pointerdown", this.downHandler);
    window.addEventListener("pointerup", this.upHandler);
  }

  detach(): void {
    this.canvas.removeEventListener("pointermove", this.moveHandler);
    this.canvas.removeEventListener("pointerdown", this.downHandler);
    window.removeEventListener("pointerup", this.upHandler);
  }

  endFrame(): void {
    this.primaryPressed = false;
    this.primaryReleased = false;
  }
}
