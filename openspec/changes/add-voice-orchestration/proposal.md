# Change: Add Voice Orchestration

## Why

The bot needs intelligent decision-making about when to speak, what to say, and how to handle interruptions. This is the "brain" that connects STT transcripts to LLM processing to TTS output, implementing the relevance-threshold speaking pattern from the architecture plan.

## What Changes

- Create VoiceOrchestrator to coordinate all voice components
- Implement relevance scoring for unprompted speaking
- Integrate with Claude/GPT for response generation
- Implement rate limiting and turn budgeting
- Handle barge-in gracefully (stop speaking, acknowledge interruption)
- Track conversation context across turns

## Impact

- Affected specs: `voice-orchestration` (new capability)
- Affected code: `src/voice/orchestration/`
- **Workstreams touching this spec:**
  - This proposal (integration layer)
  - Uses all other voice modules

## Module Architecture

```
src/voice/
├── orchestration/
│   ├── index.ts           # VoiceOrchestrator
│   ├── relevance.ts       # Relevance scoring
│   ├── turn-manager.ts    # Turn-taking logic
│   ├── llm-client.ts      # Claude/GPT integration
│   └── types.ts           # Config and events
```

## Core Logic

```typescript
function shouldSpeak(context, transcription): boolean {
  if (containsWakeWord(transcription)) return true;
  if (wasDirectlyAddressed(transcription)) return true;
  
  const relevance = scoreRelevance(context.topic, botKnowledge);
  const floorOpen = turnDetector.isFloorOpen();
  
  return relevance > 0.8 && floorOpen;
}
```

## Dependencies

- All voice modules (wake-word, stt, tts, audio-input, audio-output)
- Anthropic SDK or OpenAI SDK for LLM
- Letta memory for context

## Blocked By

- `add-wake-word` - Needs wake word detection
- `add-stt` - Needs transcripts
- `add-tts` - Needs speech synthesis

## Blocks

- Nothing (this is the integration layer)
