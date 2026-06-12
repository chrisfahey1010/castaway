import type { FishCollectionEntry } from "../inventory/CollectionLog";
import { getBaitDepth, getBaitType } from "../data/equipment";
import { getFishSpecies } from "../data/fishSpecies";
import type { FishingZoneType } from "../fishing/FishSpecies";
import { formatFishWeight } from "./formatters";

export function renderCollectionLog(entries: Record<string, FishCollectionEntry>): string {
  const list = Object.values(entries);
  if (list.length === 0) {
    return "<p class=\"subtle\">Your collection log is waiting for its first entry.</p>";
  }

  return `<div class="list collection-list">${list
    .map((entry) => {
      const species = getFishSpecies(entry.speciesId);
      const spriteUrl = species?.spriteUrl;
      const biomes = species
        ? formatPreferences(species.preferredBiome, species.secondaryBiomes, formatBiome)
        : "Unknown";
      const depths = species
        ? formatPreferences(species.preferredDepth, species.secondaryDepths, (depthId) => getBaitDepth(depthId).name)
        : "Unknown";
      const baits = species
        ? formatPreferences(species.primaryBait, [species.secondaryBait], (baitId) => getBaitType(baitId).name)
        : "Unknown";

      return `<div class="list-item collection-item">
        ${spriteUrl ? `<img class="collection-sprite" src="${spriteUrl}" alt="${entry.name}" draggable="false">` : ""}
        <div class="collection-details">
          <div class="collection-row-top"><span><strong>${entry.name}</strong><br><small>${entry.description}</small></span><strong>${formatFishWeight(entry.bestWeightG ?? 0)}<br><small>x${entry.totalCaught}</small></strong></div>
          <div class="collection-facts"><span>Biomes: ${biomes}</span><span>Depths: ${depths}</span><span>Baits: ${baits}</span></div>
        </div>
      </div>`;
    })
    .join("")}</div>`;
}

function formatPreferences<T>(preferred: T, secondary: T[], labelFor: (value: T) => string): string {
  return [`${labelFor(preferred)} (preferred)`, ...secondary.map(labelFor)].join(", ");
}

function formatBiome(biome: FishingZoneType): string {
  return biome[0].toUpperCase() + biome.slice(1);
}
