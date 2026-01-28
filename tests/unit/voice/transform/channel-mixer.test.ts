// ABOUTME: Tests for ChannelMixer - stereo to mono conversion
// ABOUTME: Verifies channel mixing and pass-through for mono

import { describe, it, expect } from "vitest";
import { ChannelMixer } from "../../../../src/voice/transform/channel-mixer.js";

describe("ChannelMixer", () => {
  describe("stereo to mono", () => {
    it("converts stereo PCM to mono by averaging", () => {
      const mixer = new ChannelMixer({ inputChannels: 2, outputChannels: 1 });

      // Stereo: Left=1000, Right=500 -> Mono: 750
      // Each sample is 2 bytes (16-bit), stereo = 4 bytes per frame
      const stereo = Buffer.alloc(4);
      stereo.writeInt16LE(1000, 0); // Left
      stereo.writeInt16LE(500, 2); // Right

      const mono = mixer.mix(stereo);

      expect(mono.length).toBe(2); // 1 channel, 2 bytes
      expect(mono.readInt16LE(0)).toBe(750);
    });

    it("handles multiple frames", () => {
      const mixer = new ChannelMixer({ inputChannels: 2, outputChannels: 1 });

      // 2 frames of stereo
      const stereo = Buffer.alloc(8);
      stereo.writeInt16LE(100, 0); // Frame 1 Left
      stereo.writeInt16LE(200, 2); // Frame 1 Right
      stereo.writeInt16LE(300, 4); // Frame 2 Left
      stereo.writeInt16LE(400, 6); // Frame 2 Right

      const mono = mixer.mix(stereo);

      expect(mono.length).toBe(4); // 2 frames, 2 bytes each
      expect(mono.readInt16LE(0)).toBe(150); // (100+200)/2
      expect(mono.readInt16LE(2)).toBe(350); // (300+400)/2
    });

    it("handles negative values", () => {
      const mixer = new ChannelMixer({ inputChannels: 2, outputChannels: 1 });

      const stereo = Buffer.alloc(4);
      stereo.writeInt16LE(-1000, 0);
      stereo.writeInt16LE(-2000, 2);

      const mono = mixer.mix(stereo);

      expect(mono.readInt16LE(0)).toBe(-1500);
    });

    it("clamps values to prevent overflow", () => {
      const mixer = new ChannelMixer({ inputChannels: 2, outputChannels: 1 });

      // Both at max positive - average should still be max
      const stereo = Buffer.alloc(4);
      stereo.writeInt16LE(32767, 0);
      stereo.writeInt16LE(32767, 2);

      const mono = mixer.mix(stereo);

      expect(mono.readInt16LE(0)).toBe(32767);
    });
  });

  describe("mono pass-through", () => {
    it("passes mono through unchanged", () => {
      const mixer = new ChannelMixer({ inputChannels: 1, outputChannels: 1 });

      const mono = Buffer.alloc(4);
      mono.writeInt16LE(1234, 0);
      mono.writeInt16LE(5678, 2);

      const output = mixer.mix(mono);

      expect(output.equals(mono)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty buffer", () => {
      const mixer = new ChannelMixer({ inputChannels: 2, outputChannels: 1 });
      const result = mixer.mix(Buffer.alloc(0));
      expect(result.length).toBe(0);
    });

    it("uses default config when not provided", () => {
      const mixer = new ChannelMixer();
      expect(mixer).toBeDefined();
    });
  });
});
