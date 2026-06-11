import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";

export class Water {
  readonly mesh: Mesh;
  private readonly material: StandardMaterial;
  private time = 0;

  constructor(scene: Scene) {
    this.mesh = MeshBuilder.CreateGround(
      "open-water",
      { width: GAME_CONFIG.world.radius * 2.25, height: GAME_CONFIG.world.radius * 2.25, subdivisions: 48 },
      scene
    );
    this.mesh.position.y = -0.06;

    this.material = new StandardMaterial("water-material", scene);
    this.material.diffuseColor = new Color3(0.02, 0.34, 0.67);
    this.material.emissiveColor = new Color3(0.01, 0.16, 0.22);
    this.material.specularColor = new Color3(0, 0, 0);
    this.material.alpha = 0.96;
    this.mesh.material = this.material;

    for (let i = 0; i < 26; i += 1) {
      const line = MeshBuilder.CreateTorus(`wave-line-${i}`, { diameter: 9 + i * 8.5, thickness: 0.035, tessellation: 96 }, scene);
      line.position = new Vector3(0, -0.035 + i * 0.0008, 0);
      line.scaling.z = 0.56 + (i % 4) * 0.08;
      const mat = new StandardMaterial(`wave-line-material-${i}`, scene);
      mat.diffuseColor = new Color3(0.68, 0.95, 1);
      mat.emissiveColor = new Color3(0.18, 0.48, 0.58);
      mat.specularColor = new Color3(0, 0, 0);
      mat.alpha = i % 3 === 0 ? 0.12 : 0.06;
      line.material = mat;
    }
  }

  update(deltaSeconds: number): void {
    this.time += deltaSeconds;
    const pulse = 0.5 + Math.sin(this.time * 0.55) * 0.5;
    this.material.diffuseColor = new Color3(0.018, 0.31 + pulse * 0.045, 0.62 + pulse * 0.05);
    this.mesh.position.y = -0.07 + Math.sin(this.time * 1.8) * 0.012;
  }
}
