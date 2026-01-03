import type {PlaybackManager, PlaybackState} from './PlaybackManager';

/**
 * A read-only representation of the playback.
 */
export class PlaybackStatus {
  /**
   * Temporary time offset for motion blur subframe rendering.
   * This is added to the current time when rendering subframes.
   */
  private subframeOffsetValue = 0;

  public constructor(private readonly playback: PlaybackManager) {}

  /**
   * Set the subframe time offset for motion blur rendering.
   * @param offset - Time offset in seconds
   */
  public setSubframeOffset(offset: number): void {
    this.subframeOffsetValue = offset;
  }

  /**
   * Reset the subframe offset to 0.
   */
  public resetSubframeOffset(): void {
    this.subframeOffsetValue = 0;
  }

  /**
   * Get the current subframe offset.
   */
  public get subframeOffset(): number {
    return this.subframeOffsetValue;
  }

  /**
   * Convert seconds to frames using the current framerate.
   *
   * @param seconds - The seconds to convert.
   */
  public secondsToFrames(seconds: number) {
    return Math.ceil(seconds * this.playback.fps);
  }

  /**
   * Convert frames to seconds using the current framerate.
   *
   * @param frames - The frames to convert.
   */
  public framesToSeconds(frames: number) {
    return frames / this.playback.fps;
  }

  /**
   * Get the current time in seconds, including any subframe offset.
   */
  public get time(): number {
    return this.framesToSeconds(this.playback.frame) + this.subframeOffsetValue;
  }

  public get frame(): number {
    return this.playback.frame;
  }

  public get speed(): number {
    return this.playback.speed;
  }

  public get fps(): number {
    return this.playback.fps;
  }

  public get state(): PlaybackState {
    return this.playback.state;
  }

  /**
   * The time passed since the last frame in seconds.
   */
  public get deltaTime(): number {
    return this.framesToSeconds(1) * this.speed;
  }
}
