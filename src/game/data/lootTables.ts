export interface CatchValueModifier {
  rarity: string;
  multiplier: number;
}

export const catchValueModifiers: CatchValueModifier[] = [
  { rarity: "common", multiplier: 1 },
  { rarity: "uncommon", multiplier: 1.35 },
  { rarity: "rare", multiplier: 1.9 },
  { rarity: "legendary", multiplier: 3 }
];
