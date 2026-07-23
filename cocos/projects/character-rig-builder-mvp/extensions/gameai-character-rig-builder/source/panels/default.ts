import type {
  BuildCharacterRigRequest,
  CharacterRigBuilderEvidence,
} from "../types";

const EXTENSION_NAME = "gameai-character-rig-builder";

interface PanelElements {
  sourceRoot: HTMLInputElement;
  characterRig: HTMLInputElement;
  sourceAnnotation: HTMLInputElement;
  run: HTMLButtonElement;
  status: HTMLElement;
  output: HTMLElement;
}

interface PanelContext {
  $: PanelElements;
}

module.exports = Editor.Panel.define({
  template: `
    <section>
      <h2>Character Rig Builder</h2>
      <p>Validates and generates outside the scene, resolves SpriteFrames through AssetDB, then assembles a scoped rig.</p>
      <label>Source root<input id="source-root" value="assets/gameai/red-cap-target"></label>
      <label>Character Rig<input id="character-rig" value="character-rig.json"></label>
      <label>Source annotation<input id="source-annotation" value="source-annotation.json"></label>
      <button id="run" type="button">Build Red Cap rig</button>
      <p id="status" data-state="idle">Not run</p>
      <pre id="output"></pre>
    </section>
  `,
  style: `
    section { padding: 16px; color: var(--color-normal-contrast); }
    label { display: grid; gap: 4px; margin: 12px 0; font-weight: 600; }
    input { padding: 7px; color: var(--color-normal-contrast); background: var(--color-normal-fill); border: 1px solid var(--color-normal-border); }
    button { padding: 8px 12px; margin-top: 8px; }
    #status[data-state="passed"] { color: var(--color-success-fill); }
    #status[data-state="failed"] { color: var(--color-danger-fill); }
    pre { max-height: 280px; overflow: auto; white-space: pre-wrap; user-select: text; }
  `,
  $: {
    sourceRoot: "#source-root",
    characterRig: "#character-rig",
    sourceAnnotation: "#source-annotation",
    run: "#run",
    status: "#status",
    output: "#output",
  },
  ready(this: PanelContext): void {
    const run = async (): Promise<void> => {
      const request: BuildCharacterRigRequest = {
        correlationId: `task004-${Date.now()}`,
        panelStartedAt: new Date().toISOString(),
        sourceRoot: this.$.sourceRoot.value,
        characterRigFile: this.$.characterRig.value,
        sourceAnnotationFile: this.$.sourceAnnotation.value,
      };
      this.$.run.disabled = true;
      this.$.status.dataset.state = "running";
      this.$.status.textContent = `Validating ${request.correlationId}…`;
      try {
        const evidence = (await Editor.Message.request(
          EXTENSION_NAME,
          "build-character-rig",
          request,
        )) as CharacterRigBuilderEvidence;
        this.$.status.dataset.state = "passed";
        this.$.status.textContent =
          `${evidence.sceneResult.replacement}: ${evidence.manifestPartCount} parts; ` +
          `${evidence.stages.join(" → ")}`;
        this.$.output.textContent = JSON.stringify(evidence, null, 2);
      } catch (error) {
        this.$.status.dataset.state = "failed";
        this.$.status.textContent = "Build failed without partial scene mutation";
        this.$.output.textContent =
          error instanceof Error ? error.stack ?? error.message : String(error);
      } finally {
        this.$.run.disabled = false;
      }
    };
    this.$.run.addEventListener("click", run);
  },
});
