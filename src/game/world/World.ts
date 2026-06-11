import { Material } from "@babylonjs/core/Materials/material";
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { FishingZone } from "../data/fishingZones";
import { randomRange } from "../utils/random";
import { Island } from "./Island";
import { Water } from "./Water";
import { getZoneAt } from "./Zones";
import { isInsideAnyObstacle, resolveCircleCollisions, type CircleObstacle } from "./Collision";

interface TimedMesh {
  mesh: Mesh;
  age: number;
  lifetime: number;
}

interface FishShadow {
  mesh: Mesh;
  speed: number;
  targetSpeed: number;
  acceleration: number;
  heading: number;
  turnRate: number;
  targetTurnRate: number;
  turnTimer: number;
  speedTimer: number;
}

interface ObstacleVisual {
  x: number;
  z: number;
  radius: number;
  coral: boolean;
}

let obstacleBlendShadersRegistered = false;

const SHARK_MIN_RADIUS = GAME_CONFIG.world.shallowRadius + 2;
const SHARK_MAX_RADIUS = GAME_CONFIG.world.deepRadius - 10;
const SHARK_BOUNDARY_TURN_MARGIN = 10;
const SHARK_MAX_TURN_RATE = 0.7;
const SHARK_TURN_ACCELERATION = 1.1;
const SHARK_CRAWL_SPEED = 0.35;
const SHARK_MAX_SPEED = 3.4;
const SHARK_MAX_SCALE = 1.35 * 1.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(target, current + maxDelta);
  }

  return Math.max(target, current - maxDelta);
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function randomSharkSpeed(): number {
  return Math.random() < 0.22 ? randomRange(SHARK_CRAWL_SPEED, 0.75) : randomRange(1.45, SHARK_MAX_SPEED);
}

function registerObstacleBlendShaders(): void {
  if (obstacleBlendShadersRegistered) {
    return;
  }

  Effect.ShadersStore["castawayObstacleBlendVertexShader"] = `
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

  Effect.ShadersStore["castawayObstacleBlendFragmentShader"] = `
    precision highp float;

    varying vec2 vUV;
    varying vec3 vWorldPosition;

    uniform sampler2D obstacleTexture;
    uniform vec2 center;
    uniform vec2 uvOffset;
    uniform float radius;
    uniform float textureScale;
    uniform float opacity;
    uniform float fadeStart;

    void main(void) {
      vec2 local = vWorldPosition.xz - center;
      float angle = atan(local.y, local.x);
      float wobble = sin(angle * 3.0 + 0.6) * 0.08 + sin(angle * 7.0 - 1.2) * 0.045 + sin(angle * 11.0 + 0.4) * 0.025;
      float shapeDistance = length(local) / (radius * (1.0 + wobble));
      float alpha = opacity * (1.0 - smoothstep(fadeStart, 1.0, shapeDistance));

      if (alpha <= 0.01) {
        discard;
      }

      vec2 textureUV = local * textureScale + uvOffset;
      vec4 color = texture2D(obstacleTexture, textureUV);
      gl_FragColor = vec4(color.rgb, alpha);
    }
  `;

  obstacleBlendShadersRegistered = true;
}

export interface WorldTextures {
  palm?: Texture;
  sand?: Texture;
  grass?: Texture;
  coral?: Texture;
  rock?: Texture;
  fishShadow?: Texture;
  waterShallow?: Texture;
  waterMedium?: Texture;
  waterDeep?: Texture;
}

export class World {
  readonly water: Water;
  readonly island: Island;
  readonly obstacles: CircleObstacle[] = [];

  private readonly ripples: TimedMesh[] = [];
  private readonly fishShadows: FishShadow[] = [];

  constructor(private readonly scene: Scene, textures: WorldTextures = {}) {
    this.water = new Water(scene, {
      shallow: textures.waterShallow,
      medium: textures.waterMedium,
      deep: textures.waterDeep
    });
    this.island = new Island(scene, {
      palm: textures.palm,
      sand: textures.sand,
      grass: textures.grass
    });
    this.obstacles.push(...this.island.obstacles, ...this.createRocksAndCoral(scene, textures));
    this.createFishShadows(scene, textures.fishShadow);
  }

  update(deltaSeconds: number): void {
    this.water.update(deltaSeconds);
    this.updateRipples(deltaSeconds);
    this.updateFishShadows(deltaSeconds);
  }

  getZoneAt(position: Vector3): FishingZone | null {
    return getZoneAt(position);
  }

  isWaterPosition(position: Vector3): boolean {
    return this.getZoneAt(position) !== null && !isInsideAnyObstacle(position, this.obstacles);
  }

  movementMultiplier(position: Vector3): number {
    return this.getZoneAt(position)?.speedMultiplier ?? 0.58;
  }

  resolveRaftPosition(position: Vector3, radius: number): Vector3 {
    return resolveCircleCollisions(position, radius, this.obstacles);
  }

  createRipple(position: Vector3, color = new Color3(0.78, 0.97, 1)): void {
    const ripple = MeshBuilder.CreateTorus("water-ripple", { diameter: 2.1, thickness: 0.055, tessellation: 64 }, this.scene);
    ripple.position = new Vector3(position.x, 0.08, position.z);
    const material = new StandardMaterial("water-ripple-material", this.scene);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.35);
    material.specularColor = new Color3(0, 0, 0);
    material.alpha = 0.65;
    ripple.material = material;
    this.ripples.push({ mesh: ripple, age: 0, lifetime: 0.8 });
  }

  private createRocksAndCoral(scene: Scene, textures: WorldTextures): CircleObstacle[] {
    const rockMaterial = this.createObstacleMaterial(scene, "rock-material", textures.rock, new Color3(0.38, 0.39, 0.36), undefined, 0.42);
    const coralMaterial = this.createObstacleMaterial(scene, "coral-material", textures.coral, new Color3(0.95, 0.38, 0.35), new Color3(0.18, 0.04, 0.04), 0.36);

    const obstacleData: ObstacleVisual[] = [
      { x: -35, z: 18, radius: 3.3, coral: true },
      { x: 36, z: -28, radius: 3.8, coral: true },
      { x: 18, z: 48, radius: 4.5, coral: true },
      { x: -58, z: -12, radius: 4.2, coral: false },
      { x: 72, z: 22, radius: 5, coral: false }
    ];

    return obstacleData.map((obstacle, index) => {
      this.createObstacleBlend(scene, obstacle, index, textures);
      const texture = obstacle.coral ? textures.coral : textures.rock;

      if (texture) {
        this.createObstacleCore(scene, obstacle, index, texture);
      } else {
        const mesh = MeshBuilder.CreateCylinder(`obstacle-${index}`, { diameter: obstacle.radius * 1.48, height: 0.55, tessellation: 28 }, scene);
        mesh.position = new Vector3(obstacle.x, 0.12, obstacle.z);
        mesh.rotation.y = index * 0.73;
        mesh.material = obstacle.coral ? coralMaterial : rockMaterial;
      }

      return { center: new Vector3(obstacle.x, 0, obstacle.z), radius: obstacle.radius + 0.5 };
    });
  }

  private createObstacleMaterial(
    scene: Scene,
    name: string,
    texture: Texture | undefined,
    fallbackColor: Color3,
    emissiveColor = new Color3(0, 0, 0),
    textureScale = 0.42
  ): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = fallbackColor;
    material.emissiveColor = emissiveColor;
    material.specularColor = new Color3(0, 0, 0);

    if (texture) {
      texture.wrapU = Texture.WRAP_ADDRESSMODE;
      texture.wrapV = Texture.WRAP_ADDRESSMODE;
      texture.uScale = textureScale;
      texture.vScale = textureScale;
      texture.anisotropicFilteringLevel = 4;
      material.diffuseTexture = texture;
    }

    return material;
  }

  private createObstacleBlend(scene: Scene, obstacle: ObstacleVisual, index: number, textures: WorldTextures): void {
    const texture = obstacle.coral ? textures.coral : textures.rock;
    if (!texture) {
      return;
    }

    const blendRadius = obstacle.radius * (obstacle.coral ? 1.9 : 1.7);
    this.createObstacleTexturePatch(scene, `obstacle-blend-${index}`, `obstacle-blend-material-${index}`, obstacle, index, texture, {
      radius: blendRadius,
      y: 0.035 + index * 0.0005,
      textureScale: obstacle.coral ? 0.045 : 0.04,
      opacity: obstacle.coral ? 0.66 : 0.5,
      fadeStart: 0.52
    });
  }

  private createObstacleCore(scene: Scene, obstacle: ObstacleVisual, index: number, texture: Texture): void {
    const coreRadius = obstacle.radius * (obstacle.coral ? 1.03 : 0.96);
    this.createObstacleTexturePatch(scene, `obstacle-core-${index}`, `obstacle-core-material-${index}`, obstacle, index, texture, {
      radius: coreRadius,
      y: 0.082 + index * 0.0005,
      textureScale: obstacle.coral ? 0.07 : 0.058,
      opacity: obstacle.coral ? 0.92 : 0.82,
      fadeStart: obstacle.coral ? 0.56 : 0.5
    });
  }

  private createObstacleTexturePatch(
    scene: Scene,
    meshName: string,
    materialName: string,
    obstacle: ObstacleVisual,
    index: number,
    texture: Texture,
    options: { radius: number; y: number; textureScale: number; opacity: number; fadeStart: number }
  ): void {
    registerObstacleBlendShaders();
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;

    const patch = MeshBuilder.CreateGround(meshName, { width: options.radius * 2, height: options.radius * 2, subdivisions: 24 }, scene);
    patch.position = new Vector3(obstacle.x, options.y, obstacle.z);
    patch.rotation.y = index * 0.73;

    const material = new ShaderMaterial(
      materialName,
      scene,
      { vertex: "castawayObstacleBlend", fragment: "castawayObstacleBlend" },
      {
        attributes: ["position", "uv"],
        uniforms: ["world", "worldViewProjection", "center", "uvOffset", "radius", "textureScale", "opacity", "fadeStart"],
        samplers: ["obstacleTexture"]
      }
    );
    material.setTexture("obstacleTexture", texture);
    material.setVector2("center", new Vector2(obstacle.x, obstacle.z));
    material.setVector2("uvOffset", new Vector2(0.18 + index * 0.11, -0.07 + index * 0.09));
    material.setFloat("radius", options.radius);
    material.setFloat("textureScale", options.textureScale);
    material.setFloat("opacity", options.opacity);
    material.setFloat("fadeStart", options.fadeStart);
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.backFaceCulling = false;
    patch.material = material;
  }

  private createFishShadows(scene: Scene, texture?: Texture): void {
    const material = new StandardMaterial("fish-shadow-material", scene);
    material.diffuseColor = new Color3(0.02, 0.08, 0.12);
    material.emissiveColor = new Color3(0, 0.03, 0.05);
    material.specularColor = new Color3(0, 0, 0);
    material.alpha = texture ? 0.22 : 0.2;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;

    if (texture) {
      texture.hasAlpha = true;
      material.diffuseTexture = texture;
      material.opacityTexture = texture;
      material.useAlphaFromDiffuseTexture = true;
      material.backFaceCulling = false;
    }

    for (let i = 0; i < 18; i += 1) {
      const radius = randomRange(SHARK_MIN_RADIUS, SHARK_MAX_RADIUS);
      const angle = randomRange(0, Math.PI * 2);
      const center = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const sharkLength = 4.3;
      const sharkWidth = sharkLength * (218 / 512);
      const mesh = texture
        ? MeshBuilder.CreateGround(`fish-shadow-${i}`, { width: sharkWidth, height: sharkLength, subdivisions: 1 }, scene)
        : MeshBuilder.CreateSphere(
            `fish-shadow-${i}`,
            { diameterX: randomRange(1.8, 4.2), diameterY: 0.08, diameterZ: randomRange(0.55, 1.1), segments: 10 },
            scene
          );
      const scale = randomRange(0.65, SHARK_MAX_SCALE);
      mesh.scaling = new Vector3(scale, 1, scale);
      mesh.position = center.clone();
      mesh.position.y = 0.03;
      mesh.material = material;
      const heading = randomRange(0, Math.PI * 2);
      const speed = randomSharkSpeed();
      mesh.rotation.y = heading;
      this.fishShadows.push({
        mesh,
        speed,
        targetSpeed: speed,
        acceleration: randomRange(0.55, 1.15),
        heading,
        turnRate: 0,
        targetTurnRate: randomRange(-SHARK_MAX_TURN_RATE, SHARK_MAX_TURN_RATE),
        turnTimer: randomRange(0.8, 2.4),
        speedTimer: randomRange(1.4, 4.8)
      });
    }
  }

  private updateRipples(deltaSeconds: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const ripple = this.ripples[i];
      ripple.age += deltaSeconds;
      const progress = ripple.age / ripple.lifetime;
      ripple.mesh.scaling = new Vector3(1 + progress * 2.4, 1, 1 + progress * 2.4);
      const material = ripple.mesh.material as StandardMaterial | null;
      if (material) {
        material.alpha = Math.max(0, 0.65 * (1 - progress));
      }

      if (progress >= 1) {
        ripple.mesh.dispose(false, true);
        this.ripples.splice(i, 1);
      }
    }
  }

  private updateFishShadows(deltaSeconds: number): void {
    for (const shadow of this.fishShadows) {
      shadow.turnTimer -= deltaSeconds;
      if (shadow.turnTimer <= 0) {
        shadow.targetTurnRate = randomRange(-SHARK_MAX_TURN_RATE, SHARK_MAX_TURN_RATE);
        shadow.turnTimer = randomRange(0.8, 2.6);
      }

      shadow.speedTimer -= deltaSeconds;
      if (shadow.speedTimer <= 0) {
        shadow.targetSpeed = randomSharkSpeed();
        shadow.speedTimer = randomRange(1.4, 4.8);
      }

      const distanceFromCenter = Math.hypot(shadow.mesh.position.x, shadow.mesh.position.z);
      if (distanceFromCenter < SHARK_MIN_RADIUS + SHARK_BOUNDARY_TURN_MARGIN || distanceFromCenter > SHARK_MAX_RADIUS - SHARK_BOUNDARY_TURN_MARGIN) {
        const targetHeading = distanceFromCenter < SHARK_MIN_RADIUS + SHARK_BOUNDARY_TURN_MARGIN
          ? Math.atan2(shadow.mesh.position.x, shadow.mesh.position.z)
          : Math.atan2(-shadow.mesh.position.x, -shadow.mesh.position.z);
        const headingDelta = normalizeAngle(targetHeading - shadow.heading);
        shadow.targetTurnRate = clamp(headingDelta * 1.2, -SHARK_MAX_TURN_RATE, SHARK_MAX_TURN_RATE);

        if (distanceFromCenter < SHARK_MIN_RADIUS + SHARK_BOUNDARY_TURN_MARGIN) {
          shadow.targetSpeed = Math.min(shadow.targetSpeed, 1.1);
        }
      }

      shadow.turnRate = approach(shadow.turnRate, shadow.targetTurnRate, SHARK_TURN_ACCELERATION * deltaSeconds);
      shadow.speed = approach(shadow.speed, shadow.targetSpeed, shadow.acceleration * deltaSeconds);
      shadow.heading = normalizeAngle(shadow.heading + shadow.turnRate * deltaSeconds);
      shadow.mesh.rotation.y = shadow.heading;
      shadow.mesh.position.x += Math.sin(shadow.heading) * shadow.speed * deltaSeconds;
      shadow.mesh.position.z += Math.cos(shadow.heading) * shadow.speed * deltaSeconds;

      const nextDistanceFromCenter = Math.hypot(shadow.mesh.position.x, shadow.mesh.position.z);
      if (nextDistanceFromCenter < SHARK_MIN_RADIUS || nextDistanceFromCenter > SHARK_MAX_RADIUS) {
        const clampedDistance = clamp(nextDistanceFromCenter, SHARK_MIN_RADIUS, SHARK_MAX_RADIUS);
        const correctionScale = clampedDistance / nextDistanceFromCenter;
        shadow.mesh.position.x *= correctionScale;
        shadow.mesh.position.z *= correctionScale;
      }
    }
  }
}
