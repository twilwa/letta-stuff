# Change: Add Audio Transform Module

## Why

Discord sends audio as 48kHz stereo Opus, but wake word detection (Porcupine) and STT (Deepgram, Whisper) require 16kHz mono PCM. This module handles the transformation pipeline: Opus decode → stereo to mono → 48kHz to 16kHz resample.

## What Changes

- Decode Opus packets to raw PCM using prism-media
- Convert stereo to mono (average channels or pick one)
- Resample from 48kHz to 16kHz using FFmpeg or speex-resampler
- Provide streaming transform pipeline for real-time processing
- Output 16kHz mono PCM s16le ready for wake word/STT

## Impact

- Affected specs: `audio-transform` (new capability)
- Affected code: `src/voice/transform/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal (can develop with test fixtures in parallel)
  - Wave 2: `add-wake-word-detection` consumes 16kHz mono output
  - Wave 2: `add-voice-processing` (STT) consumes 16kHz mono output

## Module Architecture

```
src/voice/
├── transform/
│   ├── index.ts           # AudioTransformPipeline
│   ├── opus-decoder.ts    # Opus → PCM
│   ├── channel-mixer.ts   # Stereo → Mono
│   ├── resampler.ts       # 48kHz → 16kHz
│   └── types.ts           # Audio format types
```

## Resampling Strategy

**Primary: FFmpeg** (already required by @discordjs/voice ecosystem)

```bash
ffmpeg -f s16le -ar 48000 -ac 2 -i pipe:0 -ar 16000 -ac 1 -f s16le pipe:1
```

**Fallback: speex-resampler** (WASM, no binary deps)

```typescript
const resampler = new SpeexResampler(1, 48000, 16000, 7);
const output = resampler.processChunk(monoInput);
```

## Dependencies

- prism-media (Opus decode, transitive from @discordjs/voice)
- ffmpeg-static or system ffmpeg
- speex-resampler (optional fallback)

## Blocked By

- `add-audio-input` - Needs raw Opus packets (but can develop with fixtures)

## Blocks

- `add-wake-word-detection` (Wave 2) - Needs 16kHz mono PCM
- `add-voice-processing` (Wave 2) - Needs 16kHz mono PCM for STT
