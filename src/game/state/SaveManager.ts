import type { GameState, SaveGame } from "./GameState";

const LEGACY_SAVE_KEYS = ["castaway.save.v1"];
const SAVE_KEY = "castaway.save.v2";

export class SaveManager {
  load(state: GameState): void {
    for (const key of LEGACY_SAVE_KEYS) {
      window.localStorage.removeItem(key);
    }

    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }

    try {
      state.applySave(JSON.parse(raw) as SaveGame);
    } catch {
      window.localStorage.removeItem(SAVE_KEY);
    }
  }

  save(state: GameState): void {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state.toSaveGame()));
  }

  clear(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }
}
