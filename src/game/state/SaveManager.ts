import type { GameState, SaveGame } from "./GameState";

const SAVE_KEY = "castaway.save.v1";

export class SaveManager {
  load(state: GameState): void {
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
