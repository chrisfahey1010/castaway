import type { Texture } from "@babylonjs/core/Materials/Textures/texture";

export class AssetRegistry {
  private textures = new Map<string, Texture>();

  setTexture(key: string, texture: Texture): void {
    this.textures.set(key, texture);
  }

  getTexture(key: string): Texture | undefined {
    return this.textures.get(key);
  }
}
