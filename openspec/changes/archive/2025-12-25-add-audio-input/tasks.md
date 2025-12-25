## 1. Audio Stream Subscription

- [ ] 1.1 Create AudioInputManager class
- [ ] 1.2 Access VoiceReceiver from VoiceConnection
- [ ] 1.3 Implement subscribe(userId) for specific user
- [ ] 1.4 Implement subscribeAll() for all speaking users
- [ ] 1.5 Handle 'start' event on speaking subscription
- [ ] 1.6 Handle stream 'data' events (Opus packets)
- [ ] 1.7 Handle stream 'end' event (user stopped speaking)

## 2. Speaker Tracking

- [ ] 2.1 Create SpeakerTracker class
- [ ] 2.2 Map SSRC to Discord user ID
- [ ] 2.3 Track current speakers (Set of user IDs)
- [ ] 2.4 Emit 'speakingStart' event with userId
- [ ] 2.5 Emit 'speakingStop' event with userId and duration
- [ ] 2.6 Implement isFloorOpen() (is anyone speaking?)
- [ ] 2.7 Track speaking duration per user

## 3. Audio Buffering

- [ ] 3.1 Create AudioBuffer class (ring buffer)
- [ ] 3.2 Store raw Opus packets per user
- [ ] 3.3 Implement configurable buffer size (e.g., 5 seconds)
- [ ] 3.4 Handle buffer overflow (drop oldest)
- [ ] 3.5 Provide sliding window access for processing
- [ ] 3.6 Track buffer latency for debugging

## 4. Event System

- [ ] 4.1 Emit 'audio' event with userId and Opus data
- [ ] 4.2 Emit 'speakingStart' when user begins speaking
- [ ] 4.3 Emit 'speakingStop' when user stops speaking
- [ ] 4.4 Provide event subscription API for other modules

## 5. Cleanup

- [ ] 5.1 Unsubscribe from user on disconnect
- [ ] 5.2 Clear buffers on connection destroy
- [ ] 5.3 Handle guild leave cleanup

## 6. Testing

- [ ] 6.1 Create mock audio stream for testing
- [ ] 6.2 Write unit tests for speaker tracking
- [ ] 6.3 Write unit tests for ring buffer
- [ ] 6.4 Create sample Opus packet fixtures
