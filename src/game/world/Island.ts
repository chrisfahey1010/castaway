import { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { CircleObstacle } from "./Collision";

interface IslandTextures {
  palm?: Texture;
  sand?: Texture;
  grass?: Texture;
}

let islandShadersRegistered = false;

function registerIslandShaders(): void {
  if (islandShadersRegistered) {
    return;
  }

  Effect.ShadersStore["castawayIslandVertexShader"] = `
    precision highp float;

    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec2 vUV;
    varying vec3 vWorldPosition;

    void main(void) {
      vec4 worldPosition = world * vec4(position, 1.0);
      vUV = uv;
      vWorldPosition = worldPosition.xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  Effect.ShadersStore["castawayIslandFragmentShader"] = `
    precision highp float;

    varying vec2 vUV;
    varying vec3 vWorldPosition;

    uniform sampler2D sandTexture;
    uniform sampler2D grassTexture;
    uniform float sandRadiusX;
    uniform float sandRadiusZ;
    uniform float grassRadiusX;
    uniform float grassRadiusZ;
    uniform vec2 grassCenter;
    uniform float textureScale;

    float islandDistance(vec2 point, float radiusX, float radiusZ, float phase) {
      float angle = atan(point.y, point.x);
      float wobble = sin(angle * 3.0 + phase) * 0.045 + sin(angle * 7.0 - 0.6) * 0.032 + sin(angle * 11.0 + 1.1) * 0.018;
      return length(vec2(point.x / (radiusX * (1.0 + wobble)), point.y / (radiusZ * (1.0 - wobble * 0.35))));
    }

    void main(void) {
      vec2 worldPoint = vWorldPosition.xz;
      float sandDistance = islandDistance(worldPoint, sandRadiusX, sandRadiusZ, 0.2);
      float grassDistance = islandDistance(worldPoint - grassCenter, grassRadiusX, grassRadiusZ, 1.4);
      float islandAlpha = 1.0 - smoothstep(0.985, 1.045, sandDistance);

      if (islandAlpha <= 0.01) {
        discard;
      }

      vec2 sandUV = worldPoint * textureScale;
      vec2 grassUV = (worldPoint - grassCenter) * textureScale * 1.08 + vec2(0.19, -0.11);
      vec4 sand = texture2D(sandTexture, sandUV);
      vec4 grass = texture2D(grassTexture, grassUV);
      float grassBlend = 1.0 - smoothstep(0.86, 1.09, grassDistance);
      vec3 color = mix(sand.rgb, grass.rgb, grassBlend);

      gl_FragColor = vec4(color, islandAlpha);
    }
  `;

  islandShadersRegistered = true;
}

function prepareTiledTexture(texture: Texture): void {
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
}

export class Island {
  readonly obstacles: CircleObstacle[];

  constructor(scene: Scene, textures: IslandTextures = {}) {
    const terrain = this.createTexturedTerrain(scene, textures);
    if (!terrain) {
      this.createFallbackTerrain(scene);
    }

    this.createPalms(scene, textures.palm);
    this.obstacles = [{ center: new Vector3(0, 0, 0), radius: GAME_CONFIG.world.islandRadius * 0.94 }];
  }

  private createTexturedTerrain(scene: Scene, textures: IslandTextures): Mesh | null {
    if (!textures.sand || !textures.grass) {
      return null;
    }

    registerIslandShaders();
    prepareTiledTexture(textures.sand);
    prepareTiledTexture(textures.grass);

    const terrain = MeshBuilder.CreateGround("island-terrain", { width: GAME_CONFIG.world.islandRadius * 2.75, height: GAME_CONFIG.world.islandRadius * 2.35, subdivisions: 64 }, scene);
    terrain.position.y = 0.04;

    const material = new ShaderMaterial(
      "island-textured-material",
      scene,
      { vertex: "castawayIsland", fragment: "castawayIsland" },
      {
        attributes: ["position", "uv"],
        uniforms: [
          "world",
          "worldViewProjection",
          "sandRadiusX",
          "sandRadiusZ",
          "grassRadiusX",
          "grassRadiusZ",
          "grassCenter",
          "textureScale"
        ],
        samplers: ["sandTexture", "grassTexture"]
      }
    );
    material.setTexture("sandTexture", textures.sand);
    material.setTexture("grassTexture", textures.grass);
    material.setFloat("sandRadiusX", GAME_CONFIG.world.islandRadius * 1.16);
    material.setFloat("sandRadiusZ", GAME_CONFIG.world.islandRadius * 0.9);
    material.setFloat("grassRadiusX", GAME_CONFIG.world.islandRadius * 0.63);
    material.setFloat("grassRadiusZ", GAME_CONFIG.world.islandRadius * 0.45);
    material.setVector2("grassCenter", { x: -1, y: -1.5 });
    material.setFloat("textureScale", 0.11);
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.backFaceCulling = false;
    terrain.material = material;
    return terrain;
  }

  private createFallbackTerrain(scene: Scene): void {
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
