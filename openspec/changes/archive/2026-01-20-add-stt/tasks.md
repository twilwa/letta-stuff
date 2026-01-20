## 1. Dependencies Setup

- [x] 1.1 Install @deepgram/sdk
- [x] 1.2 Set up DEEPGRAM_API_KEY in environment
- [x] 1.3 Configure Deepgram project settings

## 2. Deepgram Client

- [x] 2.1 Create DeepgramClient wrapper class
- [x] 2.2 Initialize WebSocket connection to Deepgram
- [x] 2.3 Configure for streaming transcription
- [x] 2.4 Set language model (nova-2 or nova-3)
- [x] 2.5 Enable interim results for low latency
- [x] 2.6 Handle WebSocket reconnection

## 3. STT Manager

- [x] 3.1 Create STTManager class
- [x] 3.2 Accept 16kHz mono PCM from transform pipeline
- [x] 3.3 Emit 'transcript' events with partial results
- [x] 3.4 Emit 'finalTranscript' events with completed utterances
- [x] 3.5 Include speaker userId in transcript events
- [x] 3.6 Track transcription latency

## 4. Transcript Aggregation

- [x] 4.1 Create TranscriptAggregator class
- [x] 4.2 Buffer partial transcripts per user
- [x] 4.3 Merge partials into complete utterances
- [x] 4.4 Handle overlapping speech from multiple users
- [x] 4.5 Emit aggregated transcripts to orchestration

## 5. Integration

- [x] 5.1 Connect to AudioTransformPipeline output (STTInputBridge)
- [x] 5.2 Route per-user audio streams to Deepgram
- [x] 5.3 Forward transcripts to orchestration layer
- [x] 5.4 Handle connection lifecycle cleanup

## 6. Testing

- [x] 6.1 Create mock Deepgram WebSocket for unit tests
- [x] 6.2 Write unit tests for transcript aggregation (37 tests)
- [x] 6.3 Write unit tests for STTManager (21 tests)
- [x] 6.4 Write unit tests for STTInputBridge (22 tests)
