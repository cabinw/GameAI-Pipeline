import type { SpikeEvidence, SpikeRequest } from "../message-chain";

const EXTENSION_NAME = "gameai-task000-spike";

interface PanelElements {
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
      <h2>TASK-000 message-chain spike</h2>
      <p>Runs Panel → main process → Scene Script with one correlation ID.</p>
      <button id="run" type="button">Run message spike</button>
      <p id="status" data-state="idle">Not run</p>
      <pre id="output"></pre>
    </section>
  `,
  style: `
    section { padding: 16px; color: var(--color-normal-contrast); }
    button { padding: 8px 12px; }
    #status[data-state="passed"] { color: var(--color-success-fill); }
    #status[data-state="failed"] { color: var(--color-danger-fill); }
    pre { white-space: pre-wrap; user-select: text; }
  `,
  $: {
    run: "#run",
    status: "#status",
    output: "#output",
  },
  ready(this: PanelContext): void {
    const runSpike = async (): Promise<void> => {
      const request: SpikeRequest = {
        correlationId: `task000-${Date.now()}`,
        panelStartedAt: new Date().toISOString(),
      };
      this.$.status.dataset.state = "running";
      this.$.status.textContent = `Running ${request.correlationId}…`;

      try {
        const evidence = (await Editor.Message.request(
          EXTENSION_NAME,
          "run-spike",
          request,
        )) as SpikeEvidence;
        this.$.status.dataset.state = evidence.status;
        this.$.status.textContent = `Passed: ${evidence.stages.join(" → ")}`;
        this.$.output.textContent = JSON.stringify(evidence, null, 2);
      } catch (error) {
        this.$.status.dataset.state = "failed";
        this.$.status.textContent = "Failed";
        this.$.output.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
      }
    };

    this.$.run.addEventListener("click", runSpike);
    void runSpike();
  },
});
