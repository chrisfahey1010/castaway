import { CollectionLog, type FishCollectionEntry } from "../inventory/CollectionLog";
import { Inventory, type CaughtFish } from "../inventory/Inventory";
import { PlayerState, type PlayerStateSnapshot } from "./PlayerState";
import { ProgressionState, type ProgressionSnapshot } from "./ProgressionState";

export interface SaveGame {
  version: number;
  player: PlayerStateSnapshot;
  inventory: CaughtFish[];
  collectionLog: Record<string, FishCollectionEntry>;
  records: Record<string, number>;
  progression?: ProgressionSnapshot;
  settings: {
    volume: number;
  };
}

export class GameState {
  readonly version = 5;
  readonly player = new PlayerState();
  readonly inventory = new Inventory();
  readonly collectionLog = new CollectionLog();
  readonly progression = new ProgressionState();
  records: Record<string, number> = {};
  settings = { volume: 0.45 };

  toSaveGame(): SaveGame {
    return {
      version: this.version,
      player: this.player.toSnapshot(),
      inventory: this.inventory.caughtFish,
      collectionLog: this.collectionLog.entries,
      records: this.records,
      progression: this.progression.toSnapshot(),
      settings: this.settings
    };
  }

  applySave(save: SaveGame): void {
    if (save.version !== this.version) {
      return;
    }

    this.player.applySnapshot(save.player);
    this.inventory.load(save.inventory ?? []);
    this.collectionLog.load(save.collectionLog ?? {}, save.inventory ?? []);
    this.records = save.records ?? {};
    this.progression.applySnapshot(save.progression);
    this.progression.setUniqueSpeciesCaught(Math.max(this.progression.uniqueSpeciesCaught, Object.keys(this.collectionLog.entries).length));
    this.settings = save.settings ?? this.settings;
  }
}
