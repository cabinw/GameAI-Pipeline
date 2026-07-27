import type {
  CharacterSemanticEvent,
  EvaluatedSemanticEvent,
  StartedSemanticEvent,
} from "@gameai/character-semantic-events";

import {
  SemanticVfxAdapterError,
  SemanticVfxAdapterErrorCode,
} from "./semantic-vfx-diagnostics.js";
import {
  SEMANTIC_VFX_CUE_REGISTRY,
  type SemanticVfxCueRendererDefinition,
  type SemanticVfxRendererKind,
} from "./semantic-vfx-cue-registry.js";
import { semanticVfxSortingOrder } from "./semantic-vfx-sorting.js";

export interface SemanticVfxPose {
  readonly position: Readonly<{ x: number; y: number }>;
  readonly rotation: SemanticVfxQuaternion;
  readonly scale: Readonly<{ x: number; y: number }>;
}

export interface SemanticVfxQuaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface SemanticVfxRotationComposition {
  readonly socketWorld: SemanticVfxQuaternion;
  readonly localZDegrees: number;
}

export interface ResolvedSemanticVfxPose {
  readonly position: Readonly<{ x: number; y: number }>;
  readonly rotation: SemanticVfxRotationComposition;
  readonly scale: Readonly<{ x: number; y: number }>;
}

export interface SemanticVfxRendererRequest {
  readonly rendererId: string;
  readonly rendererKind: SemanticVfxRendererKind;
  readonly cueDefinitionId: string;
  readonly instanceId?: string;
  readonly sortingOrder: number;
  readonly lifecycle: CharacterSemanticEvent["lifecycle"];
}

export interface SemanticVfxRendererUpdate {
  readonly pose: ResolvedSemanticVfxPose;
  readonly elapsedSeconds: number;
  readonly normalizedAge: number;
}

export interface SemanticVfxSortedGraphicsConstructionHost<
  TRenderer,
  TGraphics extends TRenderer,
  TSorting,
> {
  currentRenderer(): TRenderer | null;
  renderers(): readonly TRenderer[];
  sortings(): readonly TSorting[];
  addGraphics(): TGraphics;
  addSorting(): TSorting;
  configureSorting(
    sorting: TSorting,
    sortingLayer: number,
    sortingOrder: number,
  ): void;
  destroyPartial(): void;
}

export interface SemanticVfxSortedGraphicsComponents<
  TGraphics,
  TSorting,
> {
  readonly graphics: TGraphics;
  readonly sorting: TSorting;
}

export function createSortedGraphicsRenderer<
  TRenderer,
  TGraphics extends TRenderer,
  TSorting,
>(
  host: SemanticVfxSortedGraphicsConstructionHost<
    TRenderer,
    TGraphics,
    TSorting
  >,
  sortingLayer: number,
  sortingOrder: number,
): SemanticVfxSortedGraphicsComponents<TGraphics, TSorting> {
  try {
    if (host.currentRenderer() !== null) {
      throw renderableComponentConflict(
        "Semantic VFX renderer node must be clean before Graphics creation.",
      );
    }
    const graphics = host.addGraphics();
    if (
      host.currentRenderer() !== graphics ||
      host.renderers().length !== 1
    ) {
      throw renderableComponentConflict(
        "Graphics must be the only UIRenderer after creation.",
      );
    }
    const sorting = host.addSorting();
    host.configureSorting(sorting, sortingLayer, sortingOrder);
    if (
      host.currentRenderer() !== graphics ||
      host.renderers().length !== 1 ||
      host.sortings().length !== 1
    ) {
      throw renderableComponentConflict(
        "Sorting2D must reuse one existing Graphics renderer.",
      );
    }
    return Object.freeze({ graphics, sorting });
  } catch (error) {
    host.destroyPartial();
    if (error instanceof SemanticVfxAdapterError) throw error;
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.RENDERER_FAILURE,
      error instanceof Error
        ? error.message
        : "Sorted Graphics construction failed.",
    );
  }
}

export interface SemanticVfxHost {
  resolveSocket(socketId: string): SemanticVfxPose | undefined;
  createRenderer(request: SemanticVfxRendererRequest): void;
  updateRenderer(
    rendererId: string,
    update: SemanticVfxRendererUpdate,
  ): void;
  destroyRenderer(rendererId: string, reason: string): void;
  activeRendererCount(): number;
}

function renderableComponentConflict(
  message: string,
): SemanticVfxAdapterError {
  return new SemanticVfxAdapterError(
    SemanticVfxAdapterErrorCode.RENDERABLE_COMPONENT_CONFLICT,
    message,
  );
}

interface ActiveRenderer {
  readonly rendererId: string;
  readonly event: CharacterSemanticEvent;
  readonly cue: SemanticVfxCueRendererDefinition;
  readonly instanceId?: string;
  readonly durationSeconds?: number;
  readonly capturedSocket: SemanticVfxPose;
  elapsedSeconds: number;
}

export interface SemanticVfxAdapterSnapshot {
  readonly emitCount: number;
  readonly startCount: number;
  readonly stopCount: number;
  readonly audioCount: number;
  readonly gameplayCount: number;
  readonly duplicateStartCount: number;
  readonly unknownStopCount: number;
  readonly activeInstanceIds: readonly string[];
  readonly activeOneShotCount: number;
  readonly leakedInstanceCount: number;
  readonly lastCommand: string;
}

export class SemanticVfxAdapter {
  private readonly cueById: ReadonlyMap<
    string,
    SemanticVfxCueRendererDefinition
  >;
  private readonly activeInstances = new Map<string, ActiveRenderer>();
  private readonly oneShots = new Map<string, ActiveRenderer>();
  private emitCount = 0;
  private startCount = 0;
  private stopCount = 0;
  private audioCount = 0;
  private gameplayCount = 0;
  private duplicateStartCount = 0;
  private unknownStopCount = 0;
  private lastCommand = "none";

  constructor(
    private readonly host: SemanticVfxHost,
    cueRegistry: readonly SemanticVfxCueRendererDefinition[] =
      SEMANTIC_VFX_CUE_REGISTRY,
  ) {
    this.cueById = new Map(
      cueRegistry.map((cue) => [cue.cueDefinitionId, cue] as const),
    );
  }

  dispatch(command: EvaluatedSemanticEvent): void {
    this.lastCommand = `${command.command}:${command.trackId}:${command.eventId}:${command.cycle}`;
    if (command.command === "stop") {
      this.stopCount += 1;
      const active = this.activeInstances.get(command.instanceId);
      if (active === undefined) {
        this.unknownStopCount += 1;
        throw new SemanticVfxAdapterError(
          SemanticVfxAdapterErrorCode.UNKNOWN_STOP,
          `Unknown semantic VFX stop ${command.instanceId}.`,
        );
      }
      this.host.destroyRenderer(active.rendererId, command.reason);
      this.activeInstances.delete(command.instanceId);
      return;
    }

    if (command.eventKind === "audio") {
      this.audioCount += 1;
      return;
    }
    if (command.eventKind === "gameplay") {
      this.gameplayCount += 1;
      return;
    }
    if (command.eventKind !== "vfx") {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.UNSUPPORTED_EVENT_KIND,
        `Unsupported semantic event kind ${String(command.eventKind)}.`,
      );
    }
    if (command.payload.kind !== "vfx") {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.INVALID_COMMAND,
        `VFX command ${command.eventId} has a non-VFX payload.`,
      );
    }

    const cue = this.cueById.get(command.payload.cueDefinitionId);
    if (cue === undefined) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.UNKNOWN_CUE,
        `Unknown semantic VFX cue ${command.payload.cueDefinitionId}.`,
      );
    }
    const capturedSocket = this.requireSocket(command);

    if (command.command === "emit") {
      this.emitCount += 1;
      const rendererId = `emit:${command.trackId}:${command.eventId}:${command.cycle}`;
      const active: ActiveRenderer = {
        rendererId,
        event: command,
        cue,
        capturedSocket,
        elapsedSeconds: 0,
        durationSeconds:
          command.durationSeconds ?? cue.defaultDurationSeconds,
      };
      this.create(active);
      this.oneShots.set(rendererId, active);
      return;
    }

    this.start(command, cue, capturedSocket);
  }

  tick(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.INVALID_DELTA,
        "Semantic VFX adapter delta must be finite and non-negative.",
      );
    }
    for (const active of [
      ...this.activeInstances.values(),
      ...this.oneShots.values(),
    ]) {
      active.elapsedSeconds += deltaSeconds;
      this.update(active);
    }
    for (const [rendererId, active] of this.oneShots) {
      if (
        active.durationSeconds !== undefined &&
        active.elapsedSeconds >= active.durationSeconds
      ) {
        this.host.destroyRenderer(rendererId, "one-shot-complete");
        this.oneShots.delete(rendererId);
      }
    }
  }

  cleanup(reason: "exact-reset" | "track-switch" | "dispose" | "rebuild"): void {
    for (const active of [
      ...this.activeInstances.values(),
      ...this.oneShots.values(),
    ].sort((left, right) => left.rendererId.localeCompare(right.rendererId))) {
      this.host.destroyRenderer(active.rendererId, reason);
    }
    this.activeInstances.clear();
    this.oneShots.clear();
  }

  snapshot(): SemanticVfxAdapterSnapshot {
    const expected =
      this.activeInstances.size + this.oneShots.size;
    return Object.freeze({
      emitCount: this.emitCount,
      startCount: this.startCount,
      stopCount: this.stopCount,
      audioCount: this.audioCount,
      gameplayCount: this.gameplayCount,
      duplicateStartCount: this.duplicateStartCount,
      unknownStopCount: this.unknownStopCount,
      activeInstanceIds: Object.freeze(
        [...this.activeInstances.keys()].sort(),
      ),
      activeOneShotCount: this.oneShots.size,
      leakedInstanceCount: Math.max(
        0,
        this.host.activeRendererCount() - expected,
      ),
      lastCommand: this.lastCommand,
    });
  }

  private start(
    command: StartedSemanticEvent,
    cue: SemanticVfxCueRendererDefinition,
    capturedSocket: SemanticVfxPose,
  ): void {
    this.startCount += 1;
    if (this.activeInstances.has(command.instanceId)) {
      this.duplicateStartCount += 1;
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.DUPLICATE_START,
        `Duplicate semantic VFX start ${command.instanceId}.`,
      );
    }
    const active: ActiveRenderer = {
      rendererId: `instance:${command.instanceId}`,
      instanceId: command.instanceId,
      event: command,
      cue,
      capturedSocket,
      elapsedSeconds: 0,
      ...(command.durationSeconds === undefined
        ? {}
        : { durationSeconds: command.durationSeconds }),
    };
    this.create(active);
    this.activeInstances.set(command.instanceId, active);
  }

  private create(active: ActiveRenderer): void {
    try {
      this.host.createRenderer({
        rendererId: active.rendererId,
        rendererKind: active.cue.rendererKind,
        cueDefinitionId: active.cue.cueDefinitionId,
        ...(active.instanceId === undefined
          ? {}
          : { instanceId: active.instanceId }),
        sortingOrder: semanticVfxSortingOrder(active.event.layerRole),
        lifecycle: active.event.lifecycle,
      });
      this.update(active);
    } catch (error) {
      this.host.destroyRenderer(active.rendererId, "partial-failure");
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.RENDERER_FAILURE,
        error instanceof Error ? error.message : "Renderer creation failed.",
      );
    }
  }

  private update(active: ActiveRenderer): void {
    const socketId = active.event.socketId;
    if (socketId === undefined) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.SOCKET_REQUIRED,
        `Semantic VFX event ${active.event.eventId} requires a socket.`,
      );
    }
    const socket = active.event.followPolicy.position ||
        active.event.followPolicy.rotation ||
        active.event.followPolicy.scale
      ? this.host.resolveSocket(socketId)
      : active.capturedSocket;
    if (socket === undefined) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.UNKNOWN_SOCKET,
        `Unknown runtime semantic VFX socket ${socketId}.`,
      );
    }
    const duration =
      active.durationSeconds ?? active.cue.defaultDurationSeconds;
    this.host.updateRenderer(active.rendererId, {
      pose: resolveSemanticVfxPose(
        socket,
        active.capturedSocket,
        active.event.localTransform,
        active.event.followPolicy,
      ),
      elapsedSeconds: active.elapsedSeconds,
      normalizedAge:
        active.event.lifecycle === "persistent"
          ? active.elapsedSeconds % 1
          : Math.min(1, active.elapsedSeconds / duration),
    });
  }

  private requireSocket(command: CharacterSemanticEvent): SemanticVfxPose {
    if (command.socketId === undefined) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.SOCKET_REQUIRED,
        `Semantic VFX event ${command.eventId} requires a socket.`,
      );
    }
    const socket = this.host.resolveSocket(command.socketId);
    if (socket === undefined) {
      throw new SemanticVfxAdapterError(
        SemanticVfxAdapterErrorCode.UNKNOWN_SOCKET,
        `Unknown runtime semantic VFX socket ${command.socketId}.`,
      );
    }
    validateSocketPose(socket);
    return cloneSocketPose(socket);
  }
}

export function resolveSemanticVfxPose(
  currentSocket: SemanticVfxPose,
  capturedSocket: SemanticVfxPose,
  local: CharacterSemanticEvent["localTransform"],
  follow: CharacterSemanticEvent["followPolicy"],
): ResolvedSemanticVfxPose {
  validateSocketPose(currentSocket);
  validateSocketPose(capturedSocket);
  const positionSocket = follow.position ? currentSocket : capturedSocket;
  const rotationSocket = follow.rotation ? currentSocket : capturedSocket;
  const scaleSocket = follow.scale ? currentSocket : capturedSocket;
  const localX = local.position.x * positionSocket.scale.x;
  const localY = local.position.y * positionSocket.scale.y;
  const rotated = rotateVector2(
    localX,
    localY,
    positionSocket.rotation,
  );
  const position = Object.freeze({
    x: positionSocket.position.x + rotated.x,
    y: positionSocket.position.y + rotated.y,
  });
  const scale = Object.freeze({
    x: local.scale.x * scaleSocket.scale.x,
    y: local.scale.y * scaleSocket.scale.y,
  });
  const rotation = Object.freeze({
    socketWorld: normalizeQuaternion(rotationSocket.rotation),
    localZDegrees: local.rotationDegrees,
  });
  const composedRotation = composeSemanticVfxRotation(rotation);
  if (
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    !Number.isFinite(scale.x) ||
    !Number.isFinite(scale.y) ||
    !Object.values(composedRotation).every(Number.isFinite)
  ) {
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.INVALID_COMPOSED_TRANSFORM,
      "Semantic VFX composed transform must be finite.",
    );
  }
  return Object.freeze({
    position,
    rotation,
    scale,
  });
}

export function composeSemanticVfxRotation(
  rotation: SemanticVfxRotationComposition,
): SemanticVfxQuaternion {
  if (!Number.isFinite(rotation.localZDegrees)) {
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.INVALID_COMPOSED_TRANSFORM,
      "Semantic VFX authored local rotation must be finite.",
    );
  }
  const socket = normalizeQuaternion(rotation.socketWorld);
  const halfRadians = (rotation.localZDegrees * Math.PI) / 360;
  const local = {
    x: 0,
    y: 0,
    z: Math.sin(halfRadians),
    w: Math.cos(halfRadians),
  };
  return normalizeQuaternion({
    x:
      socket.w * local.x +
      socket.x * local.w +
      socket.y * local.z -
      socket.z * local.y,
    y:
      socket.w * local.y -
      socket.x * local.z +
      socket.y * local.w +
      socket.z * local.x,
    z:
      socket.w * local.z +
      socket.x * local.y -
      socket.y * local.x +
      socket.z * local.w,
    w:
      socket.w * local.w -
      socket.x * local.x -
      socket.y * local.y -
      socket.z * local.z,
  });
}

function validateSocketPose(socket: SemanticVfxPose): void {
  if (
    !Number.isFinite(socket.position.x) ||
    !Number.isFinite(socket.position.y) ||
    !Number.isFinite(socket.scale.x) ||
    !Number.isFinite(socket.scale.y)
  ) {
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.INVALID_SOCKET_TRANSFORM,
      "Semantic VFX socket position and scale must be finite.",
    );
  }
  normalizeQuaternion(socket.rotation);
}

function normalizeQuaternion(
  value: SemanticVfxQuaternion,
): SemanticVfxQuaternion {
  if (
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.z) ||
    !Number.isFinite(value.w)
  ) {
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.INVALID_SOCKET_TRANSFORM,
      "Semantic VFX socket quaternion must be finite.",
    );
  }
  const length = Math.hypot(value.x, value.y, value.z, value.w);
  if (!Number.isFinite(length) || length <= 1e-12) {
    throw new SemanticVfxAdapterError(
      SemanticVfxAdapterErrorCode.INVALID_SOCKET_TRANSFORM,
      "Semantic VFX socket quaternion must have a normalizable rotation.",
    );
  }
  return Object.freeze({
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length,
  });
}

function rotateVector2(
  x: number,
  y: number,
  rotation: SemanticVfxQuaternion,
): Readonly<{ x: number; y: number }> {
  const q = normalizeQuaternion(rotation);
  return Object.freeze({
    x:
      (1 - 2 * (q.y * q.y + q.z * q.z)) * x +
      2 * (q.x * q.y - q.z * q.w) * y,
    y:
      2 * (q.x * q.y + q.z * q.w) * x +
      (1 - 2 * (q.x * q.x + q.z * q.z)) * y,
  });
}

function cloneSocketPose(socket: SemanticVfxPose): SemanticVfxPose {
  return Object.freeze({
    position: Object.freeze({
      x: socket.position.x,
      y: socket.position.y,
    }),
    rotation: normalizeQuaternion(socket.rotation),
    scale: Object.freeze({
      x: socket.scale.x,
      y: socket.scale.y,
    }),
  });
}
