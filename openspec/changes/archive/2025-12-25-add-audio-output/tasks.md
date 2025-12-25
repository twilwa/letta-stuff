## 1. Audio Player Setup

- [ ] 1.1 Create AudioOutputManager class
- [ ] 1.2 Create AudioPlayer per guild
- [ ] 1.3 Subscribe player to voice connection
- [ ] 1.4 Handle player state events (Idle, Playing, Paused, AutoPaused)
- [ ] 1.5 Track playback statistics

## 2. Audio Resource Creation

- [ ] 2.1 Create AudioResource from PCM buffer
- [ ] 2.2 Create AudioResource from readable stream
- [ ] 2.3 Configure proper input type (Raw, Opus)
- [ ] 2.4 Handle inline volume if needed

## 3. Audio Queue

- [ ] 3.1 Create AudioQueue class
- [ ] 3.2 Implement enqueue(audioData) method
- [ ] 3.3 Implement automatic next-track on idle
- [ ] 3.4 Implement clear() to empty queue
- [ ] 3.5 Implement skip() to advance to next
- [ ] 3.6 Emit 'queueEmpty' event when done

## 4. Barge-In Detection

- [ ] 4.1 Create BargeInDetector class
- [ ] 4.2 Monitor speaker tracking from audio-input
- [ ] 4.3 Detect when user starts speaking during playback
- [ ] 4.4 Implement immediate stop on barge-in
- [ ] 4.5 Emit 'interrupted' event with context
- [ ] 4.6 Configurable barge-in sensitivity

## 5. Playback Control

- [ ] 5.1 Implement play(audio) method
- [ ] 5.2 Implement stop() method
- [ ] 5.3 Implement pause() / resume() methods
- [ ] 5.4 Implement volume control (if needed)
- [ ] 5.5 Track what the bot "said" for conversation context

## 6. TTS Integration Preparation

- [ ] 6.1 Define AudioSegment interface for TTS output
- [ ] 6.2 Handle streaming TTS (play as chunks arrive)
- [ ] 6.3 Handle complete TTS (play full audio)
- [ ] 6.4 Track TTS latency (time-to-first-audio)

## 7. Testing

- [ ] 7.1 Create PCM audio test fixtures
- [ ] 7.2 Write unit tests for queue management
- [ ] 7.3 Write unit tests for barge-in detection
- [ ] 7.4 Document manual playback testing procedure
