export interface WeightedEntry<T> {
  item: T;
  weight: number;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function randomNormalRatio(mean = 0.5, standardDeviation = 0.18): number {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const u1 = Math.max(Number.EPSILON, Math.random());
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = mean + normal * standardDeviation;

    if (value >= 0 && value <= 1) {
      return value;
    }
  }

  return Math.min(1, Math.max(0, mean));
}

export function pickWeighted<T>(entries: WeightedEntry<T>[]): T {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = Math.random() * total;

  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) {
      return entry.item;
    }
  }

  return entries[entries.length - 1].item;
}
