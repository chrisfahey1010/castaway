import { Material } from "@babylonjs/core/Materials/material";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

const BOBBER_SPRITE_HEIGHT = 1.15;
const BOBBER_SPRITE_WIDTH = BOBBER_SPRITE_HEIGHT * (486 / 586);

export class Bobber {
  readonly mesh: Mesh;
  private readonly lineAnchorOffset: Vector3;

  constructor(scene: Scene, bobberTexture?: Texture) {
    if (bobberTexture) {
      this.mesh = this.createTexturedBobber(scene, bobberTexture);
      this.lineAnchorOffset = new Vector3(0, 0.05, -BOBBER_SPRITE_HEIGHT / 2);
    } else {
      this.mesh = this.createFallbackBobber(scene);
      this.lineAnchorOffset = new Vector3(0, 0.12, 0);
    }

    this.mesh.isVisible = false;
  }

  getLineAnchorPosition(): Vector3 {
    return this.mesh.position.add(this.lineAnchorOffset);
  }

  show(position: Vector3): void {
    this.mesh.isVisible = true;
    this.mesh.position = position.clone();
  }

  hide(): void {
    this.mesh.isVisible = false;
  }

  setPosition(position: Vector3): void {
    this.mesh.position = position.clone();
  }

  private createTexturedBobber(scene: Scene, bobberTexture: Texture): Mesh {
    bobberTexture.hasAlpha = true;

    const material = new StandardMaterial("bobber-sprite-material", scene);
    material.diffuseTexture = bobberTexture;
    material.emissiveTexture = bobberTexture;
    material.opacityTexture = bobberTexture;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.White();
    material.specularColor = new Color3(0, 0, 0);

    const bobber = MeshBuilder.CreatePlane("bobber-sprite", { width: BOBBER_SPRITE_WIDTH, height: BOBBER_SPRITE_HEIGHT }, scene);
    bobber.rotation.x = -Math.PI / 2;
    bobber.renderingGroupId = 1;
    bobber.material = material;
    return bobber;
  }

  private createFallbackBobber(scene: Scene): Mesh {
    const bobber = MeshBuilder.CreateSphere("bobber", { diameter: 0.8, segments: 12 }, scene);
    const material = new StandardMaterial("bobber-material", scene);
    material.diffuseColor = new Color3(1, 0.08, 0.06);
    material.emissiveColor = new Color3(0.28, 0.02, 0.02);
    bobber.material = material;
    return bobber;
  }
}
