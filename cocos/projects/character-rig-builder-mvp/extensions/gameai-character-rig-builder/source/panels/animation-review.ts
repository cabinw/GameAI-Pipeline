import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
} from "@gameai/animation-review-core";
import { mountAnimationReviewWorkspace } from "@gameai/animation-review-ui";

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
      nextRequestId: () => `cocos-review-${Date.now()}-${++requestSequence}`,
      transport: {
        async request(
          request: AnimationReviewAdapterRequest,
        ): Promise<AnimationReviewAdapterResponse> {
          return (await Editor.Message.request(
            EXTENSION_NAME,
            "review-animation",
            request,
          )) as AnimationReviewAdapterResponse;
        },
      },
    });
  },
  beforeClose(this: PanelContext): void {
    this.disposeWorkspace?.();
    this.disposeWorkspace = undefined;
  },
});
