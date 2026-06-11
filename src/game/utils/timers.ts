export class CountdownTimer {
  remaining = 0;

  start(seconds: number): void {
    this.remaining = seconds;
  }

  update(deltaSeconds: number): boolean {
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    return this.remaining === 0;
  }

  get progress(): number {
    return this.remaining;
  }
}
