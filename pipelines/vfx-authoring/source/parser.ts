import {
  VfxAuthoringErrorCode,
  type VfxAuthoringResult,
} from "./diagnostics";
import { compileVfxAuthoring } from "./compiler";
import type { VfxCompileContext, VfxRenderPlan } from "./types";

export function parseAndCompileVfxAuthoring(
  text: string,
  context: VfxCompileContext,
): VfxAuthoringResult<{
  readonly plan: VfxRenderPlan;
  readonly serialized: string;
}> {
  if (typeof text !== "string") {
    return {
      ok: false,
      errors: [
        {
          code: VfxAuthoringErrorCode.JSON_PARSE_ERROR,
          path: "",
          message: "VFX authoring input must be a JSON string.",
        },
      ],
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: VfxAuthoringErrorCode.JSON_PARSE_ERROR,
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return compileVfxAuthoring(value, context);
}
