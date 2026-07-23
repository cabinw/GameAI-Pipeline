import type { RigLayout } from "@gameai/character-contracts";

import type { SourceAnnotationPart, SourceCanvasAnnotation, SourceRect } from "./types";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sourceRect(part: SourceAnnotationPart): SourceRect {
  return "sourceRect" in part && part.sourceRect !== undefined
    ? part.sourceRect
    : part.originalRect;
}

function trimmedRect(part: SourceAnnotationPart): SourceRect {
  if ("trimmedRect" in part && part.trimmedRect !== undefined) {
    return part.trimmedRect;
  }
  const original = sourceRect(part);
  return {
    x: original.x + part.trim.offset.x,
    y: original.y + part.trim.offset.y,
    width: part.trim.size.width,
    height: part.trim.size.height,
  };
}

/**
 * Creates a deterministic, review-only SVG of the assembled source assets and
 * their authored proximal pivots. It does not model a Cocos scene or mutate assets.
 */
export function renderAssembledPreviewSvg(
  annotation: SourceCanvasAnnotation,
  layout: RigLayout,
): string {
  const drawOrder = new Map(layout.parts.map((part) => [part.partId, part.drawOrder]));
  const parts = [...annotation.parts].sort(
    (left, right) =>
      (drawOrder.get(left.partId) ?? 0) - (drawOrder.get(right.partId) ?? 0) ||
      left.partId.localeCompare(right.partId),
  );
  const images = parts.map((part) => {
    const rect = trimmedRect(part);
    return `    <image href="${escapeXml(part.file)}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"><title>${escapeXml(part.partId)}</title></image>`;
  });
  const bones = parts.flatMap((part) =>
    (part.childAttachments ?? []).map(
      (attachment) =>
        `    <line x1="${part.joint.x}" y1="${part.joint.y}" x2="${attachment.position.x}" y2="${attachment.position.y}"><title>${escapeXml(part.partId)} to ${escapeXml(attachment.childPartId)} via ${escapeXml(attachment.attachmentId)}</title></line>`,
    ),
  );
  const attachments = parts.flatMap((part) =>
    (part.childAttachments ?? []).map(
      (attachment) =>
        `    <circle class="attachment" cx="${attachment.position.x}" cy="${attachment.position.y}" r="7"><title>${escapeXml(part.partId)}.${escapeXml(attachment.attachmentId)}</title></circle>`,
    ),
  );
  const joints = parts.map(
    (part) =>
      `    <circle class="pivot" cx="${part.joint.x}" cy="${part.joint.y}" r="3.5"><title>${escapeXml(part.partId)} proximal pivot</title></circle>`,
  );
  const width = annotation.sourceCanvas.width;
  const height = annotation.sourceCanvas.height;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    "  <title id=\"title\">Red Cap Target assembled rig acceptance preview</title>",
    "  <desc id=\"description\">Trimmed source assets assembled on the source canvas. Red dots are proximal pivots; cyan rings are separately authored child attachment points.</desc>",
    "  <style>",
    "    image { image-rendering: auto; }",
    "    line { stroke: #00d8ff; stroke-width: 3; stroke-linecap: round; opacity: 0.9; }",
    "    .attachment { fill: none; stroke: #00d8ff; stroke-width: 3; }",
    "    .pivot { fill: #ff3158; stroke: #ffffff; stroke-width: 1.5; }",
    "  </style>",
    `  <rect width="${width}" height="${height}" fill="#20242d"/>`,
    "  <g id=\"assembled-assets\">",
    ...images,
    "  </g>",
    "  <g id=\"rig-bones\">",
    ...bones,
    "  </g>",
    "  <g id=\"child-attachments\">",
    ...attachments,
    "  </g>",
    "  <g id=\"proximal-pivots\">",
    ...joints,
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}
