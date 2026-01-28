# Change: Add Collaborative DAW Integration (Stage Orchestra)

## Why

Musicians want to collaborate in real-time with their communities, but current tools either:
- Require everyone to have DAW expertise (Ableton Link sessions)
- Lack creative direction/curation (free-for-all jamming)
- Don't integrate with Discord's social layer

**Stage Orchestra** bridges this gap: one musician "conducts" while community members contribute samples, competing for slots in a live-building track. The orchestrator curates, the audience participates, and the result streams back through Discord.

## What Changes

### Core Concept: Competitive Sample Contribution

1. **Orchestrator Mode** - One user becomes the conductor
   - Requests samples by category: "I need a bass line, 120 BPM, minor key"
   - Reviews submissions, picks winners
   - Controls DAW arrangement via OSC/MIDI

2. **Contributor Mode** - Community members submit samples
   - Upload from personal library or record live
   - Samples auto-analyzed (BPM, key, type)
   - Compete for selection

3. **Track Building** - Winning samples go to DAW
   - Orchestrator places samples in arrangement
   - Discord streams the work-in-progress mix
   - Iterative: drums → bass → melody → fx → vocals

### DAW Integration Strategy

**Primary: Ableton Live via AbletonOSC**
- Best OSC support (654⭐ AbletonOSC project)
- Ableton Link for tempo sync
- Full control: tracks, clips, scenes, devices, transport

**Secondary: FL Studio via Flapi/MIDI**
- No native OSC (FL limitation)
- Use MIDI scripting API + Flapi bridge
- More limited control surface

**Protocol Stack:**
```
Discord Bot ←→ Node.js OSC Server ←→ DAW
     ↑              ↑
  WebSocket    AbletonOSC / Flapi
```

### Audio Pipeline

**Sample Ingestion:**
```
User Upload → BPM/Key Analysis → Metadata Tagging → Sample Library
                   ↓
           (web-audio-beat-detector, chromaprint)
```

**Playback to Discord:**
```
DAW Master Out → Audio Interface → Bot Audio Input → Discord Voice
       ↑
  (or Lavalink for pre-mixed tracks)
```

### New Components

| Component | Purpose |
|-----------|---------|
| `OrchestratorSession` | Manages conductor state, sample requests, voting |
| `SampleLibrary` | Per-user sample storage, metadata, search |
| `SampleAnalyzer` | BPM/key detection, fingerprinting |
| `DAWBridge` | OSC/MIDI abstraction for Ableton/FL |
| `MixMonitor` | Captures DAW output, streams to Discord |

## Impact

- **New specs**: `collaborative-daw`, `sample-library`, `daw-bridge`
- **Modified specs**: `voice-orchestration` (add orchestrator role)
- **New dependencies**: `osc.js` or `node-osc`, `ableton-js`, `web-audio-beat-detector`
- **External requirements**: 
  - AbletonOSC MIDI Remote Script installed
  - Audio routing (BlackHole/VB-Cable) for DAW→Discord

## Technical Constraints

### Discord Limitations
- Max 384 kbps audio (Level 3 boost)
- 48 kHz Opus only
- Single audio stream per bot (must pre-mix)
- ~100ms latency floor

### DAW Limitations
- **Ableton**: Full OSC via AbletonOSC, Link for sync ✅
- **FL Studio**: No OSC, limited to MIDI scripting ⚠️
- Neither supports remote sample loading natively

### Proposed Workaround for Sample Loading
1. User submits sample → stored in shared folder DAW can access
2. Bot sends OSC to trigger "Load Sample" macro in DAW
3. DAW loads from watched folder

## Architecture Options

### Option A: DAW as Source of Truth (Recommended)
```
Discord ←OSC→ DAW (Ableton)
              ↓
         Audio Out → Discord Voice
```
- DAW handles all mixing, effects, arrangement
- Bot is just a controller + audio router
- Lowest complexity, best audio quality

### Option B: Hybrid with Lavalink
```
Discord ←OSC→ DAW (arrangement only)
              ↓
         Export Stems → Lavalink → Discord
```
- DAW for creative arrangement
- Lavalink for Discord playback
- More infrastructure, but avoids audio routing

### Option C: Full Bot-Side (No DAW)
```
Discord ←→ Node.js Mixer ←→ Discord Voice
```
- Use Tone.js/Web Audio for mixing
- No external DAW needed
- Limited to basic mixing, no pro effects

## Phases

### Phase 1: Foundation
- [ ] OSC bridge to Ableton (transport, tempo, basic control)
- [ ] Sample upload + analysis (BPM, key)
- [ ] Basic orchestrator commands (/request-sample, /select-sample)

### Phase 2: Sample Competition
- [ ] Sample library per user
- [ ] Voting/selection system
- [ ] Auto-load samples to DAW watched folder

### Phase 3: Live Streaming
- [ ] DAW output → Discord audio pipeline
- [ ] Real-time mix monitoring
- [ ] Barge-in handling (pause when orchestrator speaks)

### Phase 4: Advanced DAW Control
- [ ] Scene triggering
- [ ] Effect parameter control
- [ ] Clip launching from Discord

## Open Questions

1. **Audio routing**: BlackHole (Mac) vs VB-Cable (Windows) vs hardware loopback?
2. **Sample licensing**: How to handle copyright for user-submitted samples?
3. **Latency budget**: Is ~100ms acceptable for "real-time" collaboration?
4. **FL Studio support**: Worth the complexity given limited OSC?
5. **Multi-DAW sessions**: Should we support Ableton Link for multiple DAW users?

## References

- [AbletonOSC](https://github.com/ideoforms/AbletonOSC) - 654⭐, active
- [AbletonJS](https://github.com/leolabs/ableton-js) - 488⭐, TypeScript
- [node-osc](https://github.com/MylesBorins/node-osc) - 456⭐, simple API
- [web-audio-beat-detector](https://www.npmjs.com/package/web-audio-beat-detector) - BPM analysis
- [Ableton Link](https://ableton.github.io/link/) - Tempo sync protocol
