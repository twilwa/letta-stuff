// ABOUTME: Mock Opus packet fixtures for testing audio input
// ABOUTME: Provides sample Opus frame data for unit tests

/**
 * Creates a mock Opus packet of specified size
 * Opus packets typically range from 10-1275 bytes
 */
export function createOpusPacket(size: number = 960): Buffer {
  // Opus magic signature bytes followed by random data
  const header = Buffer.from([0x4f, 0x70, 0x75, 0x73]);
  const payload = Buffer.alloc(size - header.length);

  // Fill with pseudo-random but deterministic data
  for (let i = 0; i < payload.length; i++) {
    payload[i] = (i * 37) % 256;
  }

  return Buffer.concat([header, payload]);
}

/**
 * Creates multiple sequential Opus packets with timestamps
 * Simulates a 20ms frame duration (50 packets/sec)
 */
export function createOpusPacketSequence(
  count: number,
  frameDurationMs: number = 20,
): Array<{ data: Buffer; timestamp: number }> {
  const packets: Array<{ data: Buffer; timestamp: number }> = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    packets.push({
      data: createOpusPacket(),
      timestamp: startTime + i * frameDurationMs,
    });
  }

  return packets;
}

/**
 * Small packet for testing edge cases
 */
export const SMALL_OPUS_PACKET = Buffer.from([
  0x4f, 0x70, 0x75, 0x73, 0x01, 0x02,
]);

/**
 * Standard size packet (960 bytes ~ 20ms at 48kHz)
 */
export const STANDARD_OPUS_PACKET = createOpusPacket(960);

/**
 * Large packet for testing buffer limits
 */
export const LARGE_OPUS_PACKET = createOpusPacket(1275);
