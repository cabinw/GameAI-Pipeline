import type {
  AnimationReviewAdapterCommand,
  AnimationReviewAdapterPayload,
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
  AnimationReviewAdapterSnapshot,
  AnimationReviewOverlay,
} from "@gameai/animation-review-core";

export const ANIMATION_REVIEW_UI_PROTOCOL_VERSION = "1.0.0" as const;

export interface AnimationReviewTransport {
  request(
    request: AnimationReviewAdapterRequest,
  ): Promise<AnimationReviewAdapterResponse>;
}

export interface AnimationReviewWorkspaceState {
  readonly connection: "connecting" | "connected" | "failed";
  readonly busy: boolean;
  readonly snapshot: AnimationReviewAdapterSnapshot | null;
  readonly error: string | null;
}

export interface AnimationReviewWorkspaceOptions {
  readonly adapterId: string;
  readonly transport: AnimationReviewTransport;
  readonly nextRequestId?: () => string;
}

export interface AnimationReviewMountOptions
  extends AnimationReviewWorkspaceOptions {
  readonly compact?: boolean;
}

type StateListener = (state: AnimationReviewWorkspaceState) => void;

function defaultRequestId(): string {
  return `review-ui-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isMutation(command: AnimationReviewAdapterCommand): boolean {
  return command !== "describe";
}

export class AnimationReviewWorkspaceController {
  readonly #adapterId: string;
  readonly #transport: AnimationReviewTransport;
  readonly #nextRequestId: () => string;
  readonly #listeners = new Set<StateListener>();
  #state: AnimationReviewWorkspaceState = Object.freeze({
    connection: "connecting",
    busy: false,
    snapshot: null,
    error: null,
  });

  constructor(options: AnimationReviewWorkspaceOptions) {
    this.#adapterId = options.adapterId;
    this.#transport = options.transport;
    this.#nextRequestId = options.nextRequestId ?? defaultRequestId;
  }

  get state(): AnimationReviewWorkspaceState {
    return this.#state;
  }

  subscribe(listener: StateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  async refresh(): Promise<AnimationReviewWorkspaceState> {
    return this.dispatch("describe", {});
  }

  async dispatch(
    command: AnimationReviewAdapterCommand,
    payload: AnimationReviewAdapterPayload,
  ): Promise<AnimationReviewWorkspaceState> {
    const requestId = this.#nextRequestId();
    const expectedRevision =
      isMutation(command) && this.#state.snapshot !== null
        ? this.#state.snapshot.adapterRevision
        : undefined;
    const request: AnimationReviewAdapterRequest = {
      kind: "request",
      protocolVersion: ANIMATION_REVIEW_UI_PROTOCOL_VERSION,
      requestId,
      adapterId: this.#adapterId,
      command,
      payload,
      ...(expectedRevision === undefined ? {} : { expectedRevision }),
    };
    this.#setState({ ...this.#state, busy: true, error: null });
    try {
      const response = await this.#transport.request(request);
      if (
        response.requestId !== requestId ||
        response.adapterId !== this.#adapterId
      ) {
        throw new Error("Adapter response correlation failed.");
      }
      if (!response.ok) {
        throw new Error(`${response.error.code}: ${response.error.message}`);
      }
      this.#setState({
        connection: "connected",
        busy: false,
        snapshot: response.snapshot,
        error: null,
      });
    } catch (error) {
      this.#setState({
        ...this.#state,
        connection: "failed",
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this.#state;
  }

  #setState(state: AnimationReviewWorkspaceState): void {
    this.#state = Object.freeze(state);
    for (const listener of this.#listeners) listener(this.#state);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fixed(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function selected(value: string, current: string): string {
  return value === current ? " selected" : "";
}

function checked(value: boolean): string {
  return value ? " checked" : "";
}

const OVERLAYS: readonly AnimationReviewOverlay[] = [
  "skeleton",
  "pivots",
  "sockets",
  "hit-areas",
  "attachments",
];

export function renderAnimationReviewWorkspaceMarkup(
  state: AnimationReviewWorkspaceState,
  compact = false,
): string {
  const snapshot = state.snapshot;
  const disabled = state.busy || snapshot === null ? " disabled" : "";
  const status =
    state.error ??
    (snapshot === null
      ? "Connecting to animation runtime…"
      : `${snapshot.characterId} · ${snapshot.playback.clipId} · revision ${snapshot.adapterRevision}`);
  if (snapshot === null) {
    return `
      <div class="arw ${compact ? "arw--compact" : ""}">
        <header><h2>Animation Review</h2><span data-connection="${state.connection}">${escapeHtml(status)}</span></header>
        <button type="button" data-command="describe"${state.busy ? " disabled" : ""}>Retry connection</button>
      </div>
    `;
  }

  const playback = snapshot.playback;
  const clips = playback.availableClipIds
    .map(
      (clipId) =>
        `<option value="${escapeHtml(clipId)}"${selected(clipId, playback.clipId)}>${escapeHtml(clipId)}</option>`,
    )
    .join("");
  const overlayControls = OVERLAYS.map(
    (overlay) => `
      <label class="arw__toggle">
        <input type="checkbox" data-overlay="${overlay}"${checked(snapshot.overlays[overlay])}${disabled}>
        ${escapeHtml(overlay)}
      </label>`,
  ).join("");
  const hierarchy = snapshot.parts
    .map(
      (part) =>
        `<li><code>${escapeHtml(part.partId)}</code><span>${escapeHtml(part.parentId ?? "root")}</span></li>`,
    )
    .join("");
  const output = escapeHtml(
    JSON.stringify(
      {
        adapterId: snapshot.adapterId,
        adapterRevision: snapshot.adapterRevision,
        playback: snapshot.playback,
        runtimeDiagnostics: snapshot.runtimeDiagnostics,
      },
      null,
      2,
    ),
  );

  return `
    <div class="arw ${compact ? "arw--compact" : ""}">
      <header>
        <div><p class="arw__eyebrow">AI + Human workspace</p><h2>Animation Review</h2></div>
        <button type="button" data-command="describe"${state.busy ? " disabled" : ""}>Refresh</button>
      </header>
      <p class="arw__status" data-connection="${state.connection}">${escapeHtml(status)}</p>
      <section class="arw__card" aria-label="Playback controls">
        <label>Clip<select data-clip${disabled}>${clips}</select></label>
        <div class="arw__transport">
          <button type="button" data-command="play"${disabled}>Play</button>
          <button type="button" data-command="pause"${disabled}>Pause</button>
          <button type="button" data-step="-1"${disabled}>−1f</button>
          <button type="button" data-step="1"${disabled}>+1f</button>
          <button type="button" data-command="exact-reset"${disabled}>Exact reset</button>
        </div>
        <label class="arw__timeline">
          <span>Time ${fixed(playback.time)} / ${fixed(playback.duration)}</span>
          <input type="range" min="0" max="${playback.duration}" step="0.001" value="${Math.min(playback.time, playback.duration)}" data-seek${disabled}>
        </label>
        <div class="arw__settings">
          <label>Rate
            <select data-rate${disabled}>
              ${[0.25, 0.5, 1, 1.5, 2].map((rate) => `<option value="${rate}"${selected(String(rate), String(playback.rate))}>${rate}×</option>`).join("")}
            </select>
          </label>
          <label class="arw__toggle"><input type="checkbox" data-loop${checked(playback.loop)}${disabled}> loop</label>
          <span class="arw__badge">${playback.status}</span>
        </div>
      </section>
      <section class="arw__card" aria-label="Runtime overlays">
        <h3>Overlays</h3><div class="arw__overlays">${overlayControls}</div>
      </section>
      <section class="arw__card arw__structure" aria-label="Character structure">
        <h3>Structure <span>${snapshot.parts.length} parts · ${snapshot.joints.length} joints · ${snapshot.timeline.length} tracks</span></h3>
        <ul>${hierarchy}</ul>
      </section>
      <details class="arw__card"><summary>Structured runtime snapshot</summary><pre>${output}</pre></details>
    </div>
  `;
}

export const animationReviewWorkspaceStyles = `
  :host, .arw { color: var(--color-normal-contrast, #e8edf5); font: 13px/1.45 Inter, system-ui, sans-serif; }
  .arw { display: grid; gap: 10px; padding: 14px; background: var(--color-normal-fill-emphasis, #171b22); }
  .arw header, .arw__transport, .arw__settings, .arw__overlays { display: flex; align-items: center; gap: 8px; }
  .arw header { justify-content: space-between; }
  .arw h2, .arw h3, .arw p { margin: 0; }
  .arw h2 { font-size: 18px; }
  .arw h3 { margin-bottom: 8px; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
  .arw h3 span { color: #8e99aa; font-weight: 400; text-transform: none; }
  .arw__eyebrow { color: #73a8ff; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
  .arw__status { padding: 7px 9px; border-left: 3px solid #4a88e8; background: #202733; }
  .arw__status[data-connection="failed"] { border-color: #ee6b6e; }
  .arw__card { padding: 10px; border: 1px solid var(--color-normal-border, #343b47); border-radius: 6px; background: #1d222b; }
  .arw label { display: grid; gap: 4px; }
  .arw select, .arw input, .arw button { color: inherit; background: #272e3a; border: 1px solid #434d5d; border-radius: 4px; padding: 5px 7px; }
  .arw button { cursor: pointer; }
  .arw button:disabled, .arw input:disabled, .arw select:disabled { cursor: wait; opacity: .55; }
  .arw__transport { flex-wrap: wrap; margin: 9px 0; }
  .arw__timeline input { width: 100%; padding: 0; }
  .arw__settings { justify-content: space-between; flex-wrap: wrap; }
  .arw__toggle { display: flex !important; align-items: center; gap: 5px !important; }
  .arw__toggle input { margin: 0; }
  .arw__overlays { flex-wrap: wrap; }
  .arw__badge { padding: 3px 7px; border-radius: 999px; background: #32415a; }
  .arw__structure ul { max-height: 150px; overflow: auto; margin: 0; padding: 0; list-style: none; }
  .arw__structure li { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #2d3440; }
  .arw__structure li span { color: #8e99aa; }
  .arw pre { max-height: 180px; overflow: auto; white-space: pre-wrap; user-select: text; }
  .arw--compact .arw__structure ul { max-height: 100px; }
`;

function numberValue(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return null;
  }
  const value = Number(target.value);
  return Number.isFinite(value) ? value : null;
}

export function mountAnimationReviewWorkspace(
  root: HTMLElement,
  options: AnimationReviewMountOptions,
): () => void {
  const controller = new AnimationReviewWorkspaceController(options);
  const style = document.createElement("style");
  style.textContent = animationReviewWorkspaceStyles;
  root.before(style);

  const bind = (): void => {
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-command]",
    )) {
      button.addEventListener("click", () => {
        const command = button.dataset.command as AnimationReviewAdapterCommand;
        void controller.dispatch(command, {});
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-step]",
    )) {
      button.addEventListener("click", () => {
        void controller.dispatch("step", {
          deltaFrames: Number(button.dataset.step),
          frameRate: 60,
        });
      });
    }
    root.querySelector<HTMLSelectElement>("[data-clip]")?.addEventListener(
      "change",
      (event) => {
        const target = event.currentTarget as HTMLSelectElement;
        void controller.dispatch("select-clip", { clipId: target.value });
      },
    );
    root.querySelector<HTMLInputElement>("[data-seek]")?.addEventListener(
      "change",
      (event) => {
        const time = numberValue(event.currentTarget);
        if (time !== null) void controller.dispatch("seek", { time });
      },
    );
    root.querySelector<HTMLSelectElement>("[data-rate]")?.addEventListener(
      "change",
      (event) => {
        const rate = numberValue(event.currentTarget);
        if (rate !== null) void controller.dispatch("set-rate", { rate });
      },
    );
    root.querySelector<HTMLInputElement>("[data-loop]")?.addEventListener(
      "change",
      (event) => {
        const target = event.currentTarget as HTMLInputElement;
        void controller.dispatch("set-loop", { loop: target.checked });
      },
    );
    for (const input of root.querySelectorAll<HTMLInputElement>(
      "input[data-overlay]",
    )) {
      input.addEventListener("change", () => {
        void controller.dispatch("set-overlay", {
          overlay: input.dataset.overlay as AnimationReviewOverlay,
          enabled: input.checked,
        });
      });
    }
  };

  const unsubscribe = controller.subscribe((state) => {
    root.innerHTML = renderAnimationReviewWorkspaceMarkup(
      state,
      options.compact ?? false,
    );
    bind();
  });
  void controller.refresh();
  return () => {
    unsubscribe();
    style.remove();
    root.replaceChildren();
  };
}
