import { sampleRigAnimation } from "./sampler.js";
import type {
  NormalizedRigAnimation,
  RigAnimationSample,
} from "./types.js";

export type PlaybackStatus = "playing" | "paused" | "stopped";

export class RigAnimationPlayback {
  private elapsed = 0;
  private statusValue: PlaybackStatus = "stopped";

  constructor(readonly animation: NormalizedRigAnimation) {}

  get status(): PlaybackStatus {
    return this.statusValue;
  }

  get time(): number {
    return this.elapsed;
  }

  play(): RigAnimationSample {
    this.statusValue = "playing";
    return this.sample();
  }

  pause(): RigAnimationSample {
    if (this.statusValue === "playing") this.statusValue = "paused";
    return this.sample();
  }

  stop(): RigAnimationSample {
    this.elapsed = 0;
    this.statusValue = "stopped";
    return this.sample();
  }

  reset(): RigAnimationSample {
    this.elapsed = 0;
    return this.sample();
  }

  seek(time: number): RigAnimationSample {
    this.elapsed = Number.isFinite(time) ? Math.max(0, time) : 0;
    return this.sample();
  }

  update(deltaSeconds: number): RigAnimationSample {
    if (this.statusValue === "playing" && Number.isFinite(deltaSeconds)) {
      this.elapsed = Math.max(0, this.elapsed + Math.max(0, deltaSeconds));
      if (!this.animation.loop && this.elapsed >= this.animation.duration) {
        this.elapsed = this.animation.duration;
        this.statusValue = "stopped";
      }
    }
    return this.sample();
  }

  sample(): RigAnimationSample {
    return sampleRigAnimation(this.animation, this.elapsed);
  }
}
