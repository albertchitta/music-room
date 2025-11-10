// Type definitions for YouTube IFrame API
export interface YTPlayer {
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
  playVideo(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
}

export interface YTOnStateChangeEvent {
  target: YTPlayer;
  data?: number;
}
