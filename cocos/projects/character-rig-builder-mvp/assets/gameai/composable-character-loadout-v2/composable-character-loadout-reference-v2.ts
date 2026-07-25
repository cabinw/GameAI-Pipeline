import { _decorator } from "cc";

import {
  GameAITask013R6OneHandedPropIntegration,
} from "../task013r6/task013r6-one-handed-prop-integration";
export * from "./canonical-loadout-adapter";

const { ccclass } = _decorator;

/**
 * Canonical Creator entry point for the externally accepted recovered
 * full-loadout adapter. Runtime behavior is inherited unchanged from the
 * accepted R6 boundary; semantic data remains contract/resolver owned.
 */
@ccclass("GameAIComposableCharacterLoadoutReferenceV2")
export class GameAIComposableCharacterLoadoutReferenceV2
  extends GameAITask013R6OneHandedPropIntegration {}
