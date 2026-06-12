import type { FishRarity } from "../fishing/FishSpecies";

export interface CaughtFish {
  id: string;
  speciesId: string;
  name: string;
  rarity: FishRarity;
  lengthCm: number;
  weightG: number;
  value: number;
  zoneName: string;
  spriteUrl?: string;
  caughtAt: number;
}

export class Inventory {
  caughtFish: CaughtFish[] = [];

  add(fish: CaughtFish): void {
    this.caughtFish.unshift(fish);
    this.caughtFish = this.caughtFish.slice(0, 50);
  }

  load(fish: CaughtFish[]): void {
    this.caughtFish = fish;
  }
}
