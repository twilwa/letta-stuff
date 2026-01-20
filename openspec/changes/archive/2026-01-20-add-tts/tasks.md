## 1. Dependencies Setup

- [x] 1.1 Install Cartesia SDK or configure API client
- [x] 1.2 Install @elevenlabs/voice as fallback
- [x] 1.3 Set up CARTESIA_API_KEY in environment
- [x] 1.4 Set up ELEVENLABS_API_KEY in environment (fallback)

## 2. Cartesia Client

- [x] 2.1 Create CartesiaClient wrapper class
- [x] 2.2 Initialize streaming TTS connection
- [x] 2.3 Configure voice selection
- [x] 2.4 Stream PCM audio chunks as generated
- [x] 2.5 Handle connection errors
- [x] 2.6 Track time-to-first-audio latency

## 3. ElevenLabs Fallback

- [x] 3.1 Create ElevenLabsClient wrapper class
- [x] 3.2 Initialize streaming TTS connection
- [x] 3.3 Configure voice selection
- [x] 3.4 Implement same interface as Cartesia

## 4. TTS Manager

- [x] 4.1 Create TTSManager class
- [x] 4.2 Accept text input for synthesis
- [x] 4.3 Return AudioSegment with streaming data
- [x] 4.4 Support voice and speed configuration
- [x] 4.5 Implement provider fallback on failure
- [x] 4.6 Track synthesis latency metrics

## 5. Audio Output Integration

- [x] 5.1 Connect TTS output to AudioOutputManager (TTSOutputBridge)
- [x] 5.2 Create AudioSegment from TTS stream
- [x] 5.3 Handle streaming vs complete audio modes
- [x] 5.4 Support barge-in cancellation

## 6. Testing

- [x] 6.1 Create mock TTS providers for unit tests
- [x] 6.2 Write unit tests for streaming output
- [x] 6.3 Write unit tests for fallback behavior
- [x] 6.4 Write unit tests for TTSOutputBridge (17 tests)
