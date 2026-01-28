// ABOUTME: PCM audio test fixtures for voice output testing
// ABOUTME: Generates test audio buffers in various formats

/**
 * Generate silent PCM audio (16-bit signed, mono)
 * @param durationMs Duration in milliseconds
 * @param sampleRate Sample rate (default 48000 for Discord)
 */
export function generateSilentPCM(
  durationMs: number,
  sampleRate = 48000,
): Buffer {
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample
  return buffer;
}

/**
 * Generate a simple tone PCM audio (16-bit signed, mono)
 * @param durationMs Duration in milliseconds
 * @param frequency Tone frequency in Hz
 * @param sampleRate Sample rate (default 48000 for Discord)
 */
export function generateTonePCM(
  durationMs: number,
  frequency = 440,
  sampleRate = 48000,
): Buffer {
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }

  return buffer;
}

/**
 * Common test audio durations
 */
export const TEST_AUDIO = {
  SHORT: generateSilentPCM(100), // 100ms
  MEDIUM: generateSilentPCM(500), // 500ms
  LONG: generateSilentPCM(2000), // 2s
  TONE: generateTonePCM(1000, 440), // 1s A440 tone
};
