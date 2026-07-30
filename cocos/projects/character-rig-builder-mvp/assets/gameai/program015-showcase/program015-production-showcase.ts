import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  HorizontalTextAlignment,
  input,
  Input,
  KeyCode,
  Label,
  Layers,
  Node,
  resources,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import {
  compileCocosVfxRenderDescriptors,
  type CocosVfxResourceRecipe,
} from "../task014d2/cocos-vfx-render-descriptor";
import { CocosVfxRuntimeState } from "../task014d2/cocos-vfx-runtime-state";
import {
  CocosRenderPlanHost,
  type CocosResourceRealization,
} from "../task014d2/task014d2-cocos-vfx-render-plan-adapter";
import {
  PROGRAM015_SHOWCASE_CHARACTER_BOUNDS,
  PROGRAM015_SHOWCASE_LAYOUT,
  PROGRAM015_SHOWCASE_RENDER_PLAN,
  PROGRAM015_SHOWCASE_RESOURCES,
} from "./program015-showcase-data";

const { ccclass } = _decorator;

const RESOURCE_PATHS = {
  background: "program015-showcase/training-ground-background/spriteFrame",
  productionLite: "program015-showcase/production-lite-character/spriteFrame",
  redCap: "program015-showcase/red-cap-character/spriteFrame",
  vfxSoftMask: "program015-showcase/vfx-soft-mask/spriteFrame",
} as const;

type SequenceStage = "hold" | "dust" | "trail" | "aura" | "final";

@ccclass("Program015ProductionShowcase")
export class Program015ProductionShowcase extends Component {
  private runtimeRoot: Node | null = null;
  private vfxHost: CocosRenderPlanHost | null = null;
  private vfxRuntime: CocosVfxRuntimeState | null = null;
  private targets = new Map<string, Node>();
  private redCapRoot: Node | null = null;
  private productionLiteRoot: Node | null = null;
  private hud: Label | null = null;
  private generation = 0;
  private elapsed = 0;
  private paused = false;
  private stressed = false;
  private debug = false;
  private stage: SequenceStage = "hold";
  private commandCounter = 0;

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    void this.rebuild();
  }

  update(deltaSeconds: number): void {
    if (this.paused || this.vfxRuntime === null) return;
    this.elapsed += deltaSeconds;
    this.animateCharacters();
    this.vfxRuntime.tick(deltaSeconds);
    this.advanceSequence();
  }

  onDisable(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.disposeRuntime("dispose");
  }

  private async rebuild(): Promise<void> {
    const generation = ++this.generation;
    this.disposeRuntime("rebuild");
    this.elapsed = 0;
    this.paused = false;
    this.stressed = false;
    this.debug = false;
    this.stage = "hold";
    const frames = await Promise.all([
      loadSpriteFrame(RESOURCE_PATHS.background),
      loadSpriteFrame(RESOURCE_PATHS.productionLite),
      loadSpriteFrame(RESOURCE_PATHS.redCap),
      loadSpriteFrame(RESOURCE_PATHS.vfxSoftMask),
    ]);
    if (
      generation !== this.generation ||
      !this.enabled ||
      !this.node.activeInHierarchy
    ) return;
    this.buildRuntime(frames[0], frames[1], frames[2], frames[3]);
    this.publish("READY");
    console.info(
      `PROGRAM015_SHOWCASE_READY generation=${generation} ` +
      "targets=showcase.production-lite,showcase.red-cap D1/D2=READY",
    );
  }

  private buildRuntime(
    backgroundFrame: SpriteFrame,
    productionLiteFrame: SpriteFrame,
    redCapFrame: SpriteFrame,
    vfxSoftMaskFrame: SpriteFrame,
  ): void {
    const root = new Node("PROGRAM015_Showcase_Runtime");
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.addComponent(UITransform).setContentSize(1280, 720);
    this.runtimeRoot = root;

    createSprite(
      root,
      "LicensedTrainingGround",
      backgroundFrame,
      1280,
      720,
      0,
      0,
      -10000,
    );

    const production = createCharacter(
      root,
      "CHR_showcase_production_lite",
      productionLiteFrame,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.width,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.height,
      PROGRAM015_SHOWCASE_LAYOUT.characters[0].centerX - 640,
      360 - PROGRAM015_SHOWCASE_LAYOUT.characters[0].footY +
        PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.height / 2,
      -1500,
    );
    const redCap = createCharacter(
      root,
      "CHR_showcase_red_cap",
      redCapFrame,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.redCap.width,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.redCap.height,
      PROGRAM015_SHOWCASE_LAYOUT.characters[1].centerX - 640,
      360 - PROGRAM015_SHOWCASE_LAYOUT.characters[1].footY +
        PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.redCap.height / 2,
      -500,
    );
    this.productionLiteRoot = production;
    this.redCapRoot = redCap;

    this.addTarget(production, "showcase.production-lite.left-foot", -32, -170);
    this.addTarget(production, "showcase.production-lite.body-center", 0, 0);
    this.addTarget(redCap, "showcase.red-cap.left-grip", 96, 45);
    this.addTarget(redCap, "showcase.red-cap.right-grip", -96, 45);
    this.addTarget(redCap, "showcase.red-cap.torso", 0, 55);

    const compiled = compileCocosVfxRenderDescriptors(
      PROGRAM015_SHOWCASE_RENDER_PLAN,
      PROGRAM015_SHOWCASE_RESOURCES as readonly CocosVfxResourceRecipe[],
    );
    if (!compiled.ok) {
      throw new Error(
        `PROGRAM015_SHOWCASE_DESCRIPTOR_FAILURE:${JSON.stringify(compiled.errors)}`,
      );
    }
    const resourcesById = new Map<string, CocosResourceRealization>(
      PROGRAM015_SHOWCASE_RESOURCES.map((resource) => [
        resource.resourceId,
        {
          resourceId: resource.resourceId,
          recipeKind: resource.recipeKind,
          spriteFrame: resource.recipeKind === "textured-sprite"
            ? vfxSoftMaskFrame
            : null,
        },
      ]),
    );
    this.vfxHost = new CocosRenderPlanHost(
      root,
      (targetId) => this.targets.get(targetId),
      new Map(compiled.value.cues.map((cue, index) => [cue.cueId, index])),
      resourcesById,
      () => {},
    );
    this.vfxHost.verifyMaterialBlendGate(vfxSoftMaskFrame);
    this.vfxRuntime = new CocosVfxRuntimeState(compiled.value, this.vfxHost);
    this.createHud(root);
  }

  private addTarget(parent: Node, targetId: string, x: number, y: number): void {
    const target = new Node(targetId);
    target.layer = Layers.Enum.UI_2D;
    target.setParent(parent);
    target.setPosition(x, y, 0);
    target.addComponent(UITransform).setContentSize(8, 8);
    this.targets.set(targetId, target);
  }

  private createHud(root: Node): void {
    const node = new Node("PROGRAM015_HUD");
    node.layer = Layers.Enum.UI_2D;
    node.setParent(root);
    node.setPosition(0, 320, 0);
    node.addComponent(UITransform).setContentSize(1180, 40);
    const label = node.addComponent(Label);
    label.fontSize = 18;
    label.lineHeight = 24;
    label.color = new Color(255, 248, 220, 255);
    label.horizontalAlign = HorizontalTextAlignment.LEFT;
    this.hud = label;
  }

  private advanceSequence(): void {
    if (this.stage === "hold" && this.elapsed >= 1) {
      this.emitDust();
      this.stage = "dust";
      this.publish("DUST");
    } else if (this.stage === "dust" && this.elapsed >= 2.25) {
      this.startTrail();
      this.stage = "trail";
      this.publish("TRAIL");
    } else if (this.stage === "trail" && this.elapsed >= 4) {
      this.stopTrail();
      this.stage = "aura";
    } else if (this.stage === "aura" && this.elapsed >= 4.5) {
      this.startAura();
      this.stage = "final";
      this.publish("AURA");
    }
  }

  private emitDust(): void {
    this.vfxRuntime?.dispatch({
      command: "emit",
      cueId: "program015-dust",
      commandId: `program015-dust-${++this.commandCounter}`,
      targetId: "showcase.production-lite.left-foot",
    });
  }

  private startTrail(): void {
    this.vfxRuntime?.dispatch({
      command: "start",
      cueId: "program015-trail",
      commandId: `program015-trail-${++this.commandCounter}`,
      instanceId: "program015.trail.active",
      targetId: "showcase.red-cap.left-grip",
    });
  }

  private stopTrail(): void {
    const snapshot = this.vfxRuntime?.snapshot();
    if (snapshot?.activeCueKeys.includes("program015.trail.active")) {
      this.vfxRuntime?.dispatch({
        command: "stop",
        instanceId: "program015.trail.active",
        reason: "semantic-stop",
      });
    }
  }

  private startAura(): void {
    const snapshot = this.vfxRuntime?.snapshot();
    if (!snapshot?.activeCueKeys.includes("program015.aura.active")) {
      this.vfxRuntime?.dispatch({
        command: "start",
        cueId: "program015-aura",
        commandId: `program015-aura-${++this.commandCounter}`,
        instanceId: "program015.aura.active",
        targetId: "showcase.red-cap.torso",
      });
    }
  }

  private animateCharacters(): void {
    const production = this.productionLiteRoot;
    const redCap = this.redCapRoot;
    if (production === null || redCap === null) return;
    const stress = this.stressed ? 1.2 : 1;
    production.setScale(stress, 1 / stress, 1);
    redCap.setScale(1 / stress, stress, 1);
    production.setRotationFromEuler(0, 0, Math.sin(this.elapsed * 2.2) * 1.2);
    redCap.setRotationFromEuler(
      0,
      0,
      Math.sin(this.elapsed * 1.7 + 0.7) * 1.5,
    );
    const grip = this.targets.get("showcase.red-cap.left-grip");
    grip?.setPosition(
      96 + Math.sin(this.elapsed * 4) * 32,
      45 + Math.cos(this.elapsed * 4) * 26,
      0,
    );
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.vfxRuntime?.setPaused(this.paused);
    this.publish(this.paused ? "PAUSED" : "RESUMED");
  }

  private exactReset(): void {
    if (this.vfxRuntime === null) return;
    this.vfxRuntime.rebuild();
    this.elapsed = 0;
    this.paused = false;
    this.stressed = false;
    this.debug = false;
    this.stage = "hold";
    this.productionLiteRoot?.setScale(1, 1, 1);
    this.redCapRoot?.setScale(1, 1, 1);
    this.productionLiteRoot?.setRotationFromEuler(0, 0, 0);
    this.redCapRoot?.setRotationFromEuler(0, 0, 0);
    this.targets.get("showcase.red-cap.left-grip")?.setPosition(96, 45, 0);
    this.publish("RESET");
    console.info("PROGRAM015_SHOWCASE_EXACT_RESET active=0 stale=0");
  }

  private onKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.DIGIT_1) {
      this.emitDust();
      this.publish("DUST");
    } else if (event.keyCode === KeyCode.DIGIT_2) {
      this.startTrail();
      this.publish("TRAIL");
    } else if (event.keyCode === KeyCode.DIGIT_3) {
      this.startAura();
      this.publish("AURA");
    }
    else if (event.keyCode === KeyCode.SPACE) this.togglePause();
    else if (event.keyCode === KeyCode.KEY_T) {
      this.stressed = !this.stressed;
      this.publish(this.stressed ? "STRESS" : "NORMAL");
    } else if (event.keyCode === KeyCode.KEY_B) void this.rebuild();
    else if (event.keyCode === KeyCode.KEY_D) {
      this.debug = !this.debug;
      this.vfxHost?.setDebug(this.debug);
      this.publish(this.debug ? "DEBUG" : "DEBUG_OFF");
    } else if (event.keyCode === KeyCode.KEY_R) this.exactReset();
  }

  private publish(action: string): void {
    const snapshot = this.vfxRuntime?.snapshot();
    if (this.hud !== null) {
      this.hud.string =
        `PROGRAM-015 · ${action} · ${this.stage.toUpperCase()} · ` +
        `active=${snapshot?.activeRendererCount ?? 0} · ` +
        "1 Dust  2 Trail  3 Aura  Space Pause  T Stress  B Rebuild  R Reset";
    }
    console.info(
      `PROGRAM015_SHOWCASE_${action} stage=${this.stage} ` +
      `active=${snapshot?.activeRendererCount ?? 0} ` +
      `stale=${snapshot?.staleRendererCount ?? 0}`,
    );
  }

  private disposeRuntime(reason: "dispose" | "rebuild"): void {
    this.vfxRuntime?.cleanup(reason);
    this.vfxRuntime = null;
    this.vfxHost = null;
    this.targets.clear();
    this.productionLiteRoot = null;
    this.redCapRoot = null;
    this.hud = null;
    this.runtimeRoot?.destroy();
    this.runtimeRoot = null;
  }
}

function loadSpriteFrame(resourcePath: string): Promise<SpriteFrame> {
  return new Promise((resolve, reject) => {
    resources.load(resourcePath, SpriteFrame, (error, frame) => {
      if (error) reject(error);
      else if (frame === null) {
        reject(new Error(`PROGRAM015_RESOURCE_NULL:${resourcePath}`));
      } else resolve(frame);
    });
  });
}

function createSprite(
  parent: Node,
  name: string,
  frame: SpriteFrame,
  width: number,
  height: number,
  x: number,
  y: number,
  sortingOrder: number,
): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  node.setPosition(x, y, 0);
  node.addComponent(UITransform).setContentSize(width, height);
  const sprite = node.addComponent(Sprite);
  sprite.spriteFrame = frame;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  node.addComponent(Sorting2D).sortingOrder = sortingOrder;
  return node;
}

function createCharacter(
  parent: Node,
  name: string,
  frame: SpriteFrame,
  width: number,
  height: number,
  x: number,
  y: number,
  sortingOrder: number,
): Node {
  return createSprite(
    parent,
    name,
    frame,
    width,
    height,
    x,
    y,
    sortingOrder,
  );
}
