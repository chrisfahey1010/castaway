import type { CaughtFish } from "../inventory/Inventory";

export function renderInventory(fish: CaughtFish[]): string {
  if (fish.length === 0) {
    return "<p class=\"subtle\">No fish yet. Cast into the lagoon to start.</p>";
  }

  return `<div class="list">${fish
    .map(
      (caught) => `<div class="list-item"><span>${caught.name}<br><small>${caught.zoneName} · ${caught.rarity}</small></span><strong>${caught.lengthCm} cm<br><small>${caught.value} shells</small></strong></div>`
    )
    .join("")}</div>`;
}
