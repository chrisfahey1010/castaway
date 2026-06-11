import type { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { assetManifest } from "./assetManifest";
import { AssetRegistry } from "./AssetRegistry";

export class AssetLoader {
  readonly registry = new AssetRegistry();

  constructor(private readonly scene: Scene) {}

  async load(): Promise<AssetRegistry> {
    await Promise.all(
      Object.entries(assetManifest.textures).map(async ([key, url]) => {
        try {
          const texture = new Texture(url, this.scene, true, true);
          this.registry.setTexture(key, texture);
        } catch {
          // Placeholder materials keep the MVP playable when asset files are absent.
        }
      })
    );

    return this.registry;
  }
}
