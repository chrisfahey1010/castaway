import type { Mesh } from "@babylonjs/core/Meshes/mesh";

export function preventSpriteFrustumCulling(mesh: Mesh): void {
  mesh.alwaysSelectAsActiveMesh = true;
}
