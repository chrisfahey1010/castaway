import { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { CircleObstacle } from "./Collision";

export class Island {
  readonly obstacles: CircleObstacle[];

  constructor(scene: Scene, palmTexture?: Texture) {
    const sandMaterial = new StandardMaterial("sand-material", scene);
    sandMaterial.diffuseColor = new Color3(0.94, 0.78, 0.45);
    sandMaterial.emissiveColor = new Color3(0.1, 0.07, 0.02);
    sandMaterial.specularColor = new Color3(0, 0, 0);

    const grassMaterial = new StandardMaterial("grass-material", scene);
    grassMaterial.diffuseColor = new Color3(0.18, 0.58, 0.25);
    grassMaterial.emissiveColor = new Color3(0.02, 0.08, 0.02);
    grassMaterial.specularColor = new Color3(0, 0, 0);

    const sand = MeshBuilder.CreateCylinder("island-sand", { diameter: GAME_CONFIG.world.islandRadius * 2, height: 0.22, tessellation: 72 }, scene);
    sand.position.y = 0.04;
    sand.scaling.x = 1.16;
    sand.scaling.z = 0.9;
    sand.material = sandMaterial;

    const grass = MeshBuilder.CreateCylinder("island-palms", { diameter: GAME_CONFIG.world.islandRadius * 1.16, height: 0.26, tessellation: 48 }, scene);
    grass.position = new Vector3(-1, 0.18, -1.5);
    grass.scaling.x = 1.08;
    grass.scaling.z = 0.78;
    grass.material = grassMaterial;

    this.createPalms(scene, palmTexture);
    this.obstacles = [{ center: new Vector3(0, 0, 0), radius: GAME_CONFIG.world.islandRadius * 0.94 }];
  }

  private createPalms(scene: Scene, palmTexture?: Texture): void {
    const positions = [
      { position: new Vector3(-10, 0, -4), scale: 1.05, rotation: -0.25 },
      { position: new Vector3(-5, 0, 8), scale: 0.92, rotation: 0.2 },
      { position: new Vector3(6, 0, 3), scale: 1, rotation: 0.12 },
      { position: new Vector3(9, 0, -8), scale: 0.86, rotation: -0.1 },
      { position: new Vector3(0, 0, -11), scale: 0.78, rotation: 0.34 }
    ];

    if (palmTexture) {
      palmTexture.hasAlpha = true;

      const palmMaterial = new StandardMaterial("palm-tree-sprite-material", scene);
      palmMaterial.diffuseTexture = palmTexture;
      palmMaterial.opacityTexture = palmTexture;
      palmMaterial.useAlphaFromDiffuseTexture = true;
      palmMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
      palmMaterial.backFaceCulling = false;
      palmMaterial.specularColor = new Color3(0, 0, 0);

      positions.forEach(({ position, scale, rotation }, index) => {
        const palm = MeshBuilder.CreatePlane(`palm-tree-sprite-${index}`, { width: 7.5 * scale, height: 8.05 * scale }, scene);
        palm.position = new Vector3(position.x, 2.25 + index * 0.03, position.z);
        palm.billboardMode = Mesh.BILLBOARDMODE_ALL;
        palm.rotation.z = rotation;
        palm.material = palmMaterial;
      });
      return;
    }

    const trunkMaterial = new StandardMaterial("palm-trunk-material", scene);
    trunkMaterial.diffuseColor = new Color3(0.46, 0.27, 0.12);
    trunkMaterial.specularColor = new Color3(0, 0, 0);

    const leafMaterial = new StandardMaterial("palm-leaf-material", scene);
    leafMaterial.diffuseColor = new Color3(0.08, 0.43, 0.19);
    leafMaterial.specularColor = new Color3(0, 0, 0);

    positions.forEach(({ position }, index) => {
      const trunk = MeshBuilder.CreateCylinder(`palm-trunk-${index}`, { diameter: 0.9, height: 3.2, tessellation: 8 }, scene);
      trunk.position = new Vector3(position.x, 1.7, position.z);
      trunk.material = trunkMaterial;

      const leaves = MeshBuilder.CreateSphere(`palm-leaves-${index}`, { diameterX: 4.7, diameterY: 1.2, diameterZ: 4.7, segments: 10 }, scene);
      leaves.position = new Vector3(position.x, 3.45, position.z);
      leaves.material = leafMaterial;
    });
  }
}
