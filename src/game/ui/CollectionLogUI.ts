import type { FishCollectionEntry } from "../inventory/CollectionLog";

export function renderCollectionLog(entries: Record<string, FishCollectionEntry>): string {
  const list = Object.values(entries);
  if (list.length === 0) {
    return "<p class=\"subtle\">Your collection log is waiting for its first entry.</p>";
  }

  return `<div class="list">${list
    .map(
      (entry) => `<div class="list-item"><span>${entry.name}<br><small>${entry.description}</small></span><strong>${entry.bestLengthCm} cm<br><small>x${entry.totalCaught}</small></strong></div>`
    )
    .join("")}</div>`;
}
