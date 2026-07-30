import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const analyzerPath = fileURLToPath(import.meta.url);

export async function analyzeProgram015Video({
  videoPath,
  configPath,
}) {
  const [videoBytes, configBytes, analyzerBytes] = await Promise.all([
    readFile(videoPath),
    readFile(configPath),
    readFile(analyzerPath),
  ]);
  const config = JSON.parse(configBytes.toString("utf8"));
  validateConfig(config);
  const metadata = probeVideo(videoPath);
  if (
    metadata.width !== config.video.width ||
    metadata.height !== config.video.height ||
    metadata.frameRate !== config.video.frameRate
  ) {
    throw new Error(
      `PROGRAM015_VIDEO_METADATA_MISMATCH:${JSON.stringify(metadata)}`,
    );
  }
  const requestedFrames = new Set();
  for (const comparison of config.comparisons) {
    requestedFrames.add(comparison.baselineFrame);
    requestedFrames.add(comparison.activeFrame);
  }
  const decodedFrames = new Map();
  for (const frameNumber of [...requestedFrames].sort((left, right) => left - right)) {
    if (frameNumber >= metadata.frameCount) {
      throw new Error(
        `PROGRAM015_FRAME_OUT_OF_RANGE:${frameNumber}/${metadata.frameCount}`,
      );
    }
    const bytes = decodeRgb24Frame(videoPath, frameNumber, metadata);
    decodedFrames.set(frameNumber, {
      bytes,
      sha256: sha256(bytes),
      timestampSeconds: round(frameNumber / metadata.framesPerSecond),
    });
  }

  const comparisons = config.comparisons.map((comparison) => {
    const baseline = decodedFrames.get(comparison.baselineFrame);
    const active = decodedFrames.get(comparison.activeFrame);
    const changedPixels = countChangedPixels(
      baseline.bytes,
      active.bytes,
      metadata.width,
      comparison.roi,
      comparison.channelDeltaThreshold,
    );
    const passed =
      changedPixels >= comparison.minimumChangedPixels &&
      (
        comparison.maximumChangedPixels === undefined ||
        changedPixels <= comparison.maximumChangedPixels
      );
    return {
      id: comparison.id,
      baseline: {
        frame: comparison.baselineFrame,
        timestampSeconds: baseline.timestampSeconds,
        sha256: baseline.sha256,
      },
      active: {
        frame: comparison.activeFrame,
        timestampSeconds: active.timestampSeconds,
        sha256: active.sha256,
      },
      roi: {
        convention: "half-open",
        x: comparison.roi[0],
        y: comparison.roi[1],
        width: comparison.roi[2],
        height: comparison.roi[3],
      },
      channelDeltaThreshold: comparison.channelDeltaThreshold,
      minimumChangedPixels: comparison.minimumChangedPixels,
      ...(comparison.maximumChangedPixels === undefined
        ? {}
        : { maximumChangedPixels: comparison.maximumChangedPixels }),
      changedPixels,
      status: passed ? "passed" : "failed",
    };
  });

  return {
    schemaVersion: "1.0.0",
    status: comparisons.every((comparison) => comparison.status === "passed")
      ? "passed"
      : "failed",
    identity: config.identity,
    analyzer: {
      file: path.basename(analyzerPath),
      sha256: sha256(analyzerBytes),
      algorithm: "ffmpeg-rgb24-half-open-roi-channel-delta-v1",
      ffmpegVersion: ffmpegVersion(),
    },
    video: {
      file: config.video.file,
      sha256: sha256(videoBytes),
      sizeBytes: videoBytes.length,
      codec: metadata.codec,
      profile: metadata.profile,
      pixelFormat: metadata.pixelFormat,
      width: metadata.width,
      height: metadata.height,
      frameRate: metadata.frameRate,
      framesPerSecond: metadata.framesPerSecond,
      frameCount: metadata.frameCount,
      durationSeconds: metadata.durationSeconds,
    },
    comparisons,
  };
}

export async function writeProgram015Analysis({
  videoPath,
  configPath,
  outputPath,
}) {
  const result = await analyzeProgram015Video({ videoPath, configPath });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export function countChangedPixels(
  baseline,
  active,
  frameWidth,
  roi,
  channelDeltaThreshold,
) {
  if (baseline.length !== active.length || baseline.length % 3 !== 0) {
    throw new Error("PROGRAM015_RGB24_FRAME_SIZE_MISMATCH");
  }
  const [x, y, width, height] = roi;
  let changedPixels = 0;
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const offset = (row * frameWidth + column) * 3;
      if (
        Math.abs(baseline[offset] - active[offset]) >
          channelDeltaThreshold ||
        Math.abs(baseline[offset + 1] - active[offset + 1]) >
          channelDeltaThreshold ||
        Math.abs(baseline[offset + 2] - active[offset + 2]) >
          channelDeltaThreshold
      ) {
        changedPixels += 1;
      }
    }
  }
  return changedPixels;
}

function validateConfig(config) {
  if (
    config?.schemaVersion !== "1.0.0" ||
    typeof config.identity?.featureSha !== "string" ||
    typeof config.identity?.sessionId !== "string" ||
    !Number.isInteger(config.video?.width) ||
    !Number.isInteger(config.video?.height) ||
    typeof config.video?.frameRate !== "string" ||
    !Array.isArray(config.comparisons) ||
    config.comparisons.length === 0
  ) {
    throw new Error("PROGRAM015_ANALYSIS_CONFIG_INVALID");
  }
  const ids = new Set();
  for (const comparison of config.comparisons) {
    const validRoi =
      Array.isArray(comparison.roi) &&
      comparison.roi.length === 4 &&
      comparison.roi.every(Number.isInteger) &&
      comparison.roi[0] >= 0 &&
      comparison.roi[1] >= 0 &&
      comparison.roi[2] > 0 &&
      comparison.roi[3] > 0 &&
      comparison.roi[0] + comparison.roi[2] <= config.video.width &&
      comparison.roi[1] + comparison.roi[3] <= config.video.height;
    if (
      typeof comparison.id !== "string" ||
      comparison.id.length === 0 ||
      ids.has(comparison.id) ||
      !Number.isInteger(comparison.baselineFrame) ||
      comparison.baselineFrame < 0 ||
      !Number.isInteger(comparison.activeFrame) ||
      comparison.activeFrame < 0 ||
      !validRoi ||
      !Number.isInteger(comparison.channelDeltaThreshold) ||
      comparison.channelDeltaThreshold < 0 ||
      comparison.channelDeltaThreshold > 255 ||
      !Number.isInteger(comparison.minimumChangedPixels) ||
      comparison.minimumChangedPixels < 0 ||
      (
        comparison.maximumChangedPixels !== undefined &&
        (
          !Number.isInteger(comparison.maximumChangedPixels) ||
          comparison.maximumChangedPixels < comparison.minimumChangedPixels
        )
      )
    ) {
      throw new Error(`PROGRAM015_ANALYSIS_COMPARISON_INVALID:${comparison.id}`);
    }
    ids.add(comparison.id);
  }
}

function probeVideo(videoPath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "format=duration:stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames",
      "-of",
      "json",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`PROGRAM015_FFPROBE_FAILED:${result.stderr.trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const [numerator, denominator] = String(stream?.r_frame_rate ?? "").split("/");
  const framesPerSecond = Number(numerator) / Number(denominator);
  const metadata = {
    codec: stream?.codec_name,
    profile: stream?.profile,
    pixelFormat: stream?.pix_fmt,
    width: Number(stream?.width),
    height: Number(stream?.height),
    frameRate: stream?.r_frame_rate,
    framesPerSecond,
    frameCount: Number(stream?.nb_read_frames),
    durationSeconds: Number(parsed.format?.duration),
  };
  if (
    metadata.codec !== "h264" ||
    metadata.profile !== "High" ||
    metadata.pixelFormat !== "yuv420p" ||
    !Number.isInteger(metadata.width) ||
    !Number.isInteger(metadata.height) ||
    !Number.isFinite(metadata.framesPerSecond) ||
    metadata.framesPerSecond <= 0 ||
    !Number.isInteger(metadata.frameCount) ||
    metadata.frameCount <= 0 ||
    !Number.isFinite(metadata.durationSeconds)
  ) {
    throw new Error(
      `PROGRAM015_VIDEO_METADATA_INVALID:${JSON.stringify(metadata)}`,
    );
  }
  return metadata;
}

function decodeRgb24Frame(videoPath, frameNumber, metadata) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      videoPath,
      "-vf",
      `select=eq(n\\,${frameNumber})`,
      "-frames:v",
      "1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "pipe:1",
    ],
    {
      encoding: null,
      maxBuffer: metadata.width * metadata.height * 3 + 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `PROGRAM015_FFMPEG_FRAME_DECODE_FAILED:${frameNumber}:${String(result.stderr).trim()}`,
    );
  }
  const expected = metadata.width * metadata.height * 3;
  if (result.stdout.length !== expected) {
    throw new Error(
      `PROGRAM015_RGB24_FRAME_LENGTH:${frameNumber}:${result.stdout.length}/${expected}`,
    );
  }
  return result.stdout;
}

function ffmpegVersion() {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("PROGRAM015_FFMPEG_VERSION_FAILED");
  return result.stdout.split("\n")[0];
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

async function runCli() {
  const argumentsByName = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    argumentsByName.set(process.argv[index], process.argv[index + 1]);
  }
  const videoPath = argumentsByName.get("--video");
  const configPath = argumentsByName.get("--config");
  const outputPath = argumentsByName.get("--output");
  if (!videoPath || !configPath || !outputPath) {
    throw new Error(
      "Usage: analyze-program015-live-evidence.mjs --video <mp4> --config <json> --output <json>",
    );
  }
  const result = await writeProgram015Analysis({
    videoPath: path.resolve(videoPath),
    configPath: path.resolve(configPath),
    outputPath: path.resolve(outputPath),
  });
  console.log(
    JSON.stringify({
      status: result.status,
      videoSha256: result.video.sha256,
      comparisons: result.comparisons.map(({ id, changedPixels, status }) => ({
        id,
        changedPixels,
        status,
      })),
    }),
  );
  if (result.status !== "passed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await runCli();
}
