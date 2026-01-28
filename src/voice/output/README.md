# Audio Output Module

This module handles audio playback for Discord voice connections, including queuing, barge-in detection, and playback statistics.

## Components

### AudioOutputManager

Main orchestrator for audio playback. Manages players, queues, and barge-in detection per guild.

**Usage:**

```typescript
import { AudioOutputManager } from "./voice/output";
import type { AudioSegment } from "./voice/output";

const manager = new AudioOutputManager({
  enabled: true,
  minSpeechDuration: 300, // ms
  cooldownAfterSpeaking: 200, // ms
});

// Attach to voice connection
manager.attachToConnection(guildId, voiceConnection);

// Play audio
const segment: AudioSegment = {
  data: pcmBuffer, // or Readable stream
  streaming: false,
  text: "Hello, world!",
  requestedAt: Date.now(), // For latency tracking
};

manager.play(guildId, segment);

// Events
manager.on("playbackStarted", (guildId, segment) => {
  console.log(`Playing: ${segment.text}`);
});

manager.on("playbackFinished", (guildId) => {
  console.log("Finished playing segment");
});

manager.on("queueEmpty", (guildId) => {
  console.log("Queue is empty");
});

manager.on("bargeIn", (guildId, userId) => {
  console.log(`User ${userId} interrupted playback`);
});

// Control playback
manager.pause(guildId);
manager.resume(guildId);
manager.stop(guildId); // Stops and clears queue

// Statistics
const stats = manager.getStats(guildId);
console.log(
  `Played: ${stats.totalPlayed}, Interrupted: ${stats.interruptionCount}`,
);
console.log(`Avg TTS latency: ${stats.averageTTSLatency}ms`);
```

### AudioQueue

FIFO queue for audio segments. Automatically plays next item when current finishes.

**Features:**

- Enqueue audio segments
- Automatic dequeue on idle
- Clear queue
- Size tracking
- `queueEmpty` event

**Usage:**

```typescript
import { AudioQueue } from "./voice/output";

const queue = new AudioQueue();

queue.enqueue(segment1);
queue.enqueue(segment2);

queue.on("queueEmpty", () => {
  console.log("No more audio to play");
});

const next = queue.dequeue(); // Returns QueueItem with segment + enqueuedAt
const size = queue.size();
const isEmpty = queue.isEmpty();
const all = queue.getAll(); // Non-destructive peek at all items
```

### BargeInDetector

Monitors user speech during bot playback to detect interruptions.

**Configuration:**

- `enabled`: Enable/disable barge-in detection
- `minSpeechDuration`: Minimum user speech duration to trigger (ms)
- `cooldownAfterSpeaking`: Cooldown after bot stops speaking (ms)

**Usage:**

```typescript
import { BargeInDetector } from "./voice/output";

const detector = new BargeInDetector({
  enabled: true,
  minSpeechDuration: 300,
  cooldownAfterSpeaking: 200,
});

detector.startPlayback();

detector.on("bargeIn", (userId) => {
  console.log(`User ${userId} started speaking - stopping playback`);
});

// From audio input module
detector.onUserSpeechStart(userId);
detector.onUserSpeechStop(userId);

detector.stopPlayback(); // Call when playback finishes
detector.reset(); // Clear all state
```

## Audio Format

The module expects **PCM audio** in the following format:

- **Sample Rate:** 48 kHz (Discord standard)
- **Channels:** Mono or Stereo
- **Bit Depth:** 16-bit signed integer
- **Input Type:** Raw PCM (no Opus encoding needed)

The `AudioSegment` interface accepts:

- `Buffer` - Complete PCM audio data
- `Readable` stream - For streaming TTS

The module automatically converts buffers to streams and creates `AudioResource` instances.

## Playback Lifecycle

1. **Attach to Connection**

   ```typescript
   manager.attachToConnection(guildId, connection);
   ```

   Creates player, queue, and barge-in detector for the guild.

2. **Play Audio**

   ```typescript
   manager.play(guildId, segment);
   ```

   - If nothing playing → plays immediately
   - If already playing → enqueues for later

3. **Playback Events**
   - `playbackStarted` - Segment begins playing
   - `playbackFinished` - Segment completes
   - `queueEmpty` - No more segments to play

4. **Automatic Queue Processing**
   - When segment finishes, next queued item plays automatically
   - Continues until queue is empty

5. **Barge-In Detection**

   ```typescript
   manager.onUserSpeechStart(guildId, userId);
   ```

   - Monitors user speech during playback
   - Stops playback immediately on interrupt
   - Clears queue
   - Emits `bargeIn` event

6. **Manual Control**

   ```typescript
   manager.pause(guildId);
   manager.resume(guildId);
   manager.stop(guildId); // Stops and clears queue
   ```

7. **Cleanup**
   ```typescript
   manager.destroy(); // Stops all guilds, clears all state
   ```

## Statistics Tracking

Per-guild statistics:

```typescript
interface PlaybackStats {
  totalPlayed: number; // Total segments played
  totalPlaybackTime: number; // Total time (ms) - future
  interruptionCount: number; // Times interrupted by users
  averageTTSLatency: number; // Avg time from TTS request to playback
}
```

To track TTS latency, include `requestedAt` timestamp in your `AudioSegment`:

```typescript
const segment: AudioSegment = {
  data: pcmBuffer,
  streaming: false,
  requestedAt: Date.now(), // Timestamp when TTS was requested
};
```

## Integration with TTS

The module is designed to work with streaming or complete TTS:

**Streaming TTS (chunks arrive progressively):**

```typescript
const segment: AudioSegment = {
  data: readableStream, // Stream from TTS provider
  streaming: true,
  text: "This is being generated...",
  requestedAt: Date.now(),
};
```

**Complete TTS (full audio available):**

```typescript
const segment: AudioSegment = {
  data: pcmBuffer,
  streaming: false,
  text: "Complete audio",
  requestedAt: Date.now(),
};
```

## Integration with Voice Input

The barge-in detector integrates with the audio input module:

```typescript
// In your audio input handler
audioInputManager.on("speakingStart", (userId) => {
  audioOutputManager.onUserSpeechStart(guildId, userId);
});

audioInputManager.on("speakingStop", (userId, duration) => {
  audioOutputManager.onUserSpeechStop(guildId, userId);
});
```

## Testing

Comprehensive test suite with 61 tests covering:

- Queue management (17 tests)
- Barge-in detection (15 tests)
- Manager orchestration (29 tests)

Test fixtures available in `tests/fixtures/audio/`:

- `generateSilentPCM(durationMs)` - Silent audio
- `generateTonePCM(durationMs, frequency)` - Tone audio
- `TEST_AUDIO.SHORT/MEDIUM/LONG/TONE` - Pre-generated fixtures

Run tests:

```bash
npm test -- tests/unit/voice/output/
```

## Future Enhancements

- [ ] Volume control per segment
- [ ] Playback time tracking
- [ ] Streaming audio concatenation
- [ ] Priority queue (urgent vs normal)
- [ ] Audio normalization
- [ ] Fade in/out transitions
- [ ] Playback position tracking
