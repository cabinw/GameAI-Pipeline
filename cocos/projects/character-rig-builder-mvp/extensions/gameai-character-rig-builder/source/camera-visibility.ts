export interface SceneCameraDescriptor {
  name: string;
  uuid: string;
  enabledInHierarchy: boolean;
  visibility: number;
}

export function cameraRendersLayer(
  camera: SceneCameraDescriptor,
  layer: number,
): boolean {
  return camera.enabledInHierarchy && (camera.visibility & layer) === layer;
}

export function compatibleCameras(
  cameras: readonly SceneCameraDescriptor[],
  layer: number,
): readonly SceneCameraDescriptor[] {
  return cameras.filter((camera) => cameraRendersLayer(camera, layer));
}
