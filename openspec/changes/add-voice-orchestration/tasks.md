## 1. LLM Client Setup

- [ ] 1.1 Create LLMClient abstraction
- [ ] 1.2 Implement Claude provider (Anthropic SDK)
- [ ] 1.3 Implement GPT provider (OpenAI SDK)
- [ ] 1.4 Support streaming responses
- [ ] 1.5 Include conversation history in context
- [ ] 1.6 Integrate Letta memory blocks

## 2. Relevance Scoring

- [ ] 2.1 Create RelevanceScorer class
- [ ] 2.2 Implement topic relevance scoring
- [ ] 2.3 Implement contribution value scoring
- [ ] 2.4 Configure relevance thresholds
- [ ] 2.5 Track scoring latency

## 3. Turn Manager

- [x] 3.1 Create TurnManager class
- [x] 3.2 Track current speakers
- [x] 3.3 Detect floor availability (isFloorOpen)
- [ ] 3.4 Implement turn budgeting (bot vs human speech ratio)
- [x] 3.5 Implement cool-down periods after speaking
- [ ] 3.6 Handle barge-in events

## 4. Voice Orchestrator

- [x] 4.1 Create VoiceOrchestrator class
- [ ] 4.2 Connect to wake word detector
- [x] 4.3 Connect to STT manager
- [x] 4.4 Connect to TTS manager
- [x] 4.5 Implement shouldSpeak() decision logic (direct address)
- [x] 4.6 Route transcripts to LLM (Letta)
- [x] 4.7 Route LLM responses to TTS
- [ ] 4.8 Handle interruption gracefully

## 5. Response Generation

- [ ] 5.1 Build prompt with conversation context
- [ ] 5.2 Include user memory from Letta
- [ ] 5.3 Stream response to TTS
- [ ] 5.4 Track response latency
- [ ] 5.5 Handle response cancellation on barge-in

## 6. Rate Limiting

- [ ] 6.1 Implement max responses per minute
- [ ] 6.2 Implement turn budgeting limits
- [ ] 6.3 Track bot speaking time vs listening time
- [ ] 6.4 Emit warnings when approaching limits

## 7. Testing

- [ ] 7.1 Create mocks for all voice components
- [ ] 7.2 Write unit tests for relevance scoring
- [ ] 7.3 Write unit tests for turn management
- [ ] 7.4 Write unit tests for shouldSpeak logic
- [ ] 7.5 Create integration test scenarios
