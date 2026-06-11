import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { GAME_CONFIG } from "./constants";

export interface SceneBundle {
  scene: Scene;
  camera: FreeCamera;
}

export function createScene(engine: Engine): SceneBundle {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.2, 0.3, 1);
  scene.ambientColor = new Color3(0.72, 0.86, 0.95);

  const camera = new FreeCamera("top-down-camera", new Vector3(0, GAME_CONFIG.camera.height, 32), scene);
  camera.setTarget(new Vector3(0, 0, 32));
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 300;

  const light = new HemisphericLight("sun-soft", new Vector3(0.4, 1, 0.25), scene);
  light.diffuse = new Color3(1, 0.95, 0.82);
  light.specular = new Color3(0, 0, 0);
  light.groundColor = new Color3(0.15, 0.36, 0.5);
  light.intensity = 1.25;

  return { scene, camera };
}
