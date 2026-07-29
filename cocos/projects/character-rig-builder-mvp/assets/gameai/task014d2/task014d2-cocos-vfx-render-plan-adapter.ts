import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  gfx,
  Graphics,
  input,
  Input,
  KeyCode,
  Label,
  Layers,
  Material,
  Node,
  resources,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
  UIRenderer,
  Vec3,
} from "cc";

import {
  TASK014D2_INPUT_REGISTRY,
  TASK014D2_RESOURCE_REGISTRY,
  TASK014D2_SORTING,
  TASK014D2_SPATIAL,
  createTask014D2RuntimeDiagnostics,
  formatTask014D2Diagnostics,
  task014d2BoundsOverflowPx,
  task014d2MaterialBlendMatches,
  task014d2SpatialErrorsWithinTolerance,
  task014d2VisibilityRequiresSpatialMeasurement,
  type Task014D2Bounds,
  type Task014D2InputAction,
} from "./cocos-vfx-harness-contract";
import {
  compileCocosVfxRenderDescriptors,
  cocosVfxBlendState,
  cocosVfxRendererKind,
  rankCocosVfxRuntimeSorting,
  type CocosVfxBlendFactor,
  type CocosVfxCueDescriptor,
  type CocosVfxDescriptorPlan,
  type CocosVfxLayerDescriptor,
  type CocosVfxRendererKind,
} from "./cocos-vfx-render-descriptor";
import {
  CocosVfxPlanErrorCode,
  CocosVfxRuntimeError,
} from "./cocos-vfx-diagnostics";
import {
  CocosVfxRuntimeState,
  type CocosVfxLayerVisibility,
  type CocosVfxRendererOwnership,
  type CocosVfxRuntimeHost,
} from "./cocos-vfx-runtime-state";
import { Task014D2CleanupCoordinator } from "./cocos-vfx-cleanup-coordinator";
import type { VfxLayerSample } from "./d1/types";
import {
  canonicalTimeToTicks,
  compareCodeUnits,
} from "./d1/semantics";
import { TASK014D2_RENDER_PLAN } from "./render-plan-data";

const { ccclass } = _decorator;
const TEXTURE_RESOURCE_PATH =
  "production-lite-character/parts/head/spriteFrame";

interface RendererBinding {
  readonly ownership: CocosVfxRendererOwnership;
  readonly node: Node;
  readonly descriptor: CocosVfxLayerDescriptor;
  readonly target: Node;
  readonly renderers: readonly UIRenderer[];
  readonly sorting: readonly Sorting2D[];
  readonly graphics: Graphics | null;
  readonly particleSprites: readonly Sprite[];
  readonly debugGraphics: Graphics;
  readonly cleanup: Task014D2CleanupCoordinator;
  visibility: CocosVfxLayerVisibility;
  localBounds: Task014D2Bounds;
}

interface RendererOwner {
  readonly ownership: CocosVfxRendererOwnership;
  readonly cleanup: Task014D2CleanupCoordinator;
  visibility: CocosVfxLayerVisibility;
}

interface CocosResourceRealization {
  readonly resourceId: string;
  readonly recipeKind: CocosVfxLayerDescriptor["recipeKind"];
  readonly spriteFrame: SpriteFrame | null;
}

interface BlendInspectableRenderer {
  srcBlendFactor: gfx.BlendFactor;
  dstBlendFactor: gfx.BlendFactor;
  updateMaterial(): void;
  customMaterial: Material | null;
  getRenderMaterial(index: number): Material | null;
  getMaterialInstance(index: number): {
    recompileShaders(defines: Readonly<Record<string, boolean>>): void;
    readonly passes: readonly {
      readonly blendState: {
        readonly targets: readonly unknown[];
      };
    }[];
  } | null;
}

function blendFactor(value: CocosVfxBlendFactor): gfx.BlendFactor {
  switch (value) {
    case "src-alpha":
      return gfx.BlendFactor.SRC_ALPHA;
    case "one-minus-src-alpha":
      return gfx.BlendFactor.ONE_MINUS_SRC_ALPHA;
    case "one":
      return gfx.BlendFactor.ONE;
    case "dst-color":
      return gfx.BlendFactor.DST_COLOR;
    case "one-minus-src-color":
      return gfx.BlendFactor.ONE_MINUS_SRC_COLOR;
    default:
      return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`TASK_014D2_UNREACHABLE_ENUM: ${String(value)}`);
}

class CocosRenderPlanHost implements CocosVfxRuntimeHost {
  private readonly bindings = new Map<string, RendererBinding>();
  private readonly owners = new Map<string, RendererOwner>();
  private readonly verifiedBlendRenderers = new WeakSet<UIRenderer>();
  private readonly world = new Vec3();
  private readonly observedWorld = new Vec3();
  private readonly observedAxisWorld = new Vec3();
  private readonly local = new Vec3();
  private readonly overlayLocal = new Vec3();
  private debug = false;
  private materialOwnershipCounter = 0;
  maximumProjectionErrorPx = 0;
  maximumPositionErrorPx = 0;
  maximumRotationErrorDegrees = 0;
  maximumViewportOverflowPx = 0;
  materialBlendChecks = 0;
  materialBlendMismatches = 0;
  duplicateDestroys = 0;
  visibilityMismatches = 0;

  constructor(
    private readonly overlay: Node,
    private readonly targets: readonly Node[],
    private readonly cueOrder: ReadonlyMap<string, number>,
    private readonly resources: ReadonlyMap<string, CocosResourceRealization>,
    private readonly injectCleanupFault: (stage: string) => void,
  ) {}

  verifyMaterialBlendGate(spriteFrame: SpriteFrame): void {
    const roles = [
      "alpha",
      "additive",
      "multiply",
      "screen",
    ] as const satisfies readonly CocosVfxLayerDescriptor["blendRole"][];
    const rendererKinds = [
      "sprite",
      "graphics",
      "particle-sprite",
    ] as const;
    for (const role of roles) {
      for (const rendererKind of rendererKinds) {
        const node = new Node(`BlendGate_${rendererKind}_${role}`);
        const cleanup = new Task014D2CleanupCoordinator();
        cleanup.own({
          id: "node-detach",
          order: 20,
          run: () => node.removeFromParent(),
        });
        cleanup.own({
          id: "node-destroy",
          order: 40,
          run: () => node.destroy(),
        });
        node.active = false;
        node.layer = Layers.Enum.UI_2D;
        let firstError: unknown = null;
        try {
          node.setParent(this.overlay);
          node.addComponent(UITransform).setContentSize(8, 8);
          const renderer = rendererKind === "graphics"
            ? node.addComponent(Graphics)
            : node.addComponent(Sprite);
          if (renderer instanceof Sprite) renderer.spriteFrame = spriteFrame;
          if (renderer instanceof Graphics) renderer.stroke();
          this.applyBlend(
            renderer,
            role,
            cleanup,
          );
          node.active = true;
          this.verifyRendererBlend(
            renderer,
            role,
            `blend-gate:${rendererKind}:${role}`,
          );
        } catch (error) {
          firstError = error;
        } finally {
          const report = cleanup.cleanup(firstError);
          if (firstError !== null) throw firstError;
          if (!cleanup.complete) {
            throw new Error(
              `TASK_014D2_BLEND_GATE_CLEANUP_FAILED:${
                report.cleanupErrors.map((entry) =>
                  `${entry.stepId}:${entry.message}`).join("|")
              }`,
            );
          }
        }
      }
    }
  }

  createLayer(
    ownership: CocosVfxRendererOwnership,
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (this.owners.has(ownership.rendererId)) {
      throw new Error(`TASK_014D2_DUPLICATE_RENDERER: ${ownership.rendererId}`);
    }
    const cueIndex = this.cueOrder.get(descriptor.cueId);
    const resource = this.resources.get(descriptor.resourceId);
    if (cueIndex === undefined || resource === undefined ||
        resource.recipeKind !== descriptor.recipeKind) {
      throw new Error("TASK_014D2_RESOURCE_REALIZATION_MISSING");
    }
    this.assertLifecycle(descriptor);
    this.assertRecipePrimitive(descriptor);
    const target = this.targets[cueIndex % this.targets.length] as Node;
    const node = new Node(`VFX_${ownership.rendererId}`);
    const cleanup = new Task014D2CleanupCoordinator();
    cleanup.own({
      id: "node-detach",
      order: 20,
      run: () => {
        this.injectCleanupFault("renderer-node-detach");
        node.removeFromParent();
      },
    });
    cleanup.own({
      id: "node-destroy",
      order: 40,
      run: () => {
        this.injectCleanupFault("renderer-node-destroy");
        node.destroy();
      },
    });
    this.owners.set(ownership.rendererId, {
      ownership,
      cleanup,
      visibility: "pending",
    });
    node.active = false;
    node.layer = Layers.Enum.UI_2D;
    node.setParent(target);
    node.addComponent(UITransform).setContentSize(240, 240);
    try {
      const recipe = this.createRecipe(
        node,
        descriptor,
        resource,
        cleanup,
      );
      const debugNode = new Node("DebugBounds");
      debugNode.layer = Layers.Enum.UI_2D;
      debugNode.setParent(node);
      debugNode.addComponent(UITransform).setContentSize(240, 240);
      const debugGraphics = debugNode.addComponent(Graphics);
      debugNode.addComponent(Sorting2D).sortingOrder =
        TASK014D2_SORTING.debug;
      debugNode.active = this.debug;
      this.bindings.set(ownership.rendererId, {
        ownership,
        node,
        descriptor,
        target,
        renderers: recipe.renderers,
        sorting: recipe.sorting,
        graphics: recipe.graphics,
        particleSprites: recipe.particleSprites,
        debugGraphics,
        cleanup,
        visibility: "pending",
        localBounds: recipe.localBounds,
      });
      this.refreshSorting();
    } catch (error) {
      this.bindings.delete(ownership.rendererId);
      const report = cleanup.cleanup(error);
      if (cleanup.complete) this.owners.delete(ownership.rendererId);
      if (report.cleanupErrors.length > 0) {
        throw new Error(
          `${report.firstError}; cleanup=${report.cleanupErrors
            .map((entry) => `${entry.stepId}:${entry.message}`).join("|")}`,
        );
      }
      throw error;
    }
  }

  sampleLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    visibility: CocosVfxLayerVisibility,
    commandElapsedSeconds: number,
  ): void {
    const binding = this.bindings.get(rendererId);
    if (binding === undefined || binding.descriptor !== descriptor) {
      throw new Error(`TASK_014D2_UNKNOWN_OR_MISMATCHED_RENDERER: ${rendererId}`);
    }
    binding.visibility = visibility;
    const owner = this.owners.get(rendererId);
    if (owner !== undefined) owner.visibility = visibility;
    if (!task014d2VisibilityRequiresSpatialMeasurement(visibility)) {
      binding.node.active = false;
      if (binding.node.activeInHierarchy) this.visibilityMismatches += 1;
      return;
    }
    binding.node.active = true;
    if (!binding.node.activeInHierarchy) this.visibilityMismatches += 1;
    if (![
      sample.position.x,
      sample.position.y,
      sample.rotationDegrees,
      sample.scale.x,
      sample.scale.y,
      sample.effectiveAlpha,
      commandElapsedSeconds,
    ].every(Number.isFinite)) {
      throw new Error("TASK_014D2_NON_FINITE_SAMPLE");
    }
    const targetTransform = binding.target.getComponent(UITransform);
    const overlayTransform = this.overlay.getComponent(UITransform);
    const rendererTransform = binding.node.getComponent(UITransform);
    if (targetTransform === null || overlayTransform === null ||
        rendererTransform === null) {
      throw new Error("TASK_014D2_PROJECTION_TRANSFORM_MISSING");
    }
    this.local.x = sample.position.x;
    this.local.y = sample.position.y;
    this.local.z = 0;
    targetTransform.convertToWorldSpaceAR(this.local, this.world);
    overlayTransform.convertToNodeSpaceAR(this.world, this.overlayLocal);
    if (![this.overlayLocal.x, this.overlayLocal.y].every(Number.isFinite)) {
      throw new Error("TASK_014D2_NON_FINITE_PROJECTION");
    }
    binding.node.setPosition(sample.position.x, sample.position.y, 0);
    binding.node.setRotationFromEuler(0, 0, sample.rotationDegrees);
    binding.node.setScale(sample.scale.x, sample.scale.y, 1);
    this.applyVisual(binding, sample);
    this.verifyActiveRendererBlends(binding);
    this.measure(binding, sample, targetTransform, overlayTransform);
  }

  destroyLayer(rendererId: string, _reason: string): void {
    const owner = this.owners.get(rendererId);
    if (owner === undefined) {
      this.duplicateDestroys += 1;
      return;
    }
    const report = owner.cleanup.cleanup();
    if (!owner.cleanup.complete) {
      throw new Error(
        `TASK_014D2_RENDERER_CLEANUP_FAILED:${rendererId}:${
          report.cleanupErrors.map((entry) =>
            `${entry.stepId}:${entry.message}`).join("|")
        }`,
      );
    }
    this.bindings.delete(rendererId);
    this.owners.delete(rendererId);
    this.refreshSorting();
  }

  destroyAll(reason: string): void {
    let firstError: unknown = null;
    for (const rendererId of [...this.owners.keys()]) {
      try {
        this.destroyLayer(rendererId, reason);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError !== null) throw firstError;
  }

  rendererOwnership(): readonly CocosVfxRendererOwnership[] {
    return [...this.owners.values()].map((owner) => ({
      ...owner.ownership,
      visibility: owner.visibility,
    }));
  }

  setDebug(value: boolean): void {
    this.debug = value;
    for (const binding of this.bindings.values()) {
      binding.debugGraphics.node.active =
        value && binding.visibility === "active";
      if (value) this.drawDebugBounds(binding);
    }
  }

  activeSummary(): string {
    const values = [...this.bindings.values()]
      .filter((binding) => binding.visibility === "active")
      .map((binding) =>
        `${binding.descriptor.rendererKind}/${binding.descriptor.blendRole}`);
    return [...new Set(values)].sort(compareCodeUnits).join(", ") || "none";
  }

  componentCounts(): Readonly<{
    recipes: Readonly<Record<CocosVfxRendererKind, number>>;
    sortingOrders: readonly number[];
  }> {
    const recipes: Record<CocosVfxRendererKind, number> = {
      sprite: 0,
      "graphics-ring": 0,
      "graphics-ribbon": 0,
      "sprite-particles": 0,
    };
    const sortingOrders: number[] = [];
    for (const binding of this.bindings.values()) {
      recipes[binding.descriptor.rendererKind] += 1;
      sortingOrders.push(
        binding.sorting[0]?.sortingOrder ?? binding.descriptor.sortingOrder,
      );
    }
    return { recipes, sortingOrders };
  }

  private assertRecipePrimitive(
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (
      cocosVfxRendererKind(
        descriptor.recipeKind,
        descriptor.primitive,
      ) !== descriptor.rendererKind
    ) {
      throw new Error("TASK_014D2_RECIPE_RENDERER_MISMATCH");
    }
    switch (descriptor.recipeKind) {
      case "textured-sprite":
        switch (descriptor.primitive) {
          case "sprite-quad":
          case "burst-particles": return;
          case "ring":
          case "ribbon": break;
          default: assertNever(descriptor.primitive);
        }
        break;
      case "procedural-ring":
        switch (descriptor.primitive) {
          case "ring": return;
          case "sprite-quad":
          case "ribbon":
          case "burst-particles": break;
          default: assertNever(descriptor.primitive);
        }
        break;
      case "procedural-ribbon":
        switch (descriptor.primitive) {
          case "ribbon": return;
          case "sprite-quad":
          case "ring":
          case "burst-particles": break;
          default: assertNever(descriptor.primitive);
        }
        break;
      default:
        assertNever(descriptor.recipeKind);
    }
    throw new Error("TASK_014D2_RECIPE_PRIMITIVE_MISMATCH");
  }

  private createRecipe(
    node: Node,
    descriptor: CocosVfxLayerDescriptor,
    resource: CocosResourceRealization,
    cleanup: Task014D2CleanupCoordinator,
  ): {
    renderers: readonly UIRenderer[];
    sorting: readonly Sorting2D[];
    graphics: Graphics | null;
    particleSprites: readonly Sprite[];
    localBounds: Task014D2Bounds;
  } {
    switch (descriptor.rendererKind) {
      case "sprite": {
        const sprite = node.addComponent(Sprite);
        if (resource.spriteFrame === null) {
          throw new Error("TASK_014D2_TEXTURED_SPRITE_FRAME_MISSING");
        }
        sprite.spriteFrame = resource.spriteFrame;
        node.getComponent(UITransform)?.setContentSize(108, 108);
        this.applyBlend(
          sprite,
          descriptor.blendRole,
          cleanup,
        );
        const sorting = node.addComponent(Sorting2D);
        sorting.sortingOrder = descriptor.sortingOrder;
        return {
          renderers: [sprite],
          sorting: [sorting],
          graphics: null,
          particleSprites: [],
          localBounds: {
            minimumX: -54,
            minimumY: -54,
            maximumX: 54,
            maximumY: 54,
          },
        };
      }
      case "graphics-ring":
      case "graphics-ribbon": {
        const graphics = node.addComponent(Graphics);
        graphics.stroke();
        this.applyBlend(
          graphics,
          descriptor.blendRole,
          cleanup,
        );
        const sorting = node.addComponent(Sorting2D);
        sorting.sortingOrder = descriptor.sortingOrder;
        return {
          renderers: [graphics],
          sorting: [sorting],
          graphics,
          particleSprites: [],
          localBounds: descriptor.rendererKind === "graphics-ring"
            ? { minimumX: -72, minimumY: -72, maximumX: 72, maximumY: 72 }
            : { minimumX: -104, minimumY: -58, maximumX: 50, maximumY: 60 },
        };
      }
      case "sprite-particles": {
        if (resource.spriteFrame === null) {
          throw new Error("TASK_014D2_PARTICLE_SPRITE_FRAME_MISSING");
        }
        const particleSorting: Sorting2D[] = [];
        const particles = descriptor.layer.emission?.schedule.map((_, index) => {
          const particleNode = new Node(`Particle_${index}`);
          particleNode.layer = Layers.Enum.UI_2D;
          particleNode.setParent(node);
          particleNode.addComponent(UITransform).setContentSize(14, 14);
          const sprite = particleNode.addComponent(Sprite);
          sprite.spriteFrame = resource.spriteFrame;
          this.applyBlend(
            sprite,
            descriptor.blendRole,
            cleanup,
          );
          const sorting = particleNode.addComponent(Sorting2D);
          sorting.sortingOrder = descriptor.sortingOrder;
          particleSorting.push(sorting);
          particleNode.active = false;
          return sprite;
        }) ?? [];
        return {
          renderers: particles,
          sorting: particleSorting,
          graphics: null,
          particleSprites: particles,
          localBounds: { minimumX: 0, minimumY: 0, maximumX: 0, maximumY: 0 },
        };
      }
      default:
        return assertNever(descriptor.rendererKind);
    }
  }

  private applyBlend(
    renderer: Sprite | Graphics,
    blendRole: CocosVfxLayerDescriptor["blendRole"],
    cleanup: Task014D2CleanupCoordinator,
  ): Material | null {
    const blendState = cocosVfxBlendState(blendRole);
    const materialRenderer =
      renderer as unknown as BlendInspectableRenderer;
    const expectedSource = blendFactor(blendState.source);
    const expectedDestination = blendFactor(
      blendState.destination,
    );
    materialRenderer.srcBlendFactor = expectedSource;
    materialRenderer.dstBlendFactor = expectedDestination;
    materialRenderer.updateMaterial();
    const baseMaterial = materialRenderer.getRenderMaterial(0);
    if (baseMaterial === null) {
      throw new Error("TASK_014D2_BASE_MATERIAL_MISSING");
    }
    const material = new Material();
    cleanup.own({
      id: `material-${++this.materialOwnershipCounter}`,
      order: 30,
      run: () => {
        this.injectCleanupFault("material-destroy");
        material.destroy();
      },
    });
    try {
      material.copy(baseMaterial, {
        states: {
          blendState: {
            targets: [{
              blend: true,
              blendSrc: expectedSource,
              blendDst: expectedDestination,
              blendSrcAlpha: gfx.BlendFactor.ONE,
              blendDstAlpha: gfx.BlendFactor.ONE_MINUS_SRC_ALPHA,
            }],
          },
        },
      });
      materialRenderer.customMaterial = material;
      if (renderer instanceof Graphics) {
        materialRenderer.getMaterialInstance(0)?.recompileShaders({
          USE_LOCAL: true,
        });
      }
      materialRenderer.updateMaterial();
      return material;
    } catch (error) {
      throw error;
    }
  }

  private verifyActiveRendererBlends(binding: RendererBinding): void {
    for (const [index, renderer] of binding.renderers.entries()) {
      if (
        renderer.node.activeInHierarchy &&
        !this.verifiedBlendRenderers.has(renderer)
      ) {
        this.verifyRendererBlend(
          renderer,
          binding.descriptor.blendRole,
          `${binding.descriptor.descriptorId}:renderer:${index}`,
        );
      }
    }
  }

  private verifyRendererBlend(
    renderer: UIRenderer,
    blendRole: CocosVfxLayerDescriptor["blendRole"],
    diagnosticId: string,
  ): void {
    const blendState = cocosVfxBlendState(blendRole);
    const materialRenderer =
      renderer as unknown as BlendInspectableRenderer;
    const expectedSource = blendFactor(blendState.source);
    const expectedDestination = blendFactor(
      blendState.destination,
    );
    const target = materialRenderer
      .getMaterialInstance(0)
      ?.passes[0]
      ?.blendState.targets[0];
    this.materialBlendChecks += 1;
    if (
      !task014d2MaterialBlendMatches(
        target,
        expectedSource,
        expectedDestination,
      )
    ) {
      this.materialBlendMismatches += 1;
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.MATERIAL_BLEND_MISMATCH,
        `COCOS_VFX_MATERIAL_BLEND_MISMATCH: ${diagnosticId} expected ${expectedSource}/${expectedDestination} observed ${String((target as { blendSrc?: unknown } | undefined)?.blendSrc)}/${String((target as { blendDst?: unknown } | undefined)?.blendDst)}`,
      );
    }
    this.verifiedBlendRenderers.add(renderer);
  }

  private refreshSorting(): void {
    const orders = rankCocosVfxRuntimeSorting(
      [...this.bindings.values()].map((binding) => ({
        rendererId: binding.ownership.rendererId,
        cueId: binding.descriptor.cueId,
        layerId: binding.descriptor.layerId,
        instanceId: binding.ownership.instanceId,
        authoredOrder: binding.descriptor.layer.order,
      })),
    );
    for (const binding of this.bindings.values()) {
      const order = orders.get(binding.ownership.rendererId);
      if (order === undefined) {
        throw new Error("TASK_014D2_ACTIVE_SORTING_ASSIGNMENT_MISSING");
      }
      for (const sorting of binding.sorting) sorting.sortingOrder = order;
    }
  }

  private applyVisual(
    binding: RendererBinding,
    sample: VfxLayerSample,
  ): void {
    const color = binding.descriptor.layer.color;
    const cocosColor = new Color(
      Math.round(color.r * 255),
      Math.round(color.g * 255),
      Math.round(color.b * 255),
      Math.round(Math.max(0, Math.min(1, sample.effectiveAlpha)) * 255),
    );
    switch (binding.descriptor.rendererKind) {
      case "sprite":
        (binding.renderers[0] as Sprite).color = cocosColor;
        break;
      case "graphics-ring": {
        const graphics = binding.graphics as Graphics;
        graphics.clear();
        graphics.strokeColor = cocosColor;
        graphics.lineWidth = 8;
        graphics.circle(0, 0, 66);
        graphics.stroke();
        break;
      }
      case "graphics-ribbon": {
        const graphics = binding.graphics as Graphics;
        graphics.clear();
        graphics.strokeColor = cocosColor;
        graphics.lineWidth = 16;
        graphics.moveTo(-96, -24);
        graphics.bezierCurveTo(-62, 52, -24, -48, 42, 20);
        graphics.stroke();
        break;
      }
      case "sprite-particles":
        this.updateParticles(binding, cocosColor, sample);
        break;
      default:
        assertNever(binding.descriptor.rendererKind);
    }
    binding.debugGraphics.node.active = this.debug;
    if (this.debug) this.drawDebugBounds(binding);
  }

  private updateParticles(
    binding: RendererBinding,
    color: Color,
    sample: VfxLayerSample,
  ): void {
    let minimumX = 0;
    let minimumY = 0;
    let maximumX = 0;
    let maximumY = 0;
    let visible = 0;
    const schedule = binding.descriptor.layer.emission?.schedule ?? [];
    const timing = binding.descriptor.layer.timing;
    const sampleTick = canonicalTimeToTicks(timing.delaySeconds) +
      canonicalTimeToTicks(
        (sample.phase ?? 0) * timing.durationSeconds,
      );
    for (const [index, spawn] of schedule.entries()) {
      const sprite = binding.particleSprites[index] as Sprite;
      const active =
        canonicalTimeToTicks(spawn.spawnTimeSeconds) <= sampleTick;
      sprite.node.active = active;
      if (!active) continue;
      sprite.color = color;
      const angle = ((spawn.randomUint32 & 0xffff) / 0xffff) * Math.PI * 2;
      const radius = 20 + ((spawn.randomUint32 >>> 16) / 0xffff) * 68;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      sprite.node.setPosition(x, y, 0);
      minimumX = visible === 0 ? x - 7 : Math.min(minimumX, x - 7);
      minimumY = visible === 0 ? y - 7 : Math.min(minimumY, y - 7);
      maximumX = visible === 0 ? x + 7 : Math.max(maximumX, x + 7);
      maximumY = visible === 0 ? y + 7 : Math.max(maximumY, y + 7);
      visible += 1;
    }
    binding.localBounds = { minimumX, minimumY, maximumX, maximumY };
  }

  private measure(
    binding: RendererBinding,
    sample: VfxLayerSample,
    targetTransform: UITransform,
    overlayTransform: UITransform,
  ): void {
    this.local.x = 0;
    this.local.y = 0;
    this.local.z = 0;
    binding.node.getComponent(UITransform)?.convertToWorldSpaceAR(
      this.local,
      this.observedWorld,
    );
    const positionError = Math.hypot(
      this.observedWorld.x - this.world.x,
      this.observedWorld.y - this.world.y,
    );
    this.maximumPositionErrorPx = Math.max(
      this.maximumPositionErrorPx,
      positionError,
    );
    const roundTrip = targetTransform.convertToNodeSpaceAR(this.observedWorld);
    this.maximumProjectionErrorPx = Math.max(
      this.maximumProjectionErrorPx,
      Math.hypot(roundTrip.x - sample.position.x, roundTrip.y - sample.position.y),
    );
    if (Math.abs(sample.scale.x) + Math.abs(sample.scale.y) > 1e-12) {
      const radians = (sample.rotationDegrees * Math.PI) / 180;
      this.local.x = Math.abs(sample.scale.x) > 1e-12 ? 1 : 0;
      this.local.y = this.local.x === 0 ? 1 : 0;
      binding.node.getComponent(UITransform)?.convertToWorldSpaceAR(
        this.local,
        this.observedAxisWorld,
      );
      const observedAxisInTarget = targetTransform.convertToNodeSpaceAR(
        this.observedAxisWorld,
      );
      const expectedAxisX = Math.cos(radians);
      const expectedAxisY = Math.sin(radians);
      const observedAxisX = observedAxisInTarget.x - sample.position.x;
      const observedAxisY = observedAxisInTarget.y - sample.position.y;
      const observedAxisLength = Math.hypot(observedAxisX, observedAxisY);
      if (!Number.isFinite(observedAxisLength) || observedAxisLength <= 0) {
        throw new Error("TASK_014D2_NON_FINITE_ROTATION");
      }
      const dot = Math.max(-1, Math.min(
        1,
        (expectedAxisX * observedAxisX + expectedAxisY * observedAxisY) /
          observedAxisLength,
      ));
      this.maximumRotationErrorDegrees = Math.max(
        this.maximumRotationErrorDegrees,
        (Math.acos(dot) * 180) / Math.PI,
      );
    }
    const corners = [
      [binding.localBounds.minimumX, binding.localBounds.minimumY],
      [binding.localBounds.minimumX, binding.localBounds.maximumY],
      [binding.localBounds.maximumX, binding.localBounds.minimumY],
      [binding.localBounds.maximumX, binding.localBounds.maximumY],
    ];
    const projected = corners.map(([x, y]) => {
      this.local.x = x as number;
      this.local.y = y as number;
      this.local.z = 0;
      binding.node.getComponent(UITransform)?.convertToWorldSpaceAR(
        this.local,
        this.world,
      );
      overlayTransform.convertToNodeSpaceAR(this.world, this.overlayLocal);
      return { x: this.overlayLocal.x, y: this.overlayLocal.y };
    });
    const bounds = {
      minimumX: Math.min(...projected.map((point) => point.x)),
      minimumY: Math.min(...projected.map((point) => point.y)),
      maximumX: Math.max(...projected.map((point) => point.x)),
      maximumY: Math.max(...projected.map((point) => point.y)),
    };
    const overflow = task014d2BoundsOverflowPx(bounds);
    this.maximumViewportOverflowPx = Math.max(
      this.maximumViewportOverflowPx,
      overflow,
    );
    if (!Number.isFinite(overflow) || overflow > 0) {
      throw new Error(`TASK_014D2_AABB_OVERFLOW: ${overflow.toFixed(4)}`);
    }
  }

  private drawDebugBounds(binding: RendererBinding): void {
    const graphics = binding.debugGraphics;
    const bounds = binding.localBounds;
    graphics.clear();
    graphics.strokeColor = new Color(34, 211, 238, 255);
    graphics.lineWidth = 3;
    graphics.rect(
      bounds.minimumX,
      bounds.minimumY,
      Math.max(1, bounds.maximumX - bounds.minimumX),
      Math.max(1, bounds.maximumY - bounds.minimumY),
    );
    graphics.stroke();
  }

  private assertLifecycle(descriptor: CocosVfxLayerDescriptor): void {
    switch (descriptor.lifecycle) {
      case "one-shot":
        if (descriptor.commandMode !== "emit") {
          throw new Error("TASK_014D2_LIFECYCLE_COMMAND_MISMATCH");
        }
        return;
      case "looping":
      case "persistent":
        if (descriptor.commandMode !== "start-stop") {
          throw new Error("TASK_014D2_LIFECYCLE_COMMAND_MISMATCH");
        }
        return;
      default:
        assertNever(descriptor.lifecycle);
    }
  }
}

@ccclass("GameAITask014D2CocosVfxRenderPlanAdapter")
export class GameAITask014D2CocosVfxRenderPlanAdapter extends Component {
  private generation = 0;
  private runtimeRoot: Node | null = null;
  private stressRoot: Node | null = null;
  private overlay: Node | null = null;
  private hud: Label | null = null;
  private failureHud: Node | null = null;
  private descriptorPlan: CocosVfxDescriptorPlan | null = null;
  private host: CocosRenderPlanHost | null = null;
  private runtime: CocosVfxRuntimeState | null = null;
  private inputRegistered = false;
  private ready = false;
  private playing = false;
  private stress = false;
  private debug = false;
  private elapsedSeconds = 0;
  private commandCounter = 0;
  private terminal = false;
  private lifecycle = new Task014D2CleanupCoordinator();
  private readonly injectedFaults = new Set<string>();
  private activeStartStop: {
    cueId: string;
    instanceId: string;
  } | null = null;
  private readonly diagnostics = createTask014D2RuntimeDiagnostics();
  private readonly onKeyDown = (event: EventKeyboard): void => {
    const key = this.keyName(event.keyCode);
    const binding = TASK014D2_INPUT_REGISTRY.find(
      (candidate) => candidate.key === key,
    );
    if (binding === undefined) return;
    try {
      this.dispatch(binding.action);
    } catch (error) {
      this.enterTerminalFailure(error);
    }
  };

  onEnable(): void {
    this.beginSetup();
  }

  update(deltaSeconds: number): void {
    if (!this.ready || this.runtime === null || this.terminal) return;
    try {
      if (this.playing) {
        this.elapsedSeconds += deltaSeconds;
        this.runtime.tick(deltaSeconds);
      }
      this.assertRuntime();
      this.syncDiagnostics();
      this.updateHud();
    } catch (error) {
      this.enterTerminalFailure(error);
    }
  }

  onDisable(): void {
    this.teardown("disable");
  }

  onDestroy(): void {
    this.teardown("dispose");
  }

  private beginSetup(): void {
    this.destroyFailureHud();
    const previous = this.lifecycle.cleanup();
    if (!this.lifecycle.complete) {
      this.diagnostics.terminalError =
        previous.firstError ?? "TASK_014D2_PREVIOUS_CLEANUP_INCOMPLETE";
      this.diagnostics.cleanupErrors = previous.cleanupErrors
        .map((entry) => `${entry.stepId}:${entry.message}`).join(" | ");
      this.showFailureHud();
      return;
    }
    this.lifecycle = new Task014D2CleanupCoordinator();
    const generation = ++this.generation;
    this.lifecycle.own({
      id: "generation-invalidate",
      order: 0,
      run: () => {
        if (this.generation === generation) this.generation += 1;
      },
    });
    this.lifecycle.own({
      id: "references-clear",
      order: 100,
      run: () => this.clearRuntimeReferences(),
    });
    this.ready = false;
    this.terminal = false;
    this.diagnostics.terminalError = "";
    this.diagnostics.cleanupErrors = "";
    const compiled = compileCocosVfxRenderDescriptors(
      TASK014D2_RENDER_PLAN,
      TASK014D2_RESOURCE_REGISTRY,
    );
    if (!compiled.ok) {
      this.enterTerminalFailure(
        new Error(`TASK_014D2_RESOURCE_RECIPE_GATE_FAILED: ${JSON.stringify(compiled.errors)}`),
      );
      return;
    }
    this.descriptorPlan = compiled.value;
    resources.load(
      TEXTURE_RESOURCE_PATH,
      SpriteFrame,
      (error: Error | null, frame: SpriteFrame | null) => {
        if (generation !== this.generation) return;
        if (
          (error !== null && error !== undefined) ||
          frame === null ||
          frame === undefined
        ) {
          this.enterTerminalFailure(error ??
            new Error("TASK_014D2_TEXTURE_RESOURCE_LOAD_FAILED"));
          return;
        }
        try {
          const realizations = new Map<string, CocosResourceRealization>();
          for (const resource of TASK014D2_RESOURCE_REGISTRY) {
            realizations.set(resource.resourceId, {
              resourceId: resource.resourceId,
              recipeKind: resource.recipeKind,
              spriteFrame:
                resource.recipeKind === "textured-sprite" ? frame : null,
            });
          }
          this.buildRuntime(compiled.value, realizations);
          this.injectSetupFault("material-mismatch");
          this.injectSetupFault("cleanup-trigger", "cleanup-failure");
          if (generation !== this.generation) return;
          this.ready = true;
          this.diagnostics.setupCount += 1;
          this.exactReset("Initial Reset");
          this.injectSetupFault("initial-sample");
          this.registerInput();
          this.injectSetupFault("registered-before-throw");
          this.injectSetupFault("hud-input-setup");
          this.syncDiagnostics();
          this.updateHud();
          console.info("TASK_014D2_RUNTIME_READY", this.snapshot());
        } catch (caught) {
          this.enterTerminalFailure(caught);
        }
      },
    );
  }

  private buildRuntime(
    plan: CocosVfxDescriptorPlan,
    resourcesById: ReadonlyMap<string, CocosResourceRealization>,
  ): void {
    if (this.runtimeRoot !== null || this.runtimeRootCount() !== 0) {
      throw new Error("TASK_014D2_DUPLICATE_RUNTIME_ROOT");
    }
    const root = new Node("Task014D2RuntimeRoot");
    this.runtimeRoot = root;
    this.lifecycle.own({
      id: "root-detach",
      order: 70,
      run: () => {
        this.injectSetupFault("root-detach");
        root.removeFromParent();
      },
    });
    this.lifecycle.own({
      id: "root-destroy",
      order: 80,
      run: () => {
        this.injectSetupFault("root-destroy");
        root.destroy();
        this.diagnostics.teardownCount += 1;
      },
    });
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    this.injectSetupFault("root-attached");
    root.addComponent(UITransform).setContentSize(1280, 720);
    this.injectSetupFault("ui-transform");
    const stressRoot = this.target("GenericStressRoot", root, 0, 0);
    this.stressRoot = stressRoot;
    const targetA = this.target("GenericTargetA", stressRoot, -210, -40);
    const nested = this.target("GenericNestedParent", stressRoot, 150, 30);
    nested.setRotationFromEuler(0, 0, -12);
    nested.setScale(1.1, 0.85, 1);
    const targetB = this.target("GenericTargetB", nested, 70, 35);
    const targetC = this.target("GenericTargetC", stressRoot, 0, 120);
    const overlay = this.target("VfxOverlayRoot", root, 0, 0);
    overlay.getComponent(UITransform)?.setContentSize(1280, 720);
    this.overlay = overlay;
    const cueOrder = new Map(plan.cues.map((cue, index) => [cue.cueId, index]));
    this.host = new CocosRenderPlanHost(
      overlay,
      [targetA, targetB, targetC],
      cueOrder,
      resourcesById,
      (stage) => this.injectSetupFault(stage),
    );
    this.injectSetupFault("host-created");
    const ownedHost = this.host;
    this.lifecycle.own({
      id: "host-renderers",
      order: 40,
      run: () => ownedHost.destroyAll("lifecycle-cleanup"),
    });
    const spriteFrame = [...resourcesById.values()].find(
      (resource) => resource.spriteFrame !== null,
    )?.spriteFrame;
    if (spriteFrame === null || spriteFrame === undefined) {
      throw new Error("TASK_014D2_BLEND_GATE_SPRITE_FRAME_MISSING");
    }
    this.host.verifyMaterialBlendGate(spriteFrame);
    this.runtime = new CocosVfxRuntimeState(plan, this.host);
    this.injectSetupFault("runtime-created");
    const ownedRuntime = this.runtime;
    this.lifecycle.own({
      id: "runtime-state",
      order: 20,
      run: () => ownedRuntime.cleanup("lifecycle-cleanup"),
    });
    const hudNode = this.target("Task014D2Hud", root, -620, 340);
    const hudTransform = hudNode.getComponent(UITransform) as UITransform;
    hudTransform.setContentSize(1240, 190);
    hudTransform.setAnchorPoint(0, 1);
    const hud = hudNode.addComponent(Label);
    hud.fontSize = 14;
    hud.lineHeight = 19;
    hud.color = new Color(226, 232, 240, 255);
    hudNode.addComponent(Sorting2D).sortingOrder = TASK014D2_SORTING.hud;
    this.hud = hud;
    this.injectSetupFault("hud-created");
  }

  private target(name: string, parent: Node, x: number, y: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(24, 24);
    return node;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_014D2_DUPLICATE_INPUT_HANDLER");
    }
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = true;
    this.lifecycle.own({
      id: "input-handler",
      order: 30,
      run: () => this.unregisterInput(),
    });
  }

  private dispatch(action: Task014D2InputAction): void {
    if (!this.ready || this.runtime === null || this.descriptorPlan === null) {
      return;
    }
    this.diagnostics.lastAction = action;
    if (action === "pause") {
      this.playing = !this.playing;
      this.runtime.setPaused(!this.playing);
    } else if (action === "stress") {
      this.stress = !this.stress;
      this.applyStress();
    } else if (action === "debug") {
      this.debug = !this.debug;
      this.host?.setDebug(this.debug);
    } else if (action === "rebuild") {
      this.diagnostics.rebuildCount += 1;
      this.rebuild();
      return;
    } else if (action === "reset") {
      this.exactReset("Exact Reset");
    } else {
      const cue = this.resolveControlCue(action);
      this.playing = true;
      this.runtime.setPaused(false);
      if (cue.commandMode === "emit") {
        this.runtime.dispatch({
          command: "emit",
          cueId: cue.cueId,
          commandId: `command-${++this.commandCounter}`,
        });
      } else {
        const instanceId = `${cue.lifecycle}-instance`;
        if (
          this.activeStartStop !== null &&
          this.activeStartStop.cueId !== cue.cueId
        ) {
          this.runtime.dispatch({
            command: "stop",
            instanceId: this.activeStartStop.instanceId,
            reason: "switch",
          });
          this.activeStartStop = null;
        }
        if (cue.lifecycle === "persistent") {
          this.diagnostics.persistentStartAttempts += 1;
        }
        const result = this.runtime.dispatch({
          command: "start",
          cueId: cue.cueId,
          commandId: `command-${++this.commandCounter}`,
          instanceId,
        });
        if (result.accepted) {
          this.activeStartStop = { cueId: cue.cueId, instanceId };
        }
        if (cue.lifecycle === "persistent") {
          if (result.accepted) this.diagnostics.acceptedPersistentStarts += 1;
          if (result.coalesced) this.diagnostics.coalescedPersistentStarts += 1;
        }
      }
    }
    this.syncDiagnostics();
    this.updateHud();
  }

  private resolveControlCue(
    action: "one-shot" | "looping" | "persistent" | "combined",
  ): CocosVfxCueDescriptor {
    const cues = this.descriptorPlan?.cues ?? [];
    if (action === "looping") {
      return this.requireCue(cues.find((cue) => cue.lifecycle === "looping"));
    }
    if (action === "persistent") {
      return this.requireCue(cues.find((cue) => cue.lifecycle === "persistent"));
    }
    const oneShots = cues.filter((cue) => cue.lifecycle === "one-shot");
    return this.requireCue([...oneShots].sort((left, right) =>
      action === "combined"
        ? right.layers.length - left.layers.length
        : left.layers.length - right.layers.length)[0]);
  }

  private requireCue(cue: CocosVfxCueDescriptor | undefined):
  CocosVfxCueDescriptor {
    if (cue === undefined) throw new Error("TASK_014D2_CONTROL_CUE_MISSING");
    return cue;
  }

  private applyStress(): void {
    if (this.stressRoot === null) return;
    if (this.stress) {
      this.stressRoot.setPosition(55, -25, 0);
      this.stressRoot.setRotationFromEuler(0, 0, 18);
      this.stressRoot.setScale(1.18, 0.82, 1);
    } else {
      this.stressRoot.setPosition(0, 0, 0);
      this.stressRoot.setRotationFromEuler(0, 0, 0);
      this.stressRoot.setScale(1, 1, 1);
    }
  }

  private exactReset(action: string): void {
    this.runtime?.cleanup("reset");
    this.activeStartStop = null;
    this.runtime?.setPaused(true);
    this.playing = false;
    this.elapsedSeconds = 0;
    this.stress = false;
    this.debug = false;
    this.applyStress();
    this.host?.setDebug(false);
    this.diagnostics.lastAction = action;
    this.syncDiagnostics();
    this.updateHud();
  }

  private rebuild(): void {
    const report = this.cleanupLifecycle("rebuild");
    if (!this.lifecycle.complete) {
      this.enterTerminalFailure(
        new Error(report.firstError ?? "TASK_014D2_REBUILD_CLEANUP_FAILED"),
      );
      return;
    }
    this.beginSetup();
  }

  private teardown(reason: string): void {
    this.ready = false;
    this.playing = false;
    const report = this.cleanupLifecycle(reason);
    if (!this.lifecycle.complete && !this.terminal) {
      this.diagnostics.terminalError =
        report.firstError ?? `TASK_014D2_${reason.toUpperCase()}_CLEANUP_FAILED`;
      this.diagnostics.cleanupErrors = report.cleanupErrors
        .map((entry) => `${entry.stepId}:${entry.message}`).join(" | ");
    }
    this.destroyFailureHud();
  }

  private clearRuntimeReferences(): void {
    this.runtimeRoot = null;
    this.stressRoot = null;
    this.overlay = null;
    this.hud = null;
    this.host = null;
    this.runtime = null;
    this.activeStartStop = null;
  }

  private unregisterInput(): void {
    if (!this.inputRegistered) return;
    try {
      input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    } finally {
      this.inputRegistered = false;
    }
  }

  private enterTerminalFailure(error: unknown): void {
    if (this.terminal && this.lifecycle.complete) return;
    this.terminal = true;
    this.ready = false;
    this.playing = false;
    if (this.injectedFaults.has("cleanup-trigger")) {
      try {
        this.lifecycle.own({
          id: "injected-cleanup",
          order: 10,
          run: () => this.injectSetupFault("cleanup-failure"),
        });
      } catch {}
    }
    let result = this.cleanupLifecycle("terminal-failure", error);
    if (!this.lifecycle.complete) {
      result = this.cleanupLifecycle("terminal-compensation");
    }
    this.diagnostics.terminalError =
      result.firstError ?? (error instanceof Error ? error.message : String(error));
    this.diagnostics.cleanupErrors = result.cleanupErrors
      .map((entry) => `${entry.stepId}:${entry.message}`).join(" | ");
    this.syncDiagnostics();
    this.showFailureHud();
    console.error(this.diagnostics.terminalError);
  }

  private cleanupLifecycle(
    _reason: string,
    error: unknown = null,
  ): ReturnType<Task014D2CleanupCoordinator["cleanup"]> {
    return this.lifecycle.cleanup(error);
  }

  private showFailureHud(): void {
    this.destroyFailureHud();
    const node = this.target("Task014D2FailureHud", this.node, -620, 340);
    const transform = node.getComponent(UITransform) as UITransform;
    transform.setContentSize(1240, 190);
    transform.setAnchorPoint(0, 1);
    const label = node.addComponent(Label);
    label.fontSize = 14;
    label.lineHeight = 19;
    label.color = new Color(248, 113, 113, 255);
    label.string = formatTask014D2Diagnostics(this.diagnostics, {
      ready: false,
      playing: false,
      elapsedSeconds: this.elapsedSeconds,
      stress: this.stress,
      debug: this.debug,
    });
    node.addComponent(Sorting2D).sortingOrder = TASK014D2_SORTING.hud;
    this.failureHud = node;
  }

  private destroyFailureHud(): void {
    this.failureHud?.removeFromParent();
    this.failureHud?.destroy();
    this.failureHud = null;
  }

  private injectSetupFault(stage: string, requestedStage = stage): void {
    const locations = [globalThis.location];
    try {
      if (globalThis.parent?.location !== globalThis.location) {
        locations.push(globalThis.parent.location);
      }
    } catch {
      // A cross-origin preview host cannot contribute a fault request.
    }
    const requested = locations
      .flatMap((location) => [
        new URLSearchParams(location?.search ?? "").get("task014d2Fault"),
        new URLSearchParams((location?.hash ?? "").replace(/^#/, "")).get(
          "task014d2Fault",
        ),
      ])
      .find((value) => value !== null);
    if (requested !== requestedStage || this.injectedFaults.has(stage)) return;
    this.injectedFaults.add(stage);
    throw new Error(`TASK_014D2_INJECTED_SETUP_FAULT:${stage}`);
  }

  private assertRuntime(): void {
    const snapshot = this.runtime?.snapshot();
    if (
      this.runtimeRootCount() !== 1 ||
      !this.inputRegistered ||
      snapshot === undefined ||
      snapshot.missingRendererIds.length !== 0 ||
      snapshot.extraRendererIds.length !== 0 ||
      snapshot.mismatchedRendererIds.length !== 0
    ) {
      throw new Error("TASK_014D2_RUNTIME_OWNERSHIP_INVARIANT_FAILED");
    }
    const counts = this.host?.componentCounts();
    if (counts !== undefined) {
      const uniqueOrders = new Set(counts.sortingOrders);
      if (uniqueOrders.size !== counts.sortingOrders.length ||
          counts.sortingOrders.some((order) =>
            order < TASK014D2_SORTING.vfxMinimum ||
            order > TASK014D2_SORTING.vfxMaximum)) {
        throw new Error("TASK_014D2_SORTING_INVARIANT_FAILED");
      }
    }
    if (
      !task014d2SpatialErrorsWithinTolerance(
        Math.max(
          this.host?.maximumProjectionErrorPx ?? 0,
          this.host?.maximumPositionErrorPx ?? 0,
        ),
        this.host?.maximumRotationErrorDegrees ?? 0,
        this.host?.maximumViewportOverflowPx ?? 0,
      ) ||
      (this.host?.materialBlendMismatches ?? 0) !== 0 ||
      (this.host?.duplicateDestroys ?? 0) !== 0 ||
      (this.host?.visibilityMismatches ?? 0) !== 0
    ) {
      throw new Error("TASK_014D2_SPATIAL_TOLERANCE_FAILED");
    }
  }

  private syncDiagnostics(): void {
    const snapshot = this.runtime?.snapshot();
    this.diagnostics.activeInstances = snapshot?.activeCueKeys.length ?? 0;
    this.diagnostics.activeRenderers = snapshot?.activeRendererCount ?? 0;
    this.diagnostics.pendingRenderers =
      snapshot?.pendingRendererCount ?? 0;
    this.diagnostics.removedRenderers =
      snapshot?.removedRendererCount ?? 0;
    this.diagnostics.missingRenderers =
      snapshot?.missingRendererIds.length ?? 0;
    this.diagnostics.extraRenderers = snapshot?.extraRendererIds.length ?? 0;
    this.diagnostics.mismatchedRenderers =
      snapshot?.mismatchedRendererIds.length ?? 0;
    this.diagnostics.staleRenderers = snapshot?.staleRendererCount ?? 0;
    this.diagnostics.rendererLeaks =
      snapshot?.extraRendererIds.length ?? 0;
    this.diagnostics.duplicateDestroys =
      this.host?.duplicateDestroys ?? 0;
    this.diagnostics.materialBlendChecks =
      this.host?.materialBlendChecks ?? 0;
    this.diagnostics.materialBlendMismatches =
      this.host?.materialBlendMismatches ?? 0;
    this.diagnostics.visibilityMismatches =
      this.host?.visibilityMismatches ?? 0;
    this.diagnostics.runtimeRoots = this.runtimeRootCount();
    this.diagnostics.inputHandlers = this.inputRegistered ? 1 : 0;
    this.diagnostics.activeRecipeBlendSummary =
      this.host?.activeSummary() ?? "none";
    this.diagnostics.maximumPositionErrorPx = Math.max(
      this.host?.maximumProjectionErrorPx ?? 0,
      this.host?.maximumPositionErrorPx ?? 0,
    );
    this.diagnostics.maximumRotationErrorDegrees =
      this.host?.maximumRotationErrorDegrees ?? 0;
    this.diagnostics.maximumAabbOverflowPx =
      this.host?.maximumViewportOverflowPx ?? 0;
  }

  private updateHud(): void {
    if (this.hud === null) return;
    this.hud.string = formatTask014D2Diagnostics(this.diagnostics, {
      ready: this.ready,
      playing: this.playing,
      elapsedSeconds: this.elapsedSeconds,
      stress: this.stress,
      debug: this.debug,
    });
  }

  private runtimeRootCount(): number {
    return this.runtimeRoot === null ? 0 : 1;
  }

  private snapshot(): unknown {
    return {
      generation: this.generation,
      diagnostics: { ...this.diagnostics },
      runtime: this.runtime?.snapshot(),
    };
  }

  private keyName(keyCode: number): string {
    switch (keyCode) {
      case KeyCode.SPACE: return "Space";
      case KeyCode.ESCAPE: return "Escape";
      case KeyCode.DIGIT_1: return "1";
      case KeyCode.DIGIT_2: return "2";
      case KeyCode.DIGIT_3: return "3";
      case KeyCode.DIGIT_4: return "4";
      case KeyCode.KEY_X: return "X";
      case KeyCode.KEY_B: return "B";
      case KeyCode.KEY_D: return "D";
      default: return "";
    }
  }
}
