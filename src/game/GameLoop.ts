export class GameLoop {
  private lastTimeMs = performance.now();

  tick(update: (deltaSeconds: number) => void): void {
    const now = performance.now();
    const deltaSeconds = Math.min(0.05, (now - this.lastTimeMs) / 1000);
    this.lastTimeMs = now;
    update(deltaSeconds);
  }
}
