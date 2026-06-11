import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";

export class Bobber {
  readonly mesh: Mesh;

  constructor(scene: Scene) {
    this.mesh = MeshBuilder.CreateSphere("bobber", { diameter: 0.8, segments: 12 }, scene);
    const material = new StandardMaterial("bobber-material", scene);
    material.diffuseColor = new Color3(1, 0.08, 0.06);
    material.emissiveColor = new Color3(0.28, 0.02, 0.02);
    this.mesh.material = material;
    this.mesh.isVisible = false;
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
}
