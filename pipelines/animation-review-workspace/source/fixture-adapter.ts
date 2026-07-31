import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  applyAnimationReviewPatch,
  decideAnimationReviewHumanRule,
  decideAnimationReviewPatch,
  editAnimationReviewPatch,
  exactResetAnimationReviewSession,
  previewAnimationReviewPatch,
  proposeAnimationReviewPatch,
  redoAnimationReviewSession,
  resolveAnimationReviewFindingInSession,
  runAnimationReviewAssistant,
  serializeAnimationReviewSession,
  undoAnimationReviewSession,
  createAnimationReviewSession,
  createAnimationReviewHumanFinding,
  createAnimationReviewHumanRule,
  serializeAnimationReviewDocument,
  type AnimationReviewAdapterRequest,
  type AnimationReviewAdapterSnapshot,
  type AnimationReviewDocument,
  type AnimationReviewOverlay,
  type AnimationReviewOverlayPrimitive,
  type AnimationReviewHumanRuleDecisionInput,
  type AnimationReviewHumanFindingInput,
  type AnimationReviewHumanRuleCreateInput,
  type AnimationReviewPatchActionInput,
  type AnimationReviewPatchDecisionInput,
  type AnimationReviewPatchDocument,
  type AnimationReviewPatchEditInput,
  type AnimationReviewRevisionInput,
  type AnimationReviewSessionDocument,
  type ReviewDecisionInput,
} from "@gameai/animation-review-core";
import {
  parseCharacterRig,
  parseRigLayout,
  type CharacterRig,
  type RigLayout,
} from "@gameai/character-contracts";
import {
  evaluateRigPose,
  multiplyAffineTransforms,
  normalizeRigAnimation,
  parseRigAnimation,
  sampleRigAnimation,
  transformPoint,
  type NormalizedRigAnimation,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";

export const STANDALONE_RED_CAP_ADAPTER_ID =
  "standalone-red-cap-production-v1" as const;
export const STANDALONE_CLIP_IDS = ["rest", "idle", "walk", "wave"] as const;
type StandaloneClipId = (typeof STANDALONE_CLIP_IDS)[number];

const OVERLAYS: readonly AnimationReviewOverlay[] = [
  "skeleton",
  "pivots",
  "sockets",
  "hit-areas",
  "attachments",
];
const COMMANDS: readonly AnimationReviewAdapterRequest["command"][] = [
  "describe",
  "observe-playback",
  "select-clip",
  "play",
  "pause",
  "seek",
  "step",
  "set-rate",
  "set-loop",
  "set-overlay",
  "exact-reset",
];

function inside(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return (
    local === "" ||
    (local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local))
  );
}

function workspaceError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function encodeAssetPath(file: string): string {
  return `/assets/${file.split("/").map(encodeURIComponent).join("/")}`;
}

function sha256(values: readonly string[]): string {
  const hash = createHash("sha256");
  for (const value of values) hash.update(value);
  return hash.digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export interface RedCapFixtureAdapterOptions {
  readonly fixtureRoot: string;
  readonly nowMilliseconds?: () => number;
  readonly createdAt?: string;
  readonly restoredSessions?: readonly AnimationReviewSessionDocument[];
}

export interface ReviewMutationResult {
  readonly session: AnimationReviewSessionDocument;
  readonly review: AnimationReviewDocument;
  readonly snapshot: AnimationReviewAdapterSnapshot;
}

export class RedCapFixtureAdapter {
  readonly adapterId = STANDALONE_RED_CAP_ADAPTER_ID;
  readonly fixtureRoot: string;
  readonly declaredAssets: ReadonlySet<string>;
  readonly sourceRevision: string;
  readonly #character: CharacterRig;
  readonly #layout: RigLayout;
  readonly #clips: Readonly<Record<StandaloneClipId, NormalizedRigAnimation>>;
  readonly #originalTexts: Readonly<Record<StandaloneClipId, string>>;
  readonly #hierarchy: readonly RigHierarchyJoint[];
  readonly #nowMilliseconds: () => number;
  readonly #createdAt: string;
  readonly #rigJointIds: readonly string[];
  readonly #sessions: Record<StandaloneClipId, AnimationReviewSessionDocument>;
  #revision = 0;
  #clipId: StandaloneClipId = "rest";
  #status: "playing" | "paused" | "stopped" = "stopped";
  #time = 0;
  #rate = 1;
  #loop = true;
  #lastClock = 0;
  #overlays: Record<AnimationReviewOverlay, boolean> = {
    skeleton: false,
    pivots: false,
    sockets: false,
    "hit-areas": false,
    attachments: false,
  };

  private constructor(input: {
    fixtureRoot: string;
    character: CharacterRig;
    layout: RigLayout;
    clips: Readonly<Record<StandaloneClipId, NormalizedRigAnimation>>;
    originalTexts: Readonly<Record<StandaloneClipId, string>>;
    sourceRevision: string;
    nowMilliseconds: () => number;
    createdAt: string;
  }) {
    this.fixtureRoot = input.fixtureRoot;
    this.#character = input.character;
    this.#layout = input.layout;
    this.#clips = input.clips;
    this.#originalTexts = input.originalTexts;
    this.sourceRevision = input.sourceRevision;
    this.#nowMilliseconds = input.nowMilliseconds;
    this.#createdAt = input.createdAt;
    this.#rigJointIds = Object.freeze(
      this.#layout.parts.map((part) => part.partId),
    );
    this.#hierarchy = Object.freeze(
      this.#layout.parts.map((part) =>
        Object.freeze({
          jointId: part.partId,
          parentId: part.parentId,
          restPose: Object.freeze({
            position: Object.freeze({ ...part.restPose.position }),
            rotationDegrees: part.restPose.rotationDegrees,
            scale: Object.freeze({ ...part.restPose.scale }),
          }),
        }),
      ),
    );
    this.declaredAssets = new Set(
      this.#layout.parts.map((part) => part.file),
    );
    this.#sessions = Object.fromEntries(
      STANDALONE_CLIP_IDS.map((clipId) => [
        clipId,
        createAnimationReviewSession({
          sessionId: `red-cap-production-v1-${clipId}`,
          sourceRevision: this.sourceRevision,
          characterId: this.#character.characterId,
          activeClipId: clipId,
          animation: this.#clips[clipId],
          rigJointIds: this.#rigJointIds,
          parts: this.#layout.parts.map((part) => ({
            partId: part.partId,
            drawOrder: part.drawOrder,
          })),
          createdAt: this.#createdAt,
          actorId: "workspace-validator",
        }),
      ]),
    ) as Record<StandaloneClipId, AnimationReviewSessionDocument>;
    this.#loop = this.#clips.rest.loop;
  }

  static async load(
    options: RedCapFixtureAdapterOptions,
  ): Promise<RedCapFixtureAdapter> {
    const fixtureRoot = await realpath(resolve(options.fixtureRoot));
    if (
      `${fixtureRoot.split(sep).join("/")}/`.includes(
        "/artifacts/experimental/",
      )
    ) {
      throw workspaceError(
        "WORKSPACE_EXPERIMENTAL_ROOT_FORBIDDEN",
        "Local Experimental Assets cannot be selected by the review workspace.",
      );
    }
    const characterText = await readFile(
      resolve(fixtureRoot, "character-rig.json"),
      "utf8",
    );
    const layoutText = await readFile(
      resolve(fixtureRoot, "rig-layout.json"),
      "utf8",
    );
    const character = parseCharacterRig(characterText);
    const layout = parseRigLayout(layoutText);
    if (!character.ok || !layout.ok) {
      throw workspaceError(
        "WORKSPACE_FIXTURE_CONTRACT_INVALID",
        "Selected fixture failed Character Rig or Rig Layout validation.",
      );
    }
    const jointIds = new Set(layout.value.parts.map((part) => part.partId));
    const textEntries = await Promise.all(
      STANDALONE_CLIP_IDS.map(async (clipId) => [
        clipId,
        await readFile(
          resolve(fixtureRoot, "animations", `${clipId}.json`),
          "utf8",
        ),
      ] as const),
    );
    const originalTexts = Object.fromEntries(textEntries) as Record<
      StandaloneClipId,
      string
    >;
    const normalizedEntries = textEntries.map(([clipId, text]) => {
      const parsed = parseRigAnimation(text, {
        rigId: layout.value.layoutId,
        rigSchemaVersion: layout.value.schemaVersion,
        jointIds,
      });
      if (!parsed.ok) {
        throw workspaceError(
          "WORKSPACE_FIXTURE_ANIMATION_INVALID",
          `Animation ${clipId} failed Rig Animation validation.`,
        );
      }
      return [clipId, normalizeRigAnimation(parsed.value)] as const;
    });
    const clips = Object.fromEntries(normalizedEntries) as Record<
      StandaloneClipId,
      NormalizedRigAnimation
    >;
    for (const part of layout.value.parts) {
      await resolveDeclaredAsset(fixtureRoot, new Set([part.file]), part.file);
    }
    const adapter = new RedCapFixtureAdapter({
      fixtureRoot,
      character: character.value,
      layout: layout.value,
      clips,
      originalTexts,
      sourceRevision: sha256([
        characterText,
        layoutText,
        ...textEntries.map((entry) => entry[1]),
      ]),
      nowMilliseconds: options.nowMilliseconds ?? Date.now,
      createdAt: options.createdAt ?? new Date().toISOString(),
    });
    if (options.restoredSessions !== undefined) {
      adapter.restoreSessions(options.restoredSessions);
    }
    return adapter;
  }

  execute(request: AnimationReviewAdapterRequest): AnimationReviewAdapterSnapshot {
    this.#advanceClock();
    if (request.adapterId !== this.adapterId) {
      throw workspaceError(
        "WORKSPACE_ADAPTER_ID_MISMATCH",
        `Expected adapter ${this.adapterId}.`,
      );
    }
    if (
      request.expectedRevision !== undefined &&
      request.expectedRevision !== this.#revision
    ) {
      throw workspaceError(
        "WORKSPACE_STALE_ADAPTER_REVISION",
        `Expected adapter revision ${request.expectedRevision}, received ${this.#revision}.`,
      );
    }
    switch (request.command) {
      case "describe":
      case "observe-playback":
        break;
      case "select-clip": {
        const clipId = request.payload.clipId as StandaloneClipId;
        if (!STANDALONE_CLIP_IDS.includes(clipId)) {
          throw workspaceError(
            "WORKSPACE_CLIP_NOT_FOUND",
            `Unknown fixture clip ${String(request.payload.clipId)}.`,
          );
        }
        this.#clipId = clipId;
        this.#time = 0;
        this.#status = "playing";
        this.#loop = this.#clips[clipId].loop;
        this.#touch();
        break;
      }
      case "play":
        this.#status = "playing";
        this.#lastClock = this.#nowMilliseconds();
        this.#touch();
        break;
      case "pause":
        this.#status = "paused";
        this.#touch();
        break;
      case "seek":
        this.#time = this.#boundedTime(request.payload.time!);
        this.#status = "paused";
        this.#touch();
        break;
      case "step":
        this.#time = this.#boundedTime(
          this.#time +
            request.payload.deltaFrames! / request.payload.frameRate!,
        );
        this.#status = "paused";
        this.#touch();
        break;
      case "set-rate":
        this.#rate = request.payload.rate!;
        this.#touch();
        break;
      case "set-loop":
        this.#loop = request.payload.loop!;
        this.#time = this.#boundedTime(this.#time);
        this.#touch();
        break;
      case "set-overlay":
        this.#overlays[request.payload.overlay!] = request.payload.enabled!;
        this.#touch();
        break;
      case "exact-reset":
        this.#status = "stopped";
        this.#time = 0;
        this.#rate = 1;
        this.#loop = this.#clips[this.#clipId].loop;
        for (const overlay of OVERLAYS) this.#overlays[overlay] = false;
        this.#touch();
        break;
    }
    return this.snapshot();
  }

  snapshot(): AnimationReviewAdapterSnapshot {
    this.#advanceClock();
    const presentation = this.presentationState();
    const animation = presentation.animation;
    const effectiveAnimation = Object.freeze({
      ...animation,
      loop: this.#loop,
    });
    const pose = evaluateRigPose(
      this.#hierarchy,
      sampleRigAnimation(effectiveAnimation, this.#time),
    );
    const presentationParts = new Map(
      presentation.parts.map((part) => [part.partId, part]),
    );
    const parts = this.#layout.parts.map((part) => {
      const joint = pose.joints[part.partId]!;
      const presentationPart = presentationParts.get(part.partId)!;
      const width = part.originalRect.width * this.#layout.referenceScale;
      const height = part.originalRect.height * this.#layout.referenceScale;
      const anchor = { x: part.anchor.x, y: 1 - part.anchor.y };
      const visualOffset = {
        x: (0.5 - anchor.x) * width,
        y: (0.5 - anchor.y) * height,
      };
      return {
        partId: part.partId,
        parentId: part.parentId,
        assetUrl: encodeAssetPath(part.file),
        drawOrder: presentationPart.drawOrder,
        width,
        height,
        anchor,
        visualOffset,
        worldTransform: multiplyAffineTransforms(joint.worldTransform, {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          tx: visualOffset.x + presentationPart.pivotOffset.x,
          ty: visualOffset.y + presentationPart.pivotOffset.y,
        }),
      };
    });
    return {
      adapterId: this.adapterId,
      adapterRevision: this.#revision,
      characterId: this.#character.characterId,
      rigId: this.#layout.layoutId,
      playback: {
        status: this.#status,
        time: this.#time,
        duration: animation.duration,
        rate: this.#rate,
        loop: this.#loop,
        clipId: this.#clipId,
        availableClipIds: STANDALONE_CLIP_IDS,
      },
      capabilities: COMMANDS.map((command) => ({
        command,
        available: true,
      })),
      overlays: { ...this.#overlays },
      parts,
      joints: this.#layout.parts.map((part) => ({
        jointId: part.partId,
        parentId: part.parentId,
        worldPivot: { ...pose.joints[part.partId]!.worldPivot },
      })),
      timeline: animation.tracks.map((track) => ({
        jointId: track.jointId,
        property: track.property,
        keyframes: track.keyframes.map((keyframe) => ({
          time: keyframe.time,
          value:
            typeof keyframe.value === "number"
              ? keyframe.value
              : { ...keyframe.value },
        })),
      })),
      overlayPrimitives: this.#overlayPrimitives(pose.joints),
      runtimeDiagnostics: {
        fixture: "red-cap-production-v1",
        sourceRevision: this.sourceRevision,
        declaredAssetCount: this.declaredAssets.size,
        hierarchyJointCount: this.#hierarchy.length,
        sessionId: this.sessionDocument().sessionId,
        sessionRevision: this.sessionDocument().revision,
        previewPatchId: this.sessionDocument().preview?.patchId ?? "none",
        authority: this.sessionDocument().preview === null ? "source-or-applied" : "preview",
        playbackObservation: "lightweight-observe-playback",
        persistenceBoundary: "local-review-service",
        sourceReadOnly: true,
      },
    };
  }

  reviewDocument(): AnimationReviewDocument {
    return this.sessionDocument().review;
  }

  sessionDocument(): AnimationReviewSessionDocument {
    return this.#sessions[this.#clipId];
  }

  sessionDocuments(): readonly AnimationReviewSessionDocument[] {
    return STANDALONE_CLIP_IDS.map((clipId) => this.#sessions[clipId]);
  }

  restoreSessions(
    sessions: readonly AnimationReviewSessionDocument[],
  ): void {
    let active: AnimationReviewSessionDocument | undefined;
    for (const session of sessions) {
      const clipId = session.activeClipId as StandaloneClipId;
      if (
        !STANDALONE_CLIP_IDS.includes(clipId) ||
        session.characterId !== this.#character.characterId ||
        session.rigId !== this.#layout.layoutId ||
        session.sourceRevision !== this.sourceRevision ||
        session.authoritativeState.animation.animationId !==
          this.#clips[clipId].animationId
      ) {
        throw workspaceError(
          "WORKSPACE_SESSION_SOURCE_MISMATCH",
          `Session ${session.sessionId} does not match the accepted fixture source.`,
        );
      }
      this.#sessions[clipId] = session;
      if (
        active === undefined ||
        session.updatedAt > active.updatedAt ||
        (session.updatedAt === active.updatedAt &&
          session.revision > active.revision)
      ) {
        active = session;
      }
    }
    if (active === undefined) return;
    this.#clipId = active.activeClipId as StandaloneClipId;
    this.#loop = this.#clips[this.#clipId].loop;
    this.#time = 0;
    this.#status = "stopped";
  }

  currentAnimation(): NormalizedRigAnimation {
    return this.presentationState().animation;
  }

  authoritativeAnimation(): NormalizedRigAnimation {
    return this.sessionDocument().authoritativeState.animation;
  }

  presentationState(): AnimationReviewSessionDocument["authoritativeState"] {
    const session = this.sessionDocument();
    return session.preview?.state ?? session.authoritativeState;
  }

  originalAnimationText(): string {
    return this.#originalTexts[this.#clipId];
  }

  runAssistant(input: {
    readonly expectedRevision: number;
    readonly actorId: string;
    readonly createdAt: string;
  }): ReviewMutationResult {
    return this.#commitSession(
      runAnimationReviewAssistant(
        this.sessionDocument(),
        this.#rigJointIds,
        input,
      ),
    );
  }

  proposePatch(patch: AnimationReviewPatchDocument): ReviewMutationResult {
    return this.#commitSession(
      proposeAnimationReviewPatch(this.sessionDocument(), patch),
    );
  }

  decidePatch(input: AnimationReviewPatchDecisionInput): ReviewMutationResult {
    return this.#commitSession(
      decideAnimationReviewPatch(this.sessionDocument(), input),
    );
  }

  editPatch(input: AnimationReviewPatchEditInput): ReviewMutationResult {
    return this.#commitSession(
      editAnimationReviewPatch(this.sessionDocument(), input),
    );
  }

  previewPatch(input: AnimationReviewPatchActionInput): ReviewMutationResult {
    return this.#commitSession(
      previewAnimationReviewPatch(this.sessionDocument(), input),
    );
  }

  applyPatch(input: AnimationReviewPatchActionInput): ReviewMutationResult {
    return this.#commitSession(
      applyAnimationReviewPatch(
        this.sessionDocument(),
        this.#rigJointIds,
        input,
      ),
    );
  }

  undo(input: AnimationReviewRevisionInput): ReviewMutationResult {
    return this.#commitSession(
      undoAnimationReviewSession(this.sessionDocument(), input),
    );
  }

  redo(input: AnimationReviewRevisionInput): ReviewMutationResult {
    return this.#commitSession(
      redoAnimationReviewSession(this.sessionDocument(), input),
    );
  }

  decideHumanRule(
    input: AnimationReviewHumanRuleDecisionInput,
  ): ReviewMutationResult {
    return this.#commitSession(
      decideAnimationReviewHumanRule(this.sessionDocument(), input),
    );
  }

  createHumanFinding(
    input: AnimationReviewHumanFindingInput,
  ): ReviewMutationResult {
    return this.#commitSession(
      createAnimationReviewHumanFinding(this.sessionDocument(), input),
    );
  }

  createHumanRule(
    input: AnimationReviewHumanRuleCreateInput,
  ): ReviewMutationResult {
    return this.#commitSession(
      createAnimationReviewHumanRule(this.sessionDocument(), input),
    );
  }

  resolveFinding(input: ReviewDecisionInput): ReviewMutationResult {
    return this.#commitSession(
      resolveAnimationReviewFindingInSession(this.sessionDocument(), input),
    );
  }

  resetSession(input: AnimationReviewRevisionInput): ReviewMutationResult {
    return this.#commitSession(
      exactResetAnimationReviewSession(
        this.sessionDocument(),
        this.#rigJointIds,
        input,
      ),
    );
  }

  exportBundle(): unknown {
    const review = this.reviewDocument();
    const session = this.sessionDocument();
    const proposedAnimation = this.authoritativeAnimation();
    const originalText = this.originalAnimationText();
    return {
      exportVersion: "1.0.0",
      source: {
        fixtureId: "red-cap-production-v1",
        animationId: review.subject.animationId,
        sourceRevision: this.sourceRevision,
        sourceReadOnly: true,
      },
      adapter: {
        adapterId: this.adapterId,
        adapterRevision: this.#revision,
        reviewId: review.reviewId,
        reviewRevision: review.revision,
        clipId: this.#clipId,
      },
      review,
      session,
      originalAnimation: JSON.parse(originalText) as unknown,
      proposedAnimation,
      manifest: {
        algorithm: "sha256",
        reviewSha256: sha256([serializeAnimationReviewDocument(review)]),
        sessionSha256: sha256([serializeAnimationReviewSession(session)]),
        originalAnimationSha256: sha256([originalText]),
        proposedAnimationSha256: sha256([canonicalJson(proposedAnimation)]),
      },
    };
  }

  #commitSession(
    session: AnimationReviewSessionDocument,
  ): ReviewMutationResult {
    this.#sessions[this.#clipId] = session;
    this.#time = this.#boundedTime(this.#time);
    this.#touch();
    return {
      session,
      review: session.review,
      snapshot: this.snapshot(),
    };
  }

  #touch(): void {
    this.#revision += 1;
    this.#lastClock = this.#nowMilliseconds();
  }

  #boundedTime(value: number): number {
    const duration = this.currentAnimation().duration;
    const nonnegative = Math.max(0, value);
    return this.#loop
      ? nonnegative % duration
      : Math.min(nonnegative, duration);
  }

  #advanceClock(): void {
    const now = this.#nowMilliseconds();
    if (this.#status === "playing") {
      const elapsed = Math.max(0, (now - this.#lastClock) / 1000);
      this.#time += elapsed * this.#rate;
      const duration = this.currentAnimation().duration;
      if (this.#loop) {
        this.#time %= duration;
      } else if (this.#time >= duration) {
        this.#time = duration;
        this.#status = "stopped";
      }
    }
    this.#lastClock = now;
  }

  #overlayPrimitives(
    joints: ReturnType<typeof evaluateRigPose>["joints"],
  ): readonly AnimationReviewOverlayPrimitive[] {
    const primitives: AnimationReviewOverlayPrimitive[] = [];
    for (const part of this.#layout.parts) {
      const child = joints[part.partId]!;
      primitives.push({
        primitiveId: `pivot-${part.partId}`,
        overlay: "pivots",
        shape: "point",
        label: part.partId,
        x: child.worldPivot.x,
        y: child.worldPivot.y,
        radius: 3,
      });
      if (part.parentId !== null) {
        const parent = joints[part.parentId]!;
        primitives.push({
          primitiveId: `bone-${part.parentId}-${part.partId}`,
          overlay: "skeleton",
          shape: "line",
          label: `${part.parentId} to ${part.partId}`,
          x: parent.worldPivot.x,
          y: parent.worldPivot.y,
          x2: child.worldPivot.x,
          y2: child.worldPivot.y,
        });
      }
    }
    for (const socket of this.#layout.sockets ?? []) {
      const parent = joints[socket.parentPartId]!;
      const point = transformPoint(parent.worldTransform, socket.position);
      primitives.push({
        primitiveId: `socket-${socket.socketId}`,
        overlay: "sockets",
        shape: "circle",
        label: socket.socketId,
        x: point.x,
        y: point.y,
        radius: 6,
      });
    }
    for (const area of this.#layout.hitAreas ?? []) {
      const parent = joints[area.parentPartId]!;
      if (area.shape.type === "circle") {
        const point = transformPoint(parent.worldTransform, {
          x: area.shape.x,
          y: area.shape.y,
        });
        primitives.push({
          primitiveId: `hit-${area.hitAreaId}`,
          overlay: "hit-areas",
          shape: "circle",
          label: area.hitAreaId,
          x: point.x,
          y: point.y,
          radius: area.shape.radius * this.#layout.referenceScale,
        });
      } else {
        const point = transformPoint(parent.worldTransform, {
          x: area.shape.x,
          y: area.shape.y,
        });
        primitives.push({
          primitiveId: `hit-${area.hitAreaId}`,
          overlay: "hit-areas",
          shape: "rect",
          label: area.hitAreaId,
          x: point.x,
          y: point.y,
          width: area.shape.width * this.#layout.referenceScale,
          height: area.shape.height * this.#layout.referenceScale,
        });
      }
    }
    for (const id of ["bandana", "cap", "pouch"]) {
      const joint = joints[id];
      if (joint) {
        primitives.push({
          primitiveId: `attachment-${id}`,
          overlay: "attachments",
          shape: "circle",
          label: id,
          x: joint.worldPivot.x,
          y: joint.worldPivot.y,
          radius: 10,
        });
      }
    }
    return Object.freeze(primitives);
  }
}

export async function resolveDeclaredAsset(
  fixtureRoot: string,
  allowlist: ReadonlySet<string>,
  requestedPath: string,
): Promise<string> {
  if (
    requestedPath.length === 0 ||
    requestedPath.includes("\0") ||
    isAbsolute(requestedPath) ||
    requestedPath.split("/").includes("..") ||
    !allowlist.has(requestedPath)
  ) {
    throw workspaceError(
      "WORKSPACE_ASSET_NOT_DECLARED",
      "Asset path is not declared by the selected fixture.",
    );
  }
  const root = await realpath(resolve(fixtureRoot));
  const candidate = resolve(root, requestedPath);
  if (!inside(root, candidate)) {
    throw workspaceError(
      "WORKSPACE_ASSET_OUTSIDE_FIXTURE",
      "Asset path escaped the selected fixture root.",
    );
  }
  const resolved = await realpath(candidate);
  if (!inside(root, resolved)) {
    throw workspaceError(
      "WORKSPACE_ASSET_OUTSIDE_FIXTURE",
      "Asset symlink escaped the selected fixture root.",
    );
  }
  if (!(await stat(resolved)).isFile()) {
    throw workspaceError(
      "WORKSPACE_ASSET_NOT_FILE",
      "Declared asset is not a regular file.",
    );
  }
  return resolved;
}
