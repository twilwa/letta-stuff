## 1. Dependencies Setup

- [ ] 1.1 Install Cartesia SDK or configure API client
- [ ] 1.2 Install @elevenlabs/voice as fallback
- [ ] 1.3 Set up CARTESIA_API_KEY in environment
- [ ] 1.4 Set up ELEVENLABS_API_KEY in environment (fallback)

## 2. Cartesia Client

- [ ] 2.1 Create CartesiaClient wrapper class
- [ ] 2.2 Initialize streaming TTS connection
- [ ] 2.3 Configure voice selection
- [ ] 2.4 Stream PCM audio chunks as generated
- [ ] 2.5 Handle connection errors
- [ ] 2.6 Track time-to-first-audio latency

## 3. ElevenLabs Fallback

- [ ] 3.1 Create ElevenLabsClient wrapper class
- [ ] 3.2 Initialize streaming TTS connection
- [ ] 3.3 Configure voice selection
- [ ] 3.4 Implement same interface as Cartesia

## 4. TTS Manager

- [ ] 4.1 Create TTSManager class
- [ ] 4.2 Accept text input for synthesis
- [ ] 4.3 Return AsyncGenerator<Buffer> of PCM chunks
- [ ] 4.4 Support voice and speed configuration
- [ ] 4.5 Implement provider fallback on failure
- [ ] 4.6 Track synthesis latency metrics

## 5. Audio Output Integration

- [ ] 5.1 Connect TTS output to AudioOutputManager
- [ ] 5.2 Create AudioSegment from TTS stream
- [ ] 5.3 Handle streaming vs complete audio modes
- [ ] 5.4 Support barge-in cancellation

## 6. Testing

- [ ] 6.1 Create mock TTS providers for unit tests
- [ ] 6.2 Write unit tests for streaming output
- [ ] 6.3 Write unit tests for fallback behavior
- [ ] 6.4 Create audio fixtures for verification
