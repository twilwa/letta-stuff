## 1. Dependencies Setup

- [ ] 1.1 Install @deepgram/sdk
- [ ] 1.2 Set up DEEPGRAM_API_KEY in environment
- [ ] 1.3 Configure Deepgram project settings

## 2. Deepgram Client

- [ ] 2.1 Create DeepgramClient wrapper class
- [ ] 2.2 Initialize WebSocket connection to Deepgram
- [ ] 2.3 Configure for streaming transcription
- [ ] 2.4 Set language model (nova-2 or nova-3)
- [ ] 2.5 Enable interim results for low latency
- [ ] 2.6 Handle WebSocket reconnection

## 3. STT Manager

- [ ] 3.1 Create STTManager class
- [ ] 3.2 Accept 16kHz mono PCM from transform pipeline
- [ ] 3.3 Emit 'transcript' events with partial results
- [ ] 3.4 Emit 'finalTranscript' events with completed utterances
- [ ] 3.5 Include speaker userId in transcript events
- [ ] 3.6 Track transcription latency

## 4. Transcript Aggregation

- [ ] 4.1 Create TranscriptAggregator class
- [ ] 4.2 Buffer partial transcripts per user
- [ ] 4.3 Merge partials into complete utterances
- [ ] 4.4 Handle overlapping speech from multiple users
- [ ] 4.5 Emit aggregated transcripts to orchestration

## 5. Integration

- [ ] 5.1 Connect to AudioTransformPipeline output
- [ ] 5.2 Route per-user audio streams to Deepgram
- [ ] 5.3 Forward transcripts to orchestration layer
- [ ] 5.4 Handle connection lifecycle cleanup

## 6. Testing

- [ ] 6.1 Create mock Deepgram WebSocket for unit tests
- [ ] 6.2 Write unit tests for transcript aggregation
- [ ] 6.3 Write unit tests for reconnection handling
- [ ] 6.4 Create integration test with real Deepgram (optional)
