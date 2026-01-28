// ABOUTME: Audio output module exports
// ABOUTME: Public API for voice playback functionality

export { AudioOutputManager } from "./manager.js";
export { AudioQueue } from "./queue.js";
export { BargeInDetector } from "./barge-in.js";
export type {
  AudioSegment,
  PlaybackStats,
  BargeInConfig,
  AudioOutputEvents,
  QueueItem,
} from "./types.js";
