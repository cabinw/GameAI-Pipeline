import {
  _decorator,
  Component,
  EventKeyboard,
  input,
  Input,
  KeyCode,
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import { RED_CAP_PRODUCTION_STATIC_PLAN } from "./red-cap-production-static-data";

const { ccclass, property } = _decorator;
type PartPlan = (typeof RED_CAP_PRODUCTION_STATIC_PLAN.parts)[number];

const FAILURE_POINTS = [
  "before-resource-completion",
  "after-resource-completion",
  "after-root-publication",
  "after-input-publication",
  "after-target-publication",
  "after-renderer-creation",
  "after-sorting2d-attachment",
  "during-rebuild-detachment",
  "during-dispose-finalization",
] as const;
type FailurePoint = (typeof FAILURE_POINTS)[number];

@ccclass("RedCapProductionStaticHarness")
export class RedCapProductionStaticHarness extends Component {
  @property
  atlasFrame: SpriteFrame | null = null;

  @property
  failurePoint = "";

  @property
  transformStress = false;

  private generation = 0;
  private runtimeRoot: Node | null = null;
  private recoveryInputPublished = false;
  private inputPublished = false;
  private rendererFrames: SpriteFrame[] = [];
  private targets = new Map<string, Node>();
  private lastPrimaryError = "";
  private cleanupErrors: string[] = [];

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onRecoveryKeyDown, this);
    this.recoveryInputPublished = true;
    this.rebuild();
  }

  onDisable(): void {
    this.unpublishRecoveryInput();
    this.disposeRuntime(false);
  }

  onDestroy(): void {
    this.unpublishRecoveryInput();
    this.disposeRuntime(true);
  }

  rebuild(): void {
    const generation = ++this.generation;
    this.lastPrimaryError = "";
    try {
      this.disposeRuntime(false, true);
      this.fail("before-resource-completion");
      const atlasFrame = this.atlasFrame;
      if (!atlasFrame) {
        throw new Error("PROGRAM015_STATIC_RESOURCE: missing atlas");
      }
      if (generation !== this.generation) return;
      this.fail("after-resource-completion");
      this.publishRuntime(atlasFrame);
    } catch (cause) {
      this.failBuild(cause);
    }
  }

  exactReset(): void {
    this.failurePoint = "";
    this.transformStress = false;
    this.rebuild();
  }

  private publishRuntime(atlasFrame: SpriteFrame): void {
    const root = new Node(RED_CAP_PRODUCTION_STATIC_PLAN.rootName);
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.setPosition(0, -20, 0);
    this.runtimeRoot = root;
    this.fail("after-root-publication");

    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputPublished = true;
    this.fail("after-input-publication");

    const joints = this.createJointHierarchy(root);
    this.targets = joints;
    this.fail("after-target-publication");

    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      this.createPart(joints.get(part.jointId)!, part, atlasFrame);
    }
    this.fail("after-renderer-creation");
    this.fail("after-sorting2d-attachment");
    this.applyStress();
    console.info(
      "PROGRAM015_STATIC_READY",
      JSON.stringify({
        root: root.name,
        targets: this.targets.size,
        renderers: this.rendererFrames.length,
        failurePoint: this.failurePoint,
      }),
    );
  }

  private createJointHierarchy(parent: Node): Map<string, Node> {
    const joints = new Map<string, Node>();
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const joint = new Node(`JNT_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const joint = joints.get(part.jointId)!;
      joint.setParent(
        part.parentId === null ? parent : joints.get(part.parentId)!,
      );
      joint.setPosition(
        part.restPose.position.x,
        part.restPose.position.y,
        0,
      );
      joint.setRotationFromEuler(0, 0, part.restPose.rotationDegrees);
      joint.setScale(part.restPose.scale.x, part.restPose.scale.y, 1);
    }
    return joints;
  }

  private createPart(
    parent: Node,
    part: PartPlan,
    atlasFrame: SpriteFrame,
  ): void {
    const frame = new SpriteFrame();
    const mutableFrame = frame as SpriteFrame & {
      texture: unknown;
      rect: { x: number; y: number; width: number; height: number };
      originalSize: { width: number; height: number };
      offset: { x: number; y: number };
      rotated: boolean;
      destroy(): void;
    };
    const sourceFrame = atlasFrame as SpriteFrame & { texture: unknown };
    mutableFrame.texture = sourceFrame.texture;
    mutableFrame.rect = {
      x: part.atlasRect.x,
      y: part.atlasRect.y,
      width: part.atlasRect.width,
      height: part.atlasRect.height,
    };
    mutableFrame.originalSize = {
      width: part.atlasRect.width,
      height: part.atlasRect.height,
    };
    mutableFrame.offset = { x: 0, y: 0 };
    mutableFrame.rotated = false;
    this.rendererFrames.push(frame);

    const visual = new Node(`SPR_${part.jointId}`);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(parent);
    visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
    visual
      .addComponent(UITransform)
      .setContentSize(part.visualSize.width, part.visualSize.height);
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    visual.addComponent(Sorting2D).sortingOrder = 100 + part.drawOrder;
  }

  private onKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.KEY_T) {
      this.transformStress = !this.transformStress;
      this.applyStress();
    } else if (event.keyCode === KeyCode.KEY_B) {
      this.rebuild();
    }
  }

  private onRecoveryKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.KEY_R) {
      this.exactReset();
    } else if (event.keyCode === KeyCode.KEY_G) {
      this.cycleFault();
    }
  }

  private unpublishRecoveryInput(): void {
    if (!this.recoveryInputPublished) return;
    input.off(Input.EventType.KEY_DOWN, this.onRecoveryKeyDown, this);
    this.recoveryInputPublished = false;
  }

  private cycleFault(): void {
    const currentIndex = FAILURE_POINTS.indexOf(
      this.failurePoint as FailurePoint,
    );
    const nextIndex = currentIndex + 1;
    this.failurePoint =
      nextIndex >= FAILURE_POINTS.length ? "" : FAILURE_POINTS[nextIndex];
    console.info(
      "PROGRAM015_STATIC_FAULT_SELECTED",
      this.failurePoint || "none",
    );
    if (this.failurePoint === "during-dispose-finalization") {
      this.disposeRuntime(true);
      this.failurePoint = "";
    }
    this.rebuild();
  }

  private applyStress(): void {
    const rotations: Record<string, number> = this.transformStress
      ? {
          "upper-arm-right": 12,
          "forearm-right": 12,
          "hand-right": 8,
          "upper-arm-left": -12,
          "forearm-left": -12,
          "hand-left": -8,
          "thigh-right": 8,
          "shin-right": 8,
          "foot-right": 6,
          "thigh-left": -8,
          "shin-left": -8,
          "foot-left": -6,
        }
      : {};
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      this.targets
        .get(part.jointId)
        ?.setRotationFromEuler(0, 0, rotations[part.jointId] ?? 0);
    }
  }

  private disposeRuntime(finalizing: boolean, rebuilding = false): void {
    const cleanupErrors: string[] = [];
    const attempt = (step: string, action: () => void): void => {
      try {
        action();
      } catch (cause) {
        cleanupErrors.push(
          `${step}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    };
    if (rebuilding) {
      attempt("rebuild-detachment", () => {
        this.fail("during-rebuild-detachment");
      });
    }
    if (this.inputPublished) {
      attempt("input", () => {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.inputPublished = false;
      });
    }
    attempt("targets", () => this.targets.clear());
    attempt("root", () => {
      this.runtimeRoot?.destroy();
      this.runtimeRoot = null;
    });
    attempt("renderers", () => {
      for (const frame of this.rendererFrames) {
        (frame as SpriteFrame & { destroy(): void }).destroy();
      }
      this.rendererFrames = [];
    });
    if (finalizing) {
      attempt("dispose-finalization", () => {
        this.fail("during-dispose-finalization");
      });
    }
    this.cleanupErrors = cleanupErrors;
    if (cleanupErrors.length > 0) {
      console.error(
        "PROGRAM015_STATIC_CLEANUP_ERRORS",
        JSON.stringify({
          primary: this.lastPrimaryError,
          cleanup: cleanupErrors,
        }),
      );
    }
  }

  private fail(point: FailurePoint): void {
    if (this.failurePoint === point) {
      throw new Error(`PROGRAM015_STATIC_INJECTED:${point}`);
    }
  }

  private failBuild(cause: unknown): void {
    this.lastPrimaryError =
      cause instanceof Error ? cause.message : String(cause);
    this.disposeRuntime(false);
    console.error(
      "PROGRAM015_STATIC_BUILD_FAILED",
      JSON.stringify({
        primary: this.lastPrimaryError,
        cleanup: this.cleanupErrors,
      }),
    );
  }
}

export const RED_CAP_PRODUCTION_STATIC_FAILURE_POINTS = FAILURE_POINTS;
