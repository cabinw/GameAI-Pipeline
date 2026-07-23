import {
  _decorator,
  Component,
  Node,
} from "cc";
import {
  RigAnimationPlayback,
  composeJointPose,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";
import type {
  JointRestPose,
  NormalizedRigAnimation,
  RigAnimationSample,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";

const { ccclass, property } = _decorator;

interface JointBinding {
  readonly node: Node;
  readonly restPose: JointRestPose;
}

/**
 * Runtime-only player for normalized, Main-process-validated animation data.
 * It never parses source contracts and never mutates Visual nodes.
 */
@ccclass("GameAIRigAnimationPlayer")
export class GameAIRigAnimationPlayer extends Component {
  @property
  validatedAnimationJson = "";

  @property
  autoplay = true;

  private animation: NormalizedRigAnimation | null = null;
  private playback: RigAnimationPlayback | null = null;
  private bindings = new Map<string, JointBinding>();
  private initialized = false;

  configure(animation: NormalizedRigAnimation, autoplay: boolean): void {
    this.validatedAnimationJson = JSON.stringify(animation);
    this.autoplay = autoplay;
    this.initialize();
  }

  onLoad(): void {
    this.initialize();
  }

  start(): void {
    if (this.autoplay) this.play();
    else this.reset();
  }

  update(deltaSeconds: number): void {
    if (this.playback?.status !== "playing") return;
    this.apply(this.playback.update(deltaSeconds));
  }

  play(): void {
    this.initialize();
    if (this.playback !== null) this.apply(this.playback.play());
  }

  pause(): void {
    if (this.playback !== null) this.apply(this.playback.pause());
  }

  stop(): void {
    if (this.playback !== null) this.apply(this.playback.stop());
    this.restoreRestPose();
  }

  reset(): void {
    if (this.playback !== null) this.apply(this.playback.reset());
    this.restoreRestPose();
  }

  seek(timeSeconds: number): void {
    this.initialize();
    if (this.playback !== null) this.apply(this.playback.seek(timeSeconds));
  }

  private initialize(): void {
    if (this.initialized || this.validatedAnimationJson.length === 0) return;
    const animation = JSON.parse(this.validatedAnimationJson) as NormalizedRigAnimation;
    const nodes = this.indexNodes(this.node);
    const bindings = new Map<string, JointBinding>();
    for (const jointId of new Set(animation.tracks.map((track) => track.jointId))) {
      const joint = nodes.get(`Joint_${jointId}`);
      if (joint === undefined || joint.name.startsWith("Visual_")) {
        throw new Error(
          `ANIMATION_JOINT_TARGET_MISSING: Joint_${jointId} is not present below ${this.node.name}.`,
        );
      }
      bindings.set(jointId, {
        node: joint,
        restPose: {
          position: { x: joint.position.x, y: joint.position.y },
          rotationDegrees: joint.eulerAngles.z,
          scale: { x: joint.scale.x, y: joint.scale.y },
        },
      });
    }
    this.animation = animation;
    this.playback = new RigAnimationPlayback(animation);
    this.bindings = bindings;
    this.initialized = true;
  }

  private indexNodes(root: Node): ReadonlyMap<string, Node> {
    const nodes = new Map<string, Node>();
    const visit = (node: Node): void => {
      nodes.set(node.name, node);
      for (const child of node.children) visit(child);
    };
    visit(root);
    return nodes;
  }

  private apply(sample: RigAnimationSample): void {
    for (const [jointId, binding] of this.bindings) {
      const pose = composeJointPose(binding.restPose, sample.joints[jointId]);
      binding.node.setPosition(pose.position.x, pose.position.y, binding.node.position.z);
      binding.node.setRotationFromEuler(
        binding.node.eulerAngles.x,
        binding.node.eulerAngles.y,
        pose.rotationDegrees,
      );
      binding.node.setScale(pose.scale.x, pose.scale.y, binding.node.scale.z);
    }
  }

  private restoreRestPose(): void {
    for (const binding of this.bindings.values()) {
      const rest = binding.restPose;
      binding.node.setPosition(rest.position.x, rest.position.y, binding.node.position.z);
      binding.node.setRotationFromEuler(
        binding.node.eulerAngles.x,
        binding.node.eulerAngles.y,
        rest.rotationDegrees,
      );
      binding.node.setScale(rest.scale.x, rest.scale.y, binding.node.scale.z);
    }
  }
}
