# Vision

## Purpose

GameAI Pipeline reduces repeated manual production work in casual-game development by treating assets and gameplay content as reproducible build outputs.

## Product statement

Describe a game asset or content unit in a structured DSL, validate it, generate its implementation artifacts, verify the result, and integrate it into a supported engine.

## First user

The initial user is a small Cocos Creator team producing 2D casual and IAA games with AI-assisted art and Codex-assisted engineering.

## Non-goals for v0.x

- Replacing professional art direction or final visual QA
- Providing a universal runtime for every engine
- Depending on one image-generation vendor
- Hiding irreversible generation steps inside opaque editor state

## Success criteria

The first Character Pipeline is successful when a standardized character specification and approved source assets can reproducibly create a correctly assembled Cocos character with documented anchors, rest pose, sockets, hit areas, and baseline animations.
