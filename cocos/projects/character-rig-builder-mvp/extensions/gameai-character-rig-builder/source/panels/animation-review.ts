import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
} from "@gameai/animation-review-core";
import { mountAnimationReviewWorkspace } from "@gameai/animation-review-ui";
import type {
  AnimationReviewActionResponse,
  AnimationReviewUiAction,
  AnimationReviewWorkspaceDocument,
} from "@gameai/animation-review-ui";

import { COCOS_RED_CAP_REVIEW_ADAPTER_ID } from "../animation-review/cocos-review-adapter";

const EXTENSION_NAME = "gameai-character-rig-builder";

interface PanelElements {
  workspace: HTMLElement;
}

interface PanelContext {
  $: PanelElements;
  disposeWorkspace: (() => void) | undefined;
}

module.exports = Editor.Panel.define({
  template: `<main id="animation-review-workspace"></main>`,
  style: `
    :host { display: block; min-width: 360px; height: 100%; overflow: auto; background: #171b22; }
    main { min-height: 100%; }
  `,
  $: {
    workspace: "#animation-review-workspace",
  },
  ready(this: PanelContext): void {
    let requestSequence = 0;
    this.disposeWorkspace = mountAnimationReviewWorkspace(this.$.workspace, {
      adapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
      compact: true,
      synchronizeInitialClip: true,
      preserveAdapterSnapshotOnReviewAction: true,
      nextRequestId: () => `cocos-review-${Date.now()}-${++requestSequence}`,
      transport: {
        async request(
          request: AnimationReviewAdapterRequest,
        ): Promise<AnimationReviewAdapterResponse> {
          const response = (await Editor.Message.request(
            EXTENSION_NAME,
            "review-animation",
            request,
          )) as AnimationReviewAdapterResponse;
          if (
            response.ok &&
            request.command !== "describe" &&
            request.command !== "observe-playback"
          ) {
            await Editor.Message.request(
              EXTENSION_NAME,
              "sync-animation-review-adapter",
              request,
            );
          }
          return response;
        },
        async readWorkspace(): Promise<AnimationReviewWorkspaceDocument> {
          return (await Editor.Message.request(
            EXTENSION_NAME,
            "review-workspace",
          )) as AnimationReviewWorkspaceDocument;
        },
        async reviewAction(
          action: AnimationReviewUiAction,
          payload: Readonly<Record<string, unknown>>,
        ): Promise<AnimationReviewActionResponse> {
          return (await Editor.Message.request(
            EXTENSION_NAME,
            "review-workspace-action",
            action,
            payload,
          )) as AnimationReviewActionResponse;
        },
        async saveSession(): Promise<unknown> {
          return Editor.Message.request(
            EXTENSION_NAME,
            "save-animation-review-session",
          );
        },
        openStandalone(): void {
          window.open("http://127.0.0.1:41715/", "_blank", "noopener");
        },
      },
    });
  },
  beforeClose(this: PanelContext): void {
    this.disposeWorkspace?.();
    this.disposeWorkspace = undefined;
  },
});
