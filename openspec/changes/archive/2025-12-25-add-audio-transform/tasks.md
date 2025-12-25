## 1. Opus Decoding

- [ ] 1.1 Create OpusDecoder wrapper using prism-media
- [ ] 1.2 Configure decoder (48kHz, stereo, frame size 960)
- [ ] 1.3 Handle decode errors gracefully
- [ ] 1.4 Output PCM s16le (signed 16-bit little-endian)
- [ ] 1.5 Track decode statistics (packets, errors)

## 2. Channel Mixing

- [ ] 2.1 Create ChannelMixer class
- [ ] 2.2 Implement stereo to mono (average L+R / 2)
- [ ] 2.3 Handle different channel counts (pass-through if mono)
- [ ] 2.4 Optimize for streaming (process in chunks)

## 3. Resampling - FFmpeg

- [ ] 3.1 Install ffmpeg-static dependency
- [ ] 3.2 Create FFmpegResampler class
- [ ] 3.3 Spawn ffmpeg process with correct args
- [ ] 3.4 Pipe input PCM to ffmpeg stdin
- [ ] 3.5 Read resampled output from ffmpeg stdout
- [ ] 3.6 Handle process errors and restarts
- [ ] 3.7 Clean up process on shutdown

## 4. Resampling - Speex Fallback

- [ ] 4.1 Install speex-resampler package
- [ ] 4.2 Create SpeexResampler wrapper
- [ ] 4.3 Configure for 48000→16000, quality 7
- [ ] 4.4 Process chunks through resampler
- [ ] 4.5 Implement fallback detection (no ffmpeg available)

## 5. Transform Pipeline

- [ ] 5.1 Create AudioTransformPipeline class
- [ ] 5.2 Chain: OpusDecoder → ChannelMixer → Resampler
- [ ] 5.3 Implement as Node.js Transform streams
- [ ] 5.4 Emit 'pcm16k' event with transformed audio
- [ ] 5.5 Track pipeline latency
- [ ] 5.6 Handle backpressure

## 6. Output Format

- [ ] 6.1 Validate output: 16kHz, mono, PCM s16le
- [ ] 6.2 Create format validation utility
- [ ] 6.3 Document output format for consumers

## 7. Testing

- [ ] 7.1 Create Opus packet test fixtures
- [ ] 7.2 Create expected PCM output fixtures
- [ ] 7.3 Write unit tests for Opus decoder
- [ ] 7.4 Write unit tests for channel mixer
- [ ] 7.5 Write unit tests for resampler (both implementations)
- [ ] 7.6 Write integration test for full pipeline
- [ ] 7.7 Benchmark pipeline latency
