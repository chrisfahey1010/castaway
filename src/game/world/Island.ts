import { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import { preventSpriteFrustumCulling } from "../rendering/sprites";
import type { CircleObstacle } from "./Collision";

interface IslandTextures {
  palm?: Texture;
  planeCrash?: Texture;
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
      float wobble = sin(angle * 3.0 + phase) * 0.065 + sin(angle * 7.0 - 0.6) * 0.038 + sin(angle * 11.0 + 1.1) * 0.021;
      float southernSpit = smoothstep(0.35, 1.0, point.y / radiusZ) * (1.0 - smoothstep(0.05, 0.9, abs(point.x) / radiusX)) * 0.11;
      float westernCove = smoothstep(0.25, 1.0, -point.x / radiusX) * (1.0 - smoothstep(0.05, 0.75, abs(point.y + radiusZ * 0.12) / radiusZ)) * 0.08;
      return length(vec2(point.x / (radiusX * (1.0 + wobble + westernCove)), point.y / (radiusZ * (1.0 - wobble * 0.35 + southernSpit))));
    }

    float groveMask(vec2 worldPoint, vec2 center, float radiusX, float radiusZ, float phase) {
      float distanceToGrove = islandDistance(worldPoint - center, radiusX, radiusZ, phase);
      return 1.0 - smoothstep(0.84, 1.08, distanceToGrove);
    }

    void main(void) {
      vec2 worldPoint = vWorldPosition.xz;
      float sandDistance = islandDistance(worldPoint, sandRadiusX, sandRadiusZ, 0.2);
      float islandAlpha = 1.0 - smoothstep(0.985, 1.045, sandDistance);

      if (islandAlpha <= 0.01) {
        discard;
      }

      vec2 sandUV = worldPoint * textureScale;
      vec2 grassUV = vec2(worldPoint.x - grassCenter.x, -(worldPoint.y - grassCenter.y)) * textureScale * 1.08 + vec2(0.19, -0.11);
      vec4 sand = texture2D(sandTexture, sandUV);
      vec4 grass = texture2D(grassTexture, grassUV);
      float northGrove = groveMask(worldPoint, grassCenter, grassRadiusX, grassRadiusZ, 1.4);
      float eastPalms = groveMask(worldPoint, vec2(19.0, -3.0), 17.0, 21.0, -0.4) * 0.72;
      float westScrub = groveMask(worldPoint, vec2(-24.0, 6.0), 13.0, 16.0, 2.2) * 0.58;
      float northernThicket = groveMask(worldPoint, vec2(-9.0, -25.0), 24.0, 15.0, 0.7) * 0.86;
      float shoreGuard = 1.0 - smoothstep(0.74, 0.95, sandDistance);
      float grassBlend = max(max(northGrove, eastPalms), max(westScrub, northernThicket)) * shoreGuard;
      float dryNoise = sin(worldPoint.x * 0.31 + worldPoint.y * 0.17) * 0.5 + sin(worldPoint.x * -0.13 + worldPoint.y * 0.29) * 0.5;
      float duneLines = smoothstep(0.62, 0.98, sin(worldPoint.x * 0.19 + worldPoint.y * 0.08 + dryNoise * 0.55) * 0.5 + 0.5);
      float shoreline = smoothstep(0.86, 1.02, sandDistance);
      vec3 beachColor = sand.rgb * (1.02 + dryNoise * 0.035);
      beachColor = mix(beachColor, vec3(0.58, 0.48, 0.32), shoreline * 0.22);
      beachColor = mix(beachColor, sand.rgb * 1.08, duneLines * (1.0 - grassBlend) * 0.11);
      vec3 grassColor = grass.rgb * (0.9 + dryNoise * 0.05);
      grassColor = mix(grassColor, grass.rgb * vec3(0.68, 0.84, 0.58), northernThicket * 0.2);
      vec3 color = mix(beachColor, grassColor, grassBlend);

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

    this.createPlaneCrash(scene, textures.planeCrash);
    this.createPalms(scene, textures.palm);
    this.obstacles = [{ center: new Vector3(0, 0, 0), radius: GAME_CONFIG.world.islandRadius * 0.94 }];
  }

  private createPlaneCrash(scene: Scene, planeCrashTexture?: Texture): void {
    if (!planeCrashTexture) {
      return;
    }

    planeCrashTexture.hasAlpha = true;

    const material = new StandardMaterial("plane-crash-sprite-material", scene);
    material.diffuseTexture = planeCrashTexture;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.08;
    material.disableLighting = true;
    material.emissiveTexture = planeCrashTexture;
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.White();
    material.backFaceCulling = false;
    material.specularColor = new Color3(0, 0, 0);

    const planeCrash = MeshBuilder.CreatePlane("plane-crash-sprite", { width: 25.9, height: 20 }, scene);
    planeCrash.position = new Vector3(0, 0.2, 28);
    planeCrash.rotation.x = -Math.PI / 2;
    planeCrash.rotation.z = -0.08;
    planeCrash.material = material;
    preventSpriteFrustumCulling(planeCrash);
  }

  private createTexturedTerrain(scene: Scene, textures: IslandTextures): Mesh | null {
    if (!textures.sand || !textures.grass) {
      return null;
    }

    registerIslandShaders();
    prepareTiledTexture(textures.sand);
    prepareTiledTexture(textures.grass);

    const terrain = MeshBuilder.CreateGround("island-terrain", { width: GAME_CONFIG.world.islandRadius * 2.75, height: GAME_CONFIG.world.islandRadius * 2.35, subdivisions: 96 }, scene);
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
    material.setFloat("sandRadiusX", GAME_CONFIG.world.islandRadius * 1.14);
    material.setFloat("sandRadiusZ", GAME_CONFIG.world.islandRadius * 0.92);
    material.setFloat("grassRadiusX", GAME_CONFIG.world.islandRadius * 0.72);
    material.setFloat("grassRadiusZ", GAME_CONFIG.world.islandRadius * 0.7);
    material.setVector2("grassCenter", { x: -2, y: -7 });
    material.setFloat("textureScale", 0.075);
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

    const grass = MeshBuilder.CreateCylinder("island-palms", { diameter: GAME_CONFIG.world.islandRadius * 1.18, height: 0.26, tessellation: 48 }, scene);
    grass.position = new Vector3(-2, 0.18, -7);
    grass.scaling.x = 1.08;
    grass.scaling.z = 0.78;
    grass.material = grassMaterial;
  }

  private createPalms(scene: Scene, palmTexture?: Texture): void {
    const positions = [
      { position: new Vector3(-24, 0, -18), scale: 1.05, rotation: -0.25 },
      { position: new Vector3(-12, 0, 9), scale: 0.92, rotation: 0.2 },
      { position: new Vector3(13, 0, 8), scale: 1, rotation: 0.12 },
      { position: new Vector3(23, 0, -14), scale: 0.86, rotation: -0.1 },
      { position: new Vector3(1, 0, -28), scale: 0.78, rotation: 0.34 },
      { position: new Vector3(-17, 0, 22), scale: 0.84, rotation: -0.5 },
      { position: new Vector3(10, 0, 24), scale: 0.76, rotation: 0.42 },
      { position: new Vector3(30, 0, 3), scale: 0.7, rotation: -0.38 },
      { position: new Vector3(-34, 0, 5), scale: 0.68, rotation: 0.18 },
      { position: new Vector3(15, 0, -31), scale: 0.82, rotation: -0.18 }
    ];

    if (palmTexture) {
      palmTexture.hasAlpha = true;

      const palmMaterial = new StandardMaterial("palm-tree-sprite-material", scene);
      palmMaterial.diffuseTexture = palmTexture;
      palmMaterial.useAlphaFromDiffuseTexture = true;
      palmMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
      palmMaterial.alphaCutOff = 0.08;
      palmMaterial.disableLighting = true;
      palmMaterial.emissiveTexture = palmTexture;
      palmMaterial.diffuseColor = Color3.White();
      palmMaterial.emissiveColor = Color3.White();
      palmMaterial.backFaceCulling = false;
      palmMaterial.specularColor = new Color3(0, 0, 0);

      positions.forEach(({ position, scale, rotation }, index) => {
        const palm = MeshBuilder.CreatePlane(`palm-tree-sprite-${index}`, { width: 15 * scale, height: 16.1 * scale }, scene);
        palm.position = new Vector3(position.x, 2.25 + index * 0.03, position.z);
        palm.rotation.x = -Math.PI / 2;
        palm.rotation.z = rotation;
        palm.material = palmMaterial;
        preventSpriteFrustumCulling(palm);
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
      const trunk = MeshBuilder.CreateCylinder(`palm-trunk-${index}`, { diameter: 1.8, height: 6.4, tessellation: 8 }, scene);
      trunk.position = new Vector3(position.x, 3.4, position.z);
      trunk.material = trunkMaterial;

      const leaves = MeshBuilder.CreateSphere(`palm-leaves-${index}`, { diameterX: 9.4, diameterY: 2.4, diameterZ: 9.4, segments: 10 }, scene);
      leaves.position = new Vector3(position.x, 6.9, position.z);
      leaves.material = leafMaterial;
    });
  }
}
