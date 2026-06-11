import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import { fishingZones, type FishingZone } from "../data/fishingZones";
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
  center: Vector3;
  speed: number;
  phase: number;
  radius: number;
}

export class World {
  readonly water: Water;
  readonly island: Island;
  readonly obstacles: CircleObstacle[] = [];

  private readonly ripples: TimedMesh[] = [];
  private readonly fishShadows: FishShadow[] = [];

  constructor(private readonly scene: Scene, palmTexture?: Texture) {
    this.water = new Water(scene);
    this.createZoneOverlays(scene);
    this.island = new Island(scene, palmTexture);
    this.obstacles.push(...this.island.obstacles, ...this.createRocksAndCoral(scene));
    this.createFishShadows(scene);
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

  private createZoneOverlays(scene: Scene): void {
    fishingZones
      .slice()
      .reverse()
      .forEach((zone, index) => {
        const disc = MeshBuilder.CreateCylinder(`zone-${zone.id}`, { diameter: zone.radius * 2, height: 0.015, tessellation: 96 }, scene);
        disc.position.y = -0.045 + index * 0.01;
        const material = new StandardMaterial(`zone-material-${zone.id}`, scene);
        material.diffuseColor = Color3.FromHexString(zone.colorTint);
        material.emissiveColor = Color3.FromHexString(zone.colorTint).scale(0.22);
        material.specularColor = new Color3(0, 0, 0);
        material.alpha = zone.type === "lagoon" ? 0.32 : zone.type === "reef" ? 0.24 : 0.18;
        disc.material = material;
      });
  }

  private createRocksAndCoral(scene: Scene): CircleObstacle[] {
    const rockMaterial = new StandardMaterial("rock-material", scene);
    rockMaterial.diffuseColor = new Color3(0.38, 0.39, 0.36);
    rockMaterial.specularColor = new Color3(0, 0, 0);

    const coralMaterial = new StandardMaterial("coral-material", scene);
    coralMaterial.diffuseColor = new Color3(0.95, 0.38, 0.35);
    coralMaterial.emissiveColor = new Color3(0.18, 0.04, 0.04);
    coralMaterial.specularColor = new Color3(0, 0, 0);

    const obstacleData = [
      { x: -35, z: 18, radius: 3.3, coral: true },
      { x: 36, z: -28, radius: 3.8, coral: true },
      { x: 18, z: 48, radius: 4.5, coral: true },
      { x: -58, z: -12, radius: 4.2, coral: false },
      { x: 72, z: 22, radius: 5, coral: false }
    ];

    return obstacleData.map((obstacle, index) => {
      const mesh = MeshBuilder.CreateCylinder(`obstacle-${index}`, { diameter: obstacle.radius * 2, height: 0.55, tessellation: 12 }, scene);
      mesh.position = new Vector3(obstacle.x, 0.12, obstacle.z);
      mesh.material = obstacle.coral ? coralMaterial : rockMaterial;
      return { center: new Vector3(obstacle.x, 0, obstacle.z), radius: obstacle.radius + 0.5 };
    });
  }

  private createFishShadows(scene: Scene): void {
    const material = new StandardMaterial("fish-shadow-material", scene);
    material.diffuseColor = new Color3(0.02, 0.08, 0.12);
    material.emissiveColor = new Color3(0, 0.03, 0.05);
    material.specularColor = new Color3(0, 0, 0);
    material.alpha = 0.28;

    for (let i = 0; i < 18; i += 1) {
      const radius = randomRange(GAME_CONFIG.world.shallowRadius + 4, GAME_CONFIG.world.deepRadius - 10);
      const angle = randomRange(0, Math.PI * 2);
      const center = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const mesh = MeshBuilder.CreateSphere(`fish-shadow-${i}`, { diameterX: randomRange(1.8, 4.2), diameterY: 0.08, diameterZ: randomRange(0.55, 1.1), segments: 10 }, scene);
      mesh.position = center.clone();
      mesh.position.y = 0.03;
      mesh.material = material;
      this.fishShadows.push({ mesh, center, speed: randomRange(0.25, 0.85), phase: randomRange(0, Math.PI * 2), radius: randomRange(3, 9) });
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
      shadow.phase += deltaSeconds * shadow.speed;
      shadow.mesh.position.x = shadow.center.x + Math.cos(shadow.phase) * shadow.radius;
      shadow.mesh.position.z = shadow.center.z + Math.sin(shadow.phase * 0.74) * shadow.radius * 0.55;
      shadow.mesh.rotation.y = Math.atan2(Math.cos(shadow.phase * 0.74), -Math.sin(shadow.phase));
    }
  }
}
