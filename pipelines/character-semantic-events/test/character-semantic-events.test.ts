import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SemanticEventErrorCode,
  SemanticEventEvaluationError,
  SemanticEventEvaluationErrorCode,
  MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE,
  MAX_SEMANTIC_EVENT_CYCLES_PER_ADVANCE,
  characterSemanticEventsSchema,
  createCharacterSemanticEventEvaluator,
  parseCharacterSemanticEvents,
  validateCharacterSemanticEventInput,
  type CharacterSemanticEventContract,
  type SemanticEventValidationContext,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/character-semantic-events",
);
const walkTrackId = "walk-semantic-events";
const waveTrackId = "wave-semantic-events";

async function fixture(name = "events.json"): Promise<string> {
  return readFile(path.join(fixtureRoot, name), "utf8");
}

async function context(): Promise<SemanticEventValidationContext> {
  const rigLayout = JSON.parse(
    await fixture("rig-layout.json"),
  ) as SemanticEventValidationContext["rigLayout"];
  const animationRoots = [
    "examples/stickman-reference/animations/walk-cycle.json",
    "examples/stickman-reference/animations/arm-wave.json",
  ];
  const clips = await Promise.all(
    animationRoots.map(async (relativePath) => {
      const animation = JSON.parse(
        await readFile(path.join(repositoryRoot, relativePath), "utf8"),
      ) as { animationId: string; duration: number };
      return {
        clipId: animation.animationId,
        durationSeconds: animation.duration,
      };
    }),
  );
  return {
    clips,
    rigLayout,
  };
}

async function validContract(): Promise<CharacterSemanticEventContract> {
  const result = parseCharacterSemanticEvents(await fixture(), await context());
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("Valid semantic-event fixture did not parse.");
  return result.value;
}

function clone(
  contract: CharacterSemanticEventContract,
): CharacterSemanticEventContract {
  return structuredClone(contract);
}

test("parses separate semantic-event and VFX-cue concepts without engine resources", async () => {
  const contract = await validContract();
  assert.equal(contract.schemaVersion, "1.0.0");
  assert.deepEqual(
    contract.vfxCues.map((cue) => cue.cueId),
    ["footstep-dust", "hand-swing-trail"],
  );
  assert.deepEqual(
    contract.tracks.flatMap((track) =>
      track.events.map((event) => event.eventKind),
    ),
    ["vfx", "audio", "vfx", "gameplay", "gameplay", "vfx"],
  );
  const portable = JSON.stringify({
    schema: characterSemanticEventsSchema,
    contract,
  }).toLowerCase();
  for (const forbidden of [
    "cc.node",
    "spriteframe",
    "unityengine",
    "godot.resource",
    "uuid",
    "prefab",
  ]) {
    assert.equal(portable.includes(forbidden), false, forbidden);
  }
});

test("keeps the canonical schema and package copy byte-identical", async () => {
  assert.deepEqual(
    await readFile(
      path.join(repositoryRoot, "schemas/character-semantic-events.schema.json"),
    ),
    await readFile(
      path.join(
        packageRoot,
        "dist/schemas/character-semantic-events.schema.json",
      ),
    ),
  );
});

test("negative textual fixtures return their stable targeted codes", async () => {
  const validationContext = await context();
  const cases: Array<[string, string]> = [
    ["invalid/duplicate-event-id.json", SemanticEventErrorCode.DUPLICATE_EVENT_ID],
    ["invalid/unknown-socket.json", SemanticEventErrorCode.UNKNOWN_SOCKET_ID],
    [
      "invalid/time-outside-clip.json",
      SemanticEventErrorCode.EVENT_TIME_OUTSIDE_CLIP,
    ],
    ["invalid/invalid-lifecycle.json", SemanticEventErrorCode.INVALID_LIFECYCLE],
    [
      "invalid/invalid-transform.json",
      SemanticEventErrorCode.INVALID_LOCAL_TRANSFORM,
    ],
    [
      "invalid/unsupported-schema-version.json",
      SemanticEventErrorCode.UNSUPPORTED_SCHEMA_VERSION,
    ],
    [
      "invalid/missing-window-id.json",
      SemanticEventErrorCode.MISSING_GAMEPLAY_WINDOW_ID,
    ],
    [
      "invalid/signal-window-id.json",
      SemanticEventErrorCode.UNEXPECTED_GAMEPLAY_WINDOW_ID,
    ],
    [
      "invalid/unmatched-window-close.json",
      SemanticEventErrorCode.UNMATCHED_GAMEPLAY_WINDOW_CLOSE,
    ],
    [
      "invalid/duplicate-window-open.json",
      SemanticEventErrorCode.DUPLICATE_GAMEPLAY_WINDOW_OPEN,
    ],
    [
      "invalid/unclosed-window.json",
      SemanticEventErrorCode.UNCLOSED_GAMEPLAY_WINDOW,
    ],
  ];
  for (const [file, code] of cases) {
    const result = parseCharacterSemanticEvents(
      await fixture(file),
      validationContext,
    );
    assert.equal(result.ok, false, file);
    if (!result.ok) {
      assert.ok(
        result.errors.some((error) => error.code === code),
        `${file}: ${JSON.stringify(result.errors)}`,
      );
    }
  }
});

test("covers every published stable validation diagnostic", async () => {
  const base = await validContract();
  const validationContext = await context();
  const cases: Array<{
    code: string;
    mutate: (
      value: CharacterSemanticEventContract,
      contextValue: SemanticEventValidationContext,
    ) => void;
  }> = [
    {
      code: SemanticEventErrorCode.UNSUPPORTED_SCHEMA_VERSION,
      mutate: (value) => {
        value.schemaVersion = "2.0.0";
      },
    },
    {
      code: SemanticEventErrorCode.INCOMPATIBLE_RIG_LAYOUT,
      mutate: (value) => {
        value.rig.layoutId = "other-layout";
      },
    },
    {
      code: SemanticEventErrorCode.DUPLICATE_TRACK_ID,
      mutate: (value) => {
        value.tracks[1]!.trackId = value.tracks[0]!.trackId;
      },
    },
    {
      code: SemanticEventErrorCode.DUPLICATE_EVENT_ID,
      mutate: (value) => {
        value.tracks[1]!.events[0]!.eventId =
          value.tracks[0]!.events[0]!.eventId;
      },
    },
    {
      code: SemanticEventErrorCode.DUPLICATE_VFX_CUE_ID,
      mutate: (value) => {
        value.vfxCues[1]!.cueId = value.vfxCues[0]!.cueId;
      },
    },
    {
      code: SemanticEventErrorCode.UNKNOWN_CLIP_ID,
      mutate: (value) => {
        value.tracks[0]!.clipId = "missing-clip";
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_EVENT_TIME,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.timeSeconds = Number.NaN;
      },
    },
    {
      code: SemanticEventErrorCode.EVENT_TIME_OUTSIDE_CLIP,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.timeSeconds = 1.200001;
      },
    },
    {
      code: SemanticEventErrorCode.UNKNOWN_SOCKET_ID,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.socketId = "unknown-socket";
      },
    },
    {
      code: SemanticEventErrorCode.MISSING_CUE_ID,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.semanticCueId = "";
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_LOCAL_TRANSFORM,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.localTransform.scale.x = 0;
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_LIFECYCLE,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.lifecycle =
          "forever" as typeof value.tracks[0]["events"][0]["lifecycle"];
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_DURATION,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.durationSeconds = Number.POSITIVE_INFINITY;
      },
    },
    {
      code: SemanticEventErrorCode.INCOMPATIBLE_LIFECYCLE_EVENT_KIND,
      mutate: (value) => {
        value.tracks[0]!.events[1]!.lifecycle = "looping";
        value.tracks[0]!.events[1]!.durationSeconds = 0.2;
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_FOLLOW_POLICY,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.followPolicy.position =
          "yes" as unknown as boolean;
      },
    },
    {
      code: SemanticEventErrorCode.INVALID_SAME_TIME_ORDER,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.order = -1;
      },
    },
    {
      code: SemanticEventErrorCode.UNSUPPORTED_EVENT_KIND,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.eventKind =
          "particle" as typeof value.tracks[0]["events"][0]["eventKind"];
      },
    },
    {
      code: SemanticEventErrorCode.PAYLOAD_KIND_MISMATCH,
      mutate: (value) => {
        value.tracks[0]!.events[0]!.payload = {
          kind: "audio",
          volume: 1,
          pitch: 1,
        };
      },
    },
    {
      code: SemanticEventErrorCode.UNKNOWN_VFX_CUE_ID,
      mutate: (value) => {
        const event = value.tracks[0]!.events[0]!;
        if (event.payload.kind === "vfx") {
          event.payload.cueDefinitionId = "unknown-cue";
        }
      },
    },
  ];
  const observed = new Set<string>();
  for (const fixtureCase of cases) {
    const value = clone(base);
    const contextValue = structuredClone(validationContext);
    fixtureCase.mutate(value, contextValue);
    const validation = validateCharacterSemanticEventInput(value, contextValue);
    assert.equal(validation.ok, false, fixtureCase.code);
    const errors = validation.ok ? [] : validation.errors;
    assert.ok(
      errors.some((error) => error.code === fixtureCase.code),
      `${fixtureCase.code}: ${JSON.stringify(errors)}`,
    );
    errors.forEach((error) => observed.add(error.code));
  }

  const malformedJson = parseCharacterSemanticEvents("{", validationContext);
  assert.equal(malformedJson.ok, false);
  if (!malformedJson.ok) observed.add(malformedJson.errors[0]!.code);

  const structural = JSON.parse(await fixture()) as Record<string, unknown>;
  delete structural.rig;
  const structuralResult = parseCharacterSemanticEvents(
    JSON.stringify(structural),
    validationContext,
  );
  assert.equal(structuralResult.ok, false);
  if (!structuralResult.ok) {
    structuralResult.errors.forEach((error) => observed.add(error.code));
  }

  for (const [file, code] of [
    [
      "invalid/missing-window-id.json",
      SemanticEventErrorCode.MISSING_GAMEPLAY_WINDOW_ID,
    ],
    [
      "invalid/signal-window-id.json",
      SemanticEventErrorCode.UNEXPECTED_GAMEPLAY_WINDOW_ID,
    ],
    [
      "invalid/unmatched-window-close.json",
      SemanticEventErrorCode.UNMATCHED_GAMEPLAY_WINDOW_CLOSE,
    ],
    [
      "invalid/duplicate-window-open.json",
      SemanticEventErrorCode.DUPLICATE_GAMEPLAY_WINDOW_OPEN,
    ],
    [
      "invalid/unclosed-window.json",
      SemanticEventErrorCode.UNCLOSED_GAMEPLAY_WINDOW,
    ],
  ] as const) {
    const result = parseCharacterSemanticEvents(
      await fixture(file),
      validationContext,
    );
    assert.equal(result.ok, false, file);
    if (!result.ok) {
      assert.ok(result.errors.some((error) => error.code === code));
      result.errors.forEach((error) => observed.add(error.code));
    }
  }

  const unknownInitial = createCharacterSemanticEventEvaluator(
    base,
    validationContext,
    "missing-track",
  );
  assert.equal(unknownInitial.ok, false);
  if (!unknownInitial.ok) {
    unknownInitial.errors.forEach((error) => observed.add(error.code));
  }

  assert.deepEqual(
    [...observed].sort(),
    Object.values(SemanticEventErrorCode).sort(),
  );
});

test("orders same-time events by time, order, and eventId across a skipped frame", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  assert.deepEqual(evaluator.play(), []);
  assert.deepEqual(
    evaluator.advance(0.95).map((event) => event.eventId),
    ["walk-audio-left", "walk-footstep-mid", "walk-hit-active"],
  );
});

test("emits duration before time-zero at one loop and enumerates multiple loops", async () => {
  const contract = await validContract();
  const validationContext = await context();
  const one = createCharacterSemanticEventEvaluator(
    contract,
    validationContext,
    walkTrackId,
  );
  assert.equal(one.ok, true);
  if (!one.ok) return;
  one.value.play();
  assert.deepEqual(
    one.value.advance(1.25).map((event) => event.eventId),
    [
      "walk-audio-left",
      "walk-footstep-mid",
      "walk-hit-active",
      "walk-hit-end",
      "walk-footstep-zero",
    ],
  );

  const many = createCharacterSemanticEventEvaluator(
    contract,
    validationContext,
    walkTrackId,
  );
  assert.equal(many.ok, true);
  if (!many.ok) return;
  many.value.play();
  const emitted = many.value.advance(2.5);
  assert.equal(emitted.length, 10);
  assert.deepEqual(
    emitted.filter((event) => event.eventId === "walk-footstep-zero")
      .map((event) => event.cycle),
    [1, 2],
  );
});

test("pause/resume advances no boundary and never duplicates an emitted event", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  evaluator.play();
  assert.equal(evaluator.advance(0.6).length, 2);
  assert.deepEqual(evaluator.pause(), []);
  assert.deepEqual(evaluator.advance(10), []);
  assert.deepEqual(evaluator.resume(), []);
  assert.deepEqual(evaluator.advance(0.01), []);
  assert.equal(evaluator.snapshot.localTimeSeconds, 0.61);
});

test("Exact Reset emits nothing and replay can emit crossed events again", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  evaluator.play();
  const first = evaluator.advance(0.7).map((event) => event.eventId);
  assert.deepEqual(evaluator.exactReset(), []);
  assert.equal(evaluator.snapshot.status, "stopped");
  assert.equal(evaluator.snapshot.absoluteTimeSeconds, 0);
  evaluator.play();
  assert.deepEqual(
    evaluator.advance(0.7).map((event) => event.eventId),
    first,
  );
});

test("clip switching emits no old-clip event and preserves playback status", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  evaluator.play();
  evaluator.advance(0.7);
  assert.deepEqual(evaluator.switchTrack("wave-semantic-events"), []);
  assert.equal(evaluator.snapshot.status, "playing");
  assert.deepEqual(
    evaluator.advance(0.31).map((event) => event.eventId),
    ["wave-hand-trail"],
  );
});

test("documents zero/duration policy and avoids floating-point boundary duplicates", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  assert.deepEqual(evaluator.play(), []);
  assert.deepEqual(evaluator.advance(0.0001), []);
  const emitted: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    emitted.push(...evaluator.advance(0.1).map((event) => event.eventId));
  }
  assert.equal(
    emitted.filter((eventId) => eventId === "walk-audio-left").length,
    1,
  );
  assert.equal(
    emitted.filter((eventId) => eventId === "walk-hit-end").length,
    1,
  );
  assert.equal(
    emitted.filter((eventId) => eventId === "walk-footstep-zero").length,
    1,
  );
});

test("validation gates evaluator creation and unsupported motion fails clearly", async () => {
  const invalid = clone(await validContract());
  invalid.tracks[0]!.clipId = "unknown-clip";
  const rejected = createCharacterSemanticEventEvaluator(
    invalid,
    await context(),
    walkTrackId,
  );
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.ok(
      rejected.errors.some(
        (error) => error.code === SemanticEventErrorCode.UNKNOWN_CLIP_ID,
      ),
    );
  }

  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    walkTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  result.value.play();
  assert.throws(
    () => result.value.advance(-0.1),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code ===
        SemanticEventEvaluationErrorCode.UNSUPPORTED_REVERSE_PLAYBACK,
  );
  assert.throws(
    () => result.value.advance(Number.NaN),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code === SemanticEventEvaluationErrorCode.INVALID_DELTA,
  );
  assert.throws(
    () => result.value.seek(0.5),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code === SemanticEventEvaluationErrorCode.UNSUPPORTED_SEEK,
  );
});

test("direct evaluator inputs fail closed through the shared structural boundary", async () => {
  const base = await validContract();
  const validationContext = await context();
  const malformed: Array<[string, unknown]> = [
    ["primitive", 42],
    ["array container", []],
    ["empty tracks", { ...clone(base), tracks: [] }],
    [
      "missing tracks",
      (() => {
        const value = clone(base) as Partial<CharacterSemanticEventContract>;
        delete value.tracks;
        return value;
      })(),
    ],
    [
      "missing events",
      (() => {
        const value = clone(base) as unknown as {
          tracks: Array<Record<string, unknown>>;
        };
        delete value.tracks[0]!.events;
        return value;
      })(),
    ],
    [
      "missing vfx cues",
      (() => {
        const value = clone(base) as Partial<CharacterSemanticEventContract>;
        delete value.vfxCues;
        return value;
      })(),
    ],
    [
      "malformed payload discriminator",
      (() => {
        const value = clone(base) as unknown as {
          tracks: Array<{ events: Array<Record<string, unknown>> }>;
        };
        value.tracks[0]!.events[0]!.payload = {
          kind: "audio",
          cueDefinitionId: "footstep-dust",
        };
        return value;
      })(),
    ],
    [
      "invalid tracks container",
      { ...clone(base), tracks: {} },
    ],
    [
      "missing rig compatibility",
      (() => {
        const value = clone(base) as Partial<CharacterSemanticEventContract>;
        delete value.rig;
        return value;
      })(),
    ],
    [
      "invalid cue fields",
      (() => {
        const value = clone(base) as unknown as {
          vfxCues: Array<Record<string, unknown>>;
        };
        value.vfxCues[0]!.visualIntent = "";
        value.vfxCues[0]!.intensity = "high";
        return value;
      })(),
    ],
  ];

  for (const [label, value] of malformed) {
    let result:
      | ReturnType<typeof createCharacterSemanticEventEvaluator>
      | undefined;
    assert.doesNotThrow(() => {
      result = createCharacterSemanticEventEvaluator(
        value,
        validationContext,
        walkTrackId,
      );
    }, label);
    assert.equal(result?.ok, false, label);
    if (result !== undefined && !result.ok) {
      assert.ok(result.errors.length > 0, label);
    }
  }

  const missingContext = createCharacterSemanticEventEvaluator(
    base,
    {},
    walkTrackId,
  );
  assert.equal(missingContext.ok, false);
  if (!missingContext.ok) {
    assert.ok(
      missingContext.errors.every(
        (error) => error.code === SemanticEventErrorCode.SCHEMA_VALIDATION_ERROR,
      ),
    );
  }
});

test("explicit initial track is independent of authored track array order", async () => {
  const validationContext = await context();
  const original = await validContract();
  const reordered = clone(original);
  reordered.tracks.reverse();

  for (const contract of [original, reordered]) {
    const result = createCharacterSemanticEventEvaluator(
      contract,
      validationContext,
      walkTrackId,
    );
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(result.value.snapshot.trackId, walkTrackId);
    result.value.play();
    assert.deepEqual(
      result.value.advance(0.61).map((command) => command.eventId),
      ["walk-audio-left", "walk-footstep-mid"],
    );
  }
});

test("looping lifecycle emits stable starts and duration stops across skipped loops", async () => {
  const result = createCharacterSemanticEventEvaluator(
    await validContract(),
    await context(),
    waveTrackId,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const evaluator = result.value;
  evaluator.play();
  const commands = evaluator.advance(4.31);
  assert.deepEqual(
    commands.map((command) => [
      command.command,
      "instanceId" in command ? command.instanceId : undefined,
      command.command === "stop" ? command.reason : undefined,
    ]),
    [
      ["start", `${waveTrackId}:wave-hand-trail:0`, undefined],
      ["stop", `${waveTrackId}:wave-hand-trail:0`, "duration"],
      ["start", `${waveTrackId}:wave-hand-trail:1`, undefined],
      ["stop", `${waveTrackId}:wave-hand-trail:1`, "duration"],
      ["start", `${waveTrackId}:wave-hand-trail:2`, undefined],
    ],
  );
  assert.deepEqual(evaluator.snapshot.activeInstanceIds, [
    `${waveTrackId}:wave-hand-trail:2`,
  ]);

  evaluator.pause();
  assert.deepEqual(evaluator.advance(10), []);
  evaluator.resume();
  assert.deepEqual(evaluator.snapshot.activeInstanceIds, [
    `${waveTrackId}:wave-hand-trail:2`,
  ]);
  assert.deepEqual(
    evaluator.exactReset().map((command) => [
      command.command,
      command.command === "stop" ? command.reason : undefined,
    ]),
    [["stop", "exact-reset"]],
  );
  assert.deepEqual(evaluator.snapshot.activeInstanceIds, []);
});

test("persistent cleanup and same-time lifecycle ordering are deterministic", async () => {
  const validationContext = await context();
  const persistentContract = await validContract();
  const persistentEvent = persistentContract.tracks[1]!.events[0]!;
  persistentEvent.lifecycle = "persistent";
  delete persistentEvent.durationSeconds;
  const persistent = createCharacterSemanticEventEvaluator(
    persistentContract,
    validationContext,
    waveTrackId,
  );
  assert.equal(persistent.ok, true);
  if (!persistent.ok) return;
  persistent.value.play();
  assert.equal(persistent.value.advance(0.31)[0]?.command, "start");
  assert.deepEqual(
    persistent.value.switchTrack(walkTrackId).map((command) => [
      command.command,
      command.command === "stop" ? command.reason : undefined,
    ]),
    [["stop", "track-switch"]],
  );
  persistent.value.switchTrack(waveTrackId);
  persistent.value.play();
  persistent.value.advance(0.31);
  assert.deepEqual(
    persistent.value.dispose().map((command) => [
      command.command,
      command.command === "stop" ? command.reason : undefined,
    ]),
    [["stop", "dispose"]],
  );

  const sameTimeContract = await validContract();
  sameTimeContract.tracks[1]!.events[0]!.durationSeconds = 2;
  const sameTime = createCharacterSemanticEventEvaluator(
    sameTimeContract,
    validationContext,
    waveTrackId,
  );
  assert.equal(sameTime.ok, true);
  if (!sameTime.ok) return;
  sameTime.value.play();
  assert.deepEqual(
    sameTime.value.advance(2.31).map((command) => [
      command.command,
      command.cycle,
    ]),
    [
      ["start", 0],
      ["stop", 0],
      ["start", 1],
    ],
  );
});

test("advance overflow and crossing budgets reject without partial mutation", async () => {
  const contract = await validContract();
  const validationContext = await context();
  const budgeted = createCharacterSemanticEventEvaluator(
    contract,
    validationContext,
    walkTrackId,
  );
  assert.equal(budgeted.ok, true);
  if (!budgeted.ok) return;
  budgeted.value.play();
  const beforeMax = budgeted.value.snapshot;
  assert.throws(
    () => budgeted.value.advance(Number.MAX_VALUE),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code ===
        SemanticEventEvaluationErrorCode.ADVANCE_BUDGET_EXCEEDED,
  );
  assert.deepEqual(budgeted.value.snapshot, beforeMax);

  assert.throws(
    () =>
      budgeted.value.advance(
        1.2 * (MAX_SEMANTIC_EVENT_CYCLES_PER_ADVANCE + 2),
      ),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code ===
        SemanticEventEvaluationErrorCode.ADVANCE_BUDGET_EXCEEDED,
  );
  assert.deepEqual(budgeted.value.snapshot, beforeMax);

  const reasonable = createCharacterSemanticEventEvaluator(
    contract,
    validationContext,
    walkTrackId,
  );
  assert.equal(reasonable.ok, true);
  if (!reasonable.ok) return;
  reasonable.value.play();
  assert.ok(
    reasonable.value.advance(120).length <
      MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE,
  );

  const hugeDurationContext = structuredClone(validationContext);
  const walkClip = hugeDurationContext.clips.find(
    (clip) => clip.clipId === "stickman-walk-cycle",
  )!;
  walkClip.durationSeconds = Number.MAX_VALUE;
  const overflow = createCharacterSemanticEventEvaluator(
    contract,
    hugeDurationContext,
    walkTrackId,
  );
  assert.equal(overflow.ok, true);
  if (!overflow.ok) return;
  overflow.value.play();
  overflow.value.advance(Number.MAX_VALUE * 0.75);
  const beforeOverflow = overflow.value.snapshot;
  assert.throws(
    () => overflow.value.advance(Number.MAX_VALUE * 0.75),
    (error) =>
      error instanceof SemanticEventEvaluationError &&
      error.code ===
        SemanticEventEvaluationErrorCode.ACCUMULATED_TIME_OVERFLOW,
  );
  assert.deepEqual(overflow.value.snapshot, beforeOverflow);
});
