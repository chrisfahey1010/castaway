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

interface WaterTextures {
  shallow?: Texture;
  medium?: Texture;
  deep?: Texture;
}

let waterShadersRegistered = false;

function registerWaterShaders(): void {
  if (waterShadersRegistered) {
    return;
  }

  Effect.ShadersStore["castawayWaterVertexShader"] = `
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

  Effect.ShadersStore["castawayWaterFragmentShader"] = `
    precision highp float;

    varying vec2 vUV;
    varying vec3 vWorldPosition;

    uniform sampler2D shallowTexture;
    uniform sampler2D mediumTexture;
    uniform sampler2D deepTexture;
    uniform float shallowRadius;
    uniform float reefRadius;
    uniform float textureScale;
    uniform float time;

    void main(void) {
      vec2 worldUV = vWorldPosition.xz * textureScale;
      vec2 slowDrift = vec2(time * 0.0025, -time * 0.0015);
      vec4 shallow = texture2D(shallowTexture, worldUV + slowDrift);
      vec4 medium = texture2D(mediumTexture, worldUV * 0.88 - slowDrift * 0.7 + vec2(0.21, 0.13));
      vec4 deep = texture2D(deepTexture, worldUV * 0.74 + slowDrift * 0.45 + vec2(-0.17, 0.08));

      float distanceFromIsland = length(vWorldPosition.xz);
      float shallowToMedium = smoothstep(shallowRadius - 10.0, shallowRadius + 16.0, distanceFromIsland);
      float mediumToDeep = smoothstep(reefRadius - 12.0, reefRadius + 20.0, distanceFromIsland);
      vec3 lagoonColor = mix(shallow.rgb, medium.rgb, shallowToMedium);
      vec3 waterColor = mix(lagoonColor, deep.rgb, mediumToDeep);
      float surfacePulse = 0.975 + sin(time * 0.45) * 0.025;

      gl_FragColor = vec4(waterColor * surfacePulse, 1.0);
    }
  `;

  waterShadersRegistered = true;
}

function prepareTiledTexture(texture: Texture): void {
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
}

export class Water {
  readonly mesh: Mesh;
  private readonly shaderMaterial: ShaderMaterial | null;
  private readonly fallbackMaterial: StandardMaterial | null;
  private time = 0;

  constructor(scene: Scene, textures: WaterTextures = {}) {
    this.mesh = MeshBuilder.CreateGround(
      "open-water",
      { width: GAME_CONFIG.world.radius * 2.25, height: GAME_CONFIG.world.radius * 2.25, subdivisions: 48 },
      scene
    );
    this.mesh.position.y = -0.06;

    const texturedMaterial = this.createTexturedMaterial(scene, textures);
    this.shaderMaterial = texturedMaterial;
    this.fallbackMaterial = texturedMaterial ? null : this.createFallbackMaterial(scene);
    this.mesh.material = this.shaderMaterial ?? this.fallbackMaterial;

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
    this.shaderMaterial?.setFloat("time", this.time);

    if (this.fallbackMaterial) {
      const pulse = 0.5 + Math.sin(this.time * 0.55) * 0.5;
      this.fallbackMaterial.diffuseColor = new Color3(0.018, 0.31 + pulse * 0.045, 0.62 + pulse * 0.05);
    }

    this.mesh.position.y = -0.07 + Math.sin(this.time * 1.8) * 0.012;
  }

  private createTexturedMaterial(scene: Scene, textures: WaterTextures): ShaderMaterial | null {
    if (!textures.shallow || !textures.medium || !textures.deep) {
      return null;
    }

    registerWaterShaders();
    prepareTiledTexture(textures.shallow);
    prepareTiledTexture(textures.medium);
    prepareTiledTexture(textures.deep);

    const material = new ShaderMaterial(
      "water-textured-material",
      scene,
      { vertex: "castawayWater", fragment: "castawayWater" },
      {
        attributes: ["position", "uv"],
        uniforms: ["world", "worldViewProjection", "shallowRadius", "reefRadius", "textureScale", "time"],
        samplers: ["shallowTexture", "mediumTexture", "deepTexture"]
      }
    );
    material.setTexture("shallowTexture", textures.shallow);
    material.setTexture("mediumTexture", textures.medium);
    material.setTexture("deepTexture", textures.deep);
    material.setFloat("shallowRadius", GAME_CONFIG.world.shallowRadius);
    material.setFloat("reefRadius", GAME_CONFIG.world.reefRadius);
    material.setFloat("textureScale", 0.045);
    material.setFloat("time", 0);
    return material;
  }

  private createFallbackMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial("water-material", scene);
    material.diffuseColor = new Color3(0.02, 0.34, 0.67);
    material.emissiveColor = new Color3(0.01, 0.16, 0.22);
    material.specularColor = new Color3(0, 0, 0);
    material.alpha = 0.96;
    return material;
  }
}
