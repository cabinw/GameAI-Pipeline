import {
  assetManager,
  Camera,
  director,
  Layers,
  Node,
  RenderRoot2D,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
  UIOpacity,
} from "cc";

import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
  type SceneRigDiagnostic,
} from "./diagnostics";
import {
  compatibleCameras,
  type SceneCameraDescriptor,
} from "./camera-visibility";
import {
  commitGeneratedRootReplacement,
  decideGeneratedRootReplacement,
} from "./replacement-boundary";
import type {
  CocosSceneRigPlan,
  SceneBuildFailure,
  SceneBuildResult,
  SceneBuildSuccess,
} from "./types";
import type { NormalizedRigAnimation } from "@gameai/rig-animation";

const EXTENSION_NAME = "gameai-character-rig-builder";

interface RigAnimationRuntimeComponent {
  configure(animation: NormalizedRigAnimation, autoplay: boolean): void;
}

function diagnosticFromError(
  error: unknown,
  correlationId: string,
): SceneRigDiagnostic {
  if (error instanceof SceneRigBuilderError) return error.diagnostic;
  return {
    code: SceneRigDiagnosticCode.SCENE_GENERATION_FAILED,
    message: error instanceof Error ? error.message : String(error),
    stage: "scene",
    correlationId,
  };
}

function loadSpriteFrame(uuid: string, correlationId: string): Promise<SpriteFrame> {
  return new Promise((resolve, reject) => {
    assetManager.loadAny({ uuid }, (error: Error | null | undefined, asset: unknown) => {
      if (
        (error !== null && error !== undefined) ||
        typeof asset !== "object" ||
        asset === null
      ) {
        reject(
          new SceneRigBuilderError({
            code: SceneRigDiagnosticCode.SPRITE_FRAME_LOAD_FAILED,
            message: `Failed to load SpriteFrame ${uuid}: ${error?.message ?? "Asset Manager returned no object"}.`,
            stage: "scene",
            correlationId,
            details: { uuid },
          }),
        );
        return;
      }
      // AssetDB proved this UUID belongs to a SpriteFrame subasset in Main.
      // Cross-bundle engine constructors are not identity-stable in editor
      // processes, so an instanceof check would reject valid loaded frames.
      resolve(asset as SpriteFrame);
    });
  });
}

function configureNode(node: Node): void {
  node.layer = Layers.Enum.UI_3D;
}

function metadataNode(name: string, parent: Node): Node {
  const node = new Node(name);
  configureNode(node);
  node.setParent(parent);
  return node;
}

function buildDetachedRoot(
  plan: CocosSceneRigPlan,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
): Node {
  const characterRoot = new Node(plan.characterRootName);
  configureNode(characterRoot);
  characterRoot.addComponent(RenderRoot2D);
  const rootTransform =
    characterRoot.getComponent(UITransform) ?? characterRoot.addComponent(UITransform);
  rootTransform.setAnchorPoint(0.5, 0.5);
  rootTransform.setContentSize(
    plan.sourceCanvas.width * plan.referenceScale,
    plan.sourceCanvas.height * plan.referenceScale,
  );
  const rigRoot = metadataNode(plan.rigRootName, characterRoot);
  const marker = metadataNode(plan.generatedMarkerName, characterRoot);
  metadataNode(`Character_${plan.characterId}`, marker);
  metadataNode(
    `Schemas_${plan.schemaVersions.characterRig}_${plan.schemaVersions.rigLayout}`,
    marker,
  );
  metadataNode(`Correlation_${plan.correlationId}`, marker);

  const joints = new Map<string, Node>();
  for (const part of plan.parts) {
    const joint = new Node(part.jointName);
    configureNode(joint);
    joint.setPosition(part.jointPosition.x, part.jointPosition.y, 0);
    joint.setRotationFromEuler(0, 0, part.jointRotationDegrees);
    joint.setScale(part.jointScale.x, part.jointScale.y, 1);
    joints.set(part.partId, joint);
  }

  for (const part of plan.parts) {
    const joint = joints.get(part.partId);
    const parent =
      part.parentId === null ? rigRoot : joints.get(part.parentId);
    if (joint === undefined || parent === undefined) {
      throw new Error(
        `Scene plan hierarchy is incomplete for ${part.partId} (parent ${part.parentId ?? "RigRoot"}).`,
      );
    }
    joint.setParent(parent);

    const visual = new Node(part.visualName);
    configureNode(visual);
    visual.setParent(joint);
    visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
    const transform = visual.addComponent(UITransform);
    transform.setAnchorPoint(part.visualAnchor.x, part.visualAnchor.y);
    transform.setContentSize(part.visualSize.width, part.visualSize.height);
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const frame = spriteFrames.get(part.spriteFrameUuid);
    if (frame === undefined) {
      throw new Error(`Preloaded SpriteFrame ${part.spriteFrameUuid} is missing.`);
    }
    sprite.spriteFrame = frame;
    const sorting = visual.addComponent(Sorting2D);
    sorting.sortingOrder = part.sortingOrder;
    const opacity = visual.addComponent(UIOpacity);
    opacity.opacity = Math.round(part.opacity * 255);
  }

  for (const socket of plan.sockets) {
    const parent = joints.get(socket.parentPartId);
    if (parent === undefined) throw new Error(`Socket parent ${socket.parentPartId} is missing.`);
    const node = metadataNode(`Socket_${socket.socketId}`, parent);
    node.setPosition(socket.position.x, socket.position.y, 0);
    node.setRotationFromEuler(0, 0, socket.rotationDegrees);
  }
  for (const hitArea of plan.hitAreas) {
    const parent = joints.get(hitArea.parentPartId);
    if (parent === undefined) throw new Error(`Hit-area parent ${hitArea.parentPartId} is missing.`);
    const node = metadataNode(`HitArea_${hitArea.hitAreaId}`, parent);
    const shape = hitArea.shape;
    const x = shape.type === "rect" ? shape.x + shape.width / 2 : shape.x;
    const y = shape.type === "rect" ? shape.y + shape.height / 2 : shape.y;
    node.setPosition(x, y, 0);
  }
  if (plan.animation != null) {
    const addByClassName = characterRoot.addComponent as unknown as (
      className: string,
    ) => unknown;
    const component = addByClassName.call(
      characterRoot,
      plan.animation.componentClassName,
    ) as RigAnimationRuntimeComponent | null;
    if (component === null || typeof component.configure !== "function") {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.ANIMATION_RUNTIME_COMPONENT_MISSING,
        message: `${plan.animation.componentClassName} is not registered in the Cocos project.`,
        stage: "scene",
        correlationId: plan.correlationId,
        details: {
          presetAssetUrl: plan.animation.presetAssetUrl,
          presetAssetUuid: plan.animation.presetAssetUuid,
        },
      });
    }
    component.configure(
      plan.animation.normalizedAnimation,
      plan.animation.autoplay,
    );
  }
  return characterRoot;
}

function walkNodes(root: Node): readonly Node[] {
  return [
    root,
    ...root.children.flatMap((child) => walkNodes(child)),
  ];
}

function isDescendantOf(node: Node, ancestor: Node): boolean {
  let current = node.parent;
  while (current !== null) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function sceneCameras(scene: Node): readonly SceneCameraDescriptor[] {
  const byNodeUuid = new Map(
    scene.getComponentsInChildren(Camera).map((camera) => [
      camera.node.uuid,
      {
        name: camera.node.name,
        uuid: camera.node.uuid,
        enabledInHierarchy: camera.enabledInHierarchy,
        visibility: camera.visibility,
      },
    ]),
  );
  return [...byNodeUuid.values()]
    .sort((left, right) => left.uuid.localeCompare(right.uuid));
}

interface RenderTreeVerification {
  spriteFramesVerified: number;
  nonZeroContentSizesVerified: number;
}

function verifyRenderTree(
  root: Node,
  plan: CocosSceneRigPlan,
  selectedLayer: number,
): RenderTreeVerification {
  if (root.getComponent(RenderRoot2D) === null) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.GENERATED_RENDER_ROOT_MISSING,
      message: `${plan.characterRootName} does not contain the required RenderRoot2D component.`,
      stage: "scene",
      correlationId: plan.correlationId,
    });
  }

  const nodes = walkNodes(root);
  const layerMismatch = nodes.find((node) => node.layer !== selectedLayer);
  if (layerMismatch !== undefined) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.GENERATED_LAYER_MISMATCH,
      message: `${layerMismatch.name} is not assigned to the generated character render layer.`,
      stage: "scene",
      correlationId: plan.correlationId,
      details: {
        nodeUuid: layerMismatch.uuid,
        expectedLayer: selectedLayer,
        actualLayer: layerMismatch.layer,
      },
    });
  }

  const nodesByName = new Map(nodes.map((node) => [node.name, node]));
  let spriteFramesVerified = 0;
  let nonZeroContentSizesVerified = 0;
  for (const part of plan.parts) {
    const visual = nodesByName.get(part.visualName);
    const sprite = visual?.getComponent(Sprite) ?? null;
    const transform = visual?.getComponent(UITransform) ?? null;
    if (
      visual === undefined ||
      !isDescendantOf(visual, root) ||
      sprite?.spriteFrame === null ||
      sprite === null
    ) {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.GENERATED_VISUAL_VERIFICATION_FAILED,
        message: `${part.visualName} is missing, outside RenderRoot2D, or has no SpriteFrame.`,
        stage: "scene",
        correlationId: plan.correlationId,
        partId: part.partId,
      });
    }
    spriteFramesVerified += 1;
    if (
      transform === null ||
      transform.contentSize.width <= 0 ||
      transform.contentSize.height <= 0
    ) {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.GENERATED_VISUAL_VERIFICATION_FAILED,
        message: `${part.visualName} has a zero or missing UITransform content size.`,
        stage: "scene",
        correlationId: plan.correlationId,
        partId: part.partId,
      });
    }
    nonZeroContentSizesVerified += 1;
  }

  if (plan.animation != null) {
    for (const track of plan.animation.normalizedAnimation.tracks) {
      const joint = nodesByName.get(`Joint_${track.jointId}`);
      if (joint === undefined || joint.name.startsWith("Visual_")) {
        throw new SceneRigBuilderError({
          code: SceneRigDiagnosticCode.ANIMATION_JOINT_TARGET_MISSING,
          message: `Validated animation target Joint_${track.jointId} is missing from the generated rig.`,
          stage: "scene",
          correlationId: plan.correlationId,
          details: { jointId: track.jointId, property: track.property },
        });
      }
    }
    const getByClassName = root.getComponent as unknown as (
      className: string,
    ) => unknown;
    const runtime = getByClassName.call(
      root,
      plan.animation.componentClassName,
    ) as RigAnimationRuntimeComponent | null;
    if (runtime === null) {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.ANIMATION_RUNTIME_COMPONENT_MISSING,
        message: `${plan.animation.componentClassName} was not attached to ${root.name}.`,
        stage: "scene",
        correlationId: plan.correlationId,
      });
    }
  }

  return { spriteFramesVerified, nonZeroContentSizesVerified };
}

function requireCompatibleCameras(
  cameras: readonly SceneCameraDescriptor[],
  selectedLayer: number,
  correlationId: string,
): readonly SceneCameraDescriptor[] {
  const matches = compatibleCameras(cameras, selectedLayer);
  if (matches.length === 0) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.NO_CAMERA_CAN_RENDER_GENERATED_LAYER,
      message:
        "No active scene camera can render the generated character's UI_3D layer.",
      stage: "scene",
      correlationId,
      details: {
        selectedLayer,
        cameras: cameras.map((camera) => ({
          name: camera.name,
          uuid: camera.uuid,
          enabledInHierarchy: camera.enabledInHierarchy,
          visibility: camera.visibility,
        })),
      },
    });
  }
  return matches;
}

function failure(
  correlationId: string,
  error: unknown,
): SceneBuildFailure {
  return {
    ok: false,
    stage: "scene",
    correlationId,
    diagnostic: diagnosticFromError(error, correlationId),
  };
}

export const methods = {
  async buildRig(plan: CocosSceneRigPlan): Promise<SceneBuildResult> {
    let replacementRoot: Node | null = null;
    let newRoot: Node | null = null;
    try {
      const scene = director.getScene();
      if (scene === null) {
        throw new SceneRigBuilderError({
          code: SceneRigDiagnosticCode.SCENE_NOT_AVAILABLE,
          message: "No editable Cocos scene is currently open.",
          stage: "scene",
          correlationId: plan.correlationId,
        });
      }
      if (plan.renderLayer !== "UI_3D") {
        throw new SceneRigBuilderError({
          code: SceneRigDiagnosticCode.GENERATED_LAYER_MISMATCH,
          message: `Unsupported scene-plan render layer ${String(plan.renderLayer)}.`,
          stage: "scene",
          correlationId: plan.correlationId,
        });
      }
      const selectedLayer = Layers.Enum.UI_3D;
      const camerasBefore = sceneCameras(scene);
      const compatibleBefore = requireCompatibleCameras(
        camerasBefore,
        selectedLayer,
        plan.correlationId,
      );

      const loadedEntries = await Promise.all(
        plan.parts.map(async (part) => [
          part.spriteFrameUuid,
          await loadSpriteFrame(part.spriteFrameUuid, plan.correlationId),
        ] as const),
      );
      const spriteFrames = new Map(loadedEntries);
      const roots = scene.children.map((root) => ({
        name: root.name,
        hasGeneratedMarker: root.children.some(
          (child) => child.name === plan.generatedMarkerName,
        ),
      }));
      const decision = decideGeneratedRootReplacement(
        roots,
        plan.characterRootName,
        plan.correlationId,
      );

      newRoot = buildDetachedRoot(plan, spriteFrames);
      const detachedVerification = verifyRenderTree(
        newRoot,
        plan,
        selectedLayer,
      );
      replacementRoot =
        decision.matchingIndex === null
          ? null
          : scene.children[decision.matchingIndex] ?? null;
      commitGeneratedRootReplacement(replacementRoot, newRoot, {
        isAttached: (node) => node.parent !== null,
        attach: (node) => node.setParent(scene),
        detach: (node) => node.setParent(null),
        destroy: (node) => {
          node.destroy();
        },
        verify: () => {
          const attachedRoot = scene.children.find(
            (root) =>
              root.name === plan.characterRootName &&
              root.children.some((child) => child.name === plan.generatedMarkerName),
          );
          if (attachedRoot === undefined) {
            throw new Error("Generated character root was not attached to the scene.");
          }
          verifyRenderTree(attachedRoot, plan, selectedLayer);
          requireCompatibleCameras(
            sceneCameras(scene),
            selectedLayer,
            plan.correlationId,
          );
          if (
            JSON.stringify(sceneCameras(scene)) !== JSON.stringify(camerasBefore)
          ) {
            throw new Error("Unrelated scene-camera state changed during generation.");
          }
          const unrelatedRootCount = scene.children.filter(
            (root) => root.name !== plan.characterRootName,
          ).length;
          if (unrelatedRootCount !== decision.unrelatedRootCount) {
            throw new Error("Unrelated scene-root count changed during generation.");
          }
        },
      });
      const unrelatedRootCountAfter = scene.children.filter(
        (root) => root.name !== plan.characterRootName,
      ).length;

      const result: SceneBuildSuccess = {
        ok: true,
        stage: "scene",
        correlationId: plan.correlationId,
        sceneName: scene.name,
        sceneUuid: scene.uuid,
        characterRootName: plan.characterRootName,
        replacement: decision.action === "create" ? "created" : "replaced",
        partCount: plan.parts.length,
        jointCount: plan.parts.length,
        visualCount: plan.parts.length,
        socketCount: plan.sockets.length,
        unrelatedRootCountBefore: decision.unrelatedRootCount,
        unrelatedRootCountAfter,
        renderLayer: "UI_3D",
        renderRoot2DVerified: true,
        spriteFramesVerified: detachedVerification.spriteFramesVerified,
        nonZeroContentSizesVerified:
          detachedVerification.nonZeroContentSizesVerified,
        compatibleCameraNames: compatibleBefore.map((camera) => camera.name),
        cameraStatePreserved: true,
        verifiedPartIds: plan.parts.map((part) => part.partId),
        sortingOrders: plan.parts
          .map((part) => part.sortingOrder)
          .sort((left, right) => left - right),
        animationRuntimeVerified: plan.animation !== null,
        animationId: plan.animation?.normalizedAnimation.animationId ?? null,
        animationTrackCount:
          plan.animation?.normalizedAnimation.tracks.length ?? 0,
        animationAutoplay: plan.animation?.autoplay ?? false,
      };
      console.info(
        `[${EXTENSION_NAME}] ${result.replacement} ${plan.characterRootName} (${plan.correlationId})`,
      );
      return result;
    } catch (error) {
      if (newRoot !== null && newRoot.parent === null) newRoot.destroy();
      console.error(`[${EXTENSION_NAME}]`, error);
      return failure(plan.correlationId, error);
    }
  },
};

export function load(): void {
  console.info(`[${EXTENSION_NAME}] Scene Script loaded`);
}

export function unload(): void {}
