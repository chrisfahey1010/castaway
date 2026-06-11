import { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { GAME_CONFIG } from "../constants";
import type { InputManager } from "../input/InputManager";
import { preventSpriteFrustumCulling } from "../rendering/sprites";
import type { World } from "../world/World";

const FISHERMAN_SPRITE_WIDTH = 3.4;
const FISHERMAN_SPRITE_HEIGHT = 2.6;
const FISHERMAN_SPRITE_POSITION = new Vector3(0, 0.7, -0.55);
const FISHING_POLE_TIP_SPRITE_POSITION = new Vector3(FISHERMAN_SPRITE_WIDTH / 2, FISHERMAN_SPRITE_HEIGHT * (0.33 - 0.5), 0);

export class RaftController {
  readonly root: TransformNode;
  readonly collisionRadius = GAME_CONFIG.raft.collisionRadius;
  velocity = new Vector3(0, 0, 0);
  private bobTime = 0;
  private readonly fishingLineAnchor: TransformNode;

  constructor(scene: Scene, startPosition = new Vector3(0, 0, 34), raftTexture?: Texture, fishermanTexture?: Texture) {
    this.root = new TransformNode("raft-root", scene);
    this.root.position = startPosition.clone();
    this.root.rotation.y = Math.PI;
    this.fishingLineAnchor = new TransformNode("fishing-line-anchor", scene);
    this.fishingLineAnchor.parent = this.root;

    if (raftTexture) {
      this.createTexturedRaft(scene, raftTexture);
    } else {
      this.createFallbackRaft(scene);
    }

    this.createFisherman(scene, fishermanTexture);
  }

  getFishingLineAnchorPosition(): Vector3 {
    this.fishingLineAnchor.computeWorldMatrix(true);
    return this.fishingLineAnchor.getAbsolutePosition().clone();
  }

  private createFisherman(scene: Scene, fishermanTexture?: Texture): void {
    if (!fishermanTexture) {
      const castawayMaterial = new StandardMaterial("castaway-material", scene);
      castawayMaterial.diffuseColor = new Color3(0.96, 0.78, 0.52);
      const castaway = MeshBuilder.CreateSphere("castaway", { diameter: 1.1, segments: 12 }, scene);
      castaway.parent = this.root;
      castaway.position = new Vector3(0, 0.98, -0.55);
      castaway.material = castawayMaterial;
      this.fishingLineAnchor.parent = this.root;
      this.fishingLineAnchor.position = new Vector3(0, 1.15, 0);
      return;
    }

    fishermanTexture.hasAlpha = true;

    const fishermanMaterial = new StandardMaterial("fisherman-sprite-material", scene);
    fishermanMaterial.diffuseTexture = fishermanTexture;
    fishermanMaterial.useAlphaFromDiffuseTexture = true;
    fishermanMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
    fishermanMaterial.alphaCutOff = 0.08;
    fishermanMaterial.backFaceCulling = false;
    fishermanMaterial.specularColor = new Color3(0.08, 0.06, 0.04);

    const fisherman = MeshBuilder.CreatePlane("fisherman-sprite", { width: FISHERMAN_SPRITE_WIDTH, height: FISHERMAN_SPRITE_HEIGHT }, scene);
    fisherman.parent = this.root;
    fisherman.rotation.x = Math.PI / 2;
    fisherman.rotation.z = Math.PI;
    fisherman.position = FISHERMAN_SPRITE_POSITION.clone();
    fisherman.material = fishermanMaterial;
    preventSpriteFrustumCulling(fisherman);

    this.fishingLineAnchor.parent = fisherman;
    this.fishingLineAnchor.position = FISHING_POLE_TIP_SPRITE_POSITION.clone();
  }

  private createTexturedRaft(scene: Scene, raftTexture: Texture): void {
    raftTexture.hasAlpha = true;

    const raftMaterial = new StandardMaterial("raft-sprite-material", scene);
    raftMaterial.diffuseTexture = raftTexture;
    raftMaterial.useAlphaFromDiffuseTexture = true;
    raftMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
    raftMaterial.alphaCutOff = 0.08;
    raftMaterial.backFaceCulling = false;
    raftMaterial.specularColor = new Color3(0.08, 0.06, 0.04);

    const raft = MeshBuilder.CreatePlane("raft-sprite", { width: 5.3, height: 9.5 }, scene);
    raft.parent = this.root;
    raft.rotation.x = Math.PI / 2;
    raft.position.y = 0.38;
    raft.material = raftMaterial;
    preventSpriteFrustumCulling(raft);
  }

  private createFallbackRaft(scene: Scene): void {
    const raftMaterial = new StandardMaterial("raft-material", scene);
    raftMaterial.diffuseColor = new Color3(0.54, 0.35, 0.17);

    const trimMaterial = new StandardMaterial("raft-trim-material", scene);
    trimMaterial.diffuseColor = new Color3(0.88, 0.7, 0.4);

    const raft = MeshBuilder.CreateBox("raft-placeholder", { width: 4.6, height: 0.32, depth: 6.4 }, scene);
    raft.parent = this.root;
    raft.position.y = 0.22;
    raft.material = raftMaterial;

    for (let i = -1; i <= 1; i += 1) {
      const plank = MeshBuilder.CreateBox(`raft-plank-${i}`, { width: 1.2, height: 0.18, depth: 6.8 }, scene);
      plank.parent = this.root;
      plank.position = new Vector3(i * 1.45, 0.46, 0);
      plank.material = trimMaterial;
    }
  }

  update(input: InputManager, world: World, deltaSeconds: number): void {
    const controls = input.raftControls;
    const multiplier = world.movementMultiplier(this.root.position);

    if (controls.turn !== 0) {
      this.root.rotation.y += controls.turn * GAME_CONFIG.raft.turnSpeed * 0.72 * deltaSeconds;
    }

    if (controls.throttle !== 0) {
      const reverseMultiplier = controls.throttle < 0 ? 0.58 : 1;
      const forward = new Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
      this.velocity.addInPlace(forward.scale(controls.throttle * GAME_CONFIG.raft.acceleration * multiplier * reverseMultiplier * deltaSeconds));
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const maxSpeed = GAME_CONFIG.raft.maxSpeed * multiplier * (controls.throttle < 0 ? 0.58 : 1);
    if (speed > maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * maxSpeed;
      this.velocity.z = (this.velocity.z / speed) * maxSpeed;
    }

    const drag = Math.pow(GAME_CONFIG.raft.drag, deltaSeconds * 60);
    this.velocity.scaleInPlace(drag);

    const nextPosition = this.root.position.add(this.velocity.scale(deltaSeconds));
    const resolved = world.resolveRaftPosition(nextPosition, this.collisionRadius);
    if (Vector3.DistanceSquared(resolved, nextPosition) > 0.0001) {
      this.velocity.scaleInPlace(0.25);
    }

    this.root.position.x = resolved.x;
    this.root.position.z = resolved.z;

    this.bobTime += deltaSeconds * (1.2 + speed * 0.12);
    this.root.position.y = Math.sin(this.bobTime) * 0.12;
  }
}
