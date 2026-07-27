import {
  SemanticEventErrorCode,
  type SemanticEventResult,
} from "./diagnostics";
import {
  CharacterSemanticEventEvaluator,
  createPrevalidatedCharacterSemanticEventEvaluator,
} from "./evaluator";
import { validateCharacterSemanticEventInput } from "./parser";
import type { SemanticEventValidationContext } from "./types";

export function createCharacterSemanticEventEvaluator(
  contract: unknown,
  context: unknown,
  initialTrackId: string,
): SemanticEventResult<CharacterSemanticEventEvaluator> {
  const validated = validateCharacterSemanticEventInput(contract, context);
  if (!validated.ok) return validated;
  const initialTrack = validated.value.tracks.find(
    (track) => track.trackId === initialTrackId,
  );
  if (initialTrack === undefined) {
    return {
      ok: false,
      errors: [
        {
          code: SemanticEventErrorCode.UNKNOWN_INITIAL_TRACK_ID,
          path: "/initialTrackId",
          message: `Unknown initial semantic-event track ${String(initialTrackId)}.`,
        },
      ],
    };
  }
  return {
    ok: true,
    value: createPrevalidatedCharacterSemanticEventEvaluator(
      validated.value,
      context as SemanticEventValidationContext,
      initialTrack.trackId,
    ),
    errors: [],
  };
}
