import type { GameState, SaveGame } from "./GameState";

const LEGACY_SAVE_KEYS = ["castaway.save.v1", "castaway.save.v2", "castaway.save.v3"];
const SAVE_KEY = "castaway.save.v4";

export class SaveManager {
  load(state: GameState): boolean {
    for (const key of LEGACY_SAVE_KEYS) {
      window.localStorage.removeItem(key);
    }

    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return false;
    }

    try {
      const save = JSON.parse(raw) as SaveGame;
      if (save.version !== state.version) {
        window.localStorage.removeItem(SAVE_KEY);
        return false;
      }

      state.applySave(save);
      return true;
    } catch {
      window.localStorage.removeItem(SAVE_KEY);
      return false;
    }
  }

  save(state: GameState): void {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state.toSaveGame()));
  }

  clear(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }
}
