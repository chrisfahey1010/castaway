export function formatFishWeight(weightG: number): string {
  if (weightG < 1000) {
    return `${Math.round(weightG)} g`;
  }

  return `${(weightG / 1000).toFixed(1)} kg`;
}
