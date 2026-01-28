# npm to Deno 2 Migration Evaluation

**Date:** 2024-12-24
**Project:** Discord Stage AI Bot (letta-stuff)
**Author:** Claude (analysis request)

## Executive Summary

**Verdict: FULL DENO MIGRATION IS FEASIBLE** ✅

After deeper research, the previously-assumed native addon blockers have **existing WASM-based solutions** in the Deno ecosystem. The `discordeno-audio-plugin` project proves that Discord voice bots work in pure Deno using:

- **Opus:** `@evan/wasm` WASM codec
- **Encryption:** `libsodium-wrappers` (WASM)
- **Voice connection:** discordeno + audio plugin

| Factor     | Original Assessment | Revised Assessment                                 |
| ---------- | ------------------- | -------------------------------------------------- |
| Voice/Opus | ❌ Blocker          | ✅ WASM solution exists                            |
| Encryption | ❌ Blocker          | ✅ WASM solution exists                            |
| Wake Word  | ❌ Blocker          | ⚠️ Needs alternative (Node subprocess or WASM VAD) |
| Effort     | ~3-4 weeks          | ~2-3 weeks                                         |
| Risk       | High                | **Medium**                                         |

**Key findings:**

1. `discordeno-audio-plugin` has 33 releases proving Deno voice works
2. WASM opus/sodium have acceptable performance for voice bots
3. Only remaining gap: wake word detection (Picovoice requires native bindings)
4. Full Deno = semantic imports everywhere + simpler deployment

---

## Current Codebase Analysis

### Project Structure

- **24 source files** in `src/`
- **17 test files** using Vitest
- **215 passing tests** (Wave 1 complete)
- TypeScript with commonjs module system
- ts-node-dev for development

### Dependencies Breakdown

#### Runtime Dependencies (6)

| Package                  | Version  | Deno 2 Compatible? | Notes                                |
| ------------------------ | -------- | ------------------ | ------------------------------------ |
| `discord.js`             | ^14.17.3 | ⚠️ Partial         | Works for text, voice is problematic |
| `@discordjs/voice`       | ^0.17.0  | ❌ No              | Requires native opus bindings        |
| `@discordjs/opus`        | ^0.10.0  | ❌ No              | Native C++ addon (node-gyp)          |
| `sodium-native`          | ^5.0.10  | ❌ No              | Native C addon for encryption        |
| `prism-media`            | ^1.3.5   | ⚠️ Partial         | Depends on opus libraries            |
| `@letta-ai/letta-client` | ^1.6.2   | ✅ Yes             | Pure HTTP client                     |
| `dotenv`                 | ^16.4.7  | ✅ Yes             | Simple, Deno has built-in support    |

#### Planned Dependencies (Wave 2)

| Package                     | Purpose             | Deno 2 Compatible? | Notes                       |
| --------------------------- | ------------------- | ------------------ | --------------------------- |
| `@picovoice/porcupine-node` | Wake word detection | ❌ No              | Native Node addon           |
| `@deepgram/sdk`             | Streaming STT       | ✅ Yes             | WebSocket-based HTTP client |
| Cartesia SDK                | TTS                 | ✅ Yes             | HTTP client                 |
| `@elevenlabs/voice`         | TTS fallback        | ✅ Yes             | HTTP client                 |
| `@modelcontextprotocol/sdk` | MCP tools           | ✅ Likely          | Standard protocol library   |

---

## Migration Blockers: Reassessed ✅

After deeper research, **the voice blockers are largely solved** by existing Deno ecosystem solutions:

### 1. Opus Encoding/Decoding: ✅ SOLVED

**Original concern:** `@discordjs/opus` uses native C++ bindings.

**Deno solutions that exist and work:**

| Solution                 | Type              | Status | Used By                 |
| ------------------------ | ----------------- | ------ | ----------------------- |
| `@evan/wasm` opus        | WASM              | Active | discordeno-audio-plugin |
| `deno.land/x/opus@0.1.1` | WASM (Emscripten) | Stable | Community               |

**Evidence:** The `discordeno-audio-plugin` imports opus directly:

```typescript
export opus from "https://unpkg.com/@evan/wasm@0.0.95/target/opus/deno.js"
```

This WASM-based opus encoder/decoder is production-tested and works without native bindings.

### 2. Encryption (libsodium): ✅ SOLVED

**Original concern:** `sodium-native` requires native C bindings.

**Deno solutions:**

| Solution                            | Type            | Status                                             |
| ----------------------------------- | --------------- | -------------------------------------------------- |
| `libsodium-wrappers`                | WASM            | ✅ Works in Deno (used by discordeno-audio-plugin) |
| `deno.land/x/sodium@0.2.0`          | Deno-native     | Stable                                             |
| `deno.land/x/tweetnacl_deno@v1.0.3` | Pure TypeScript | Stable                                             |

**Evidence:** The `discordeno-audio-plugin` uses:

```typescript
import _sodium from "https://esm.sh/libsodium-wrappers@0.7.15";
await _sodium.ready;
export { _sodium as sodium };
```

### 3. Full Discord Voice: ✅ WORKING IMPLEMENTATION EXISTS

**The `discordeno-audio-plugin` proves full Deno voice is possible:**

- **Repository:** github.com/JasperVanEsveld/discordeno-audio-plugin
- **Releases:** 33 versions (most recent addressing YouTube audio)
- **Features:**
  - ✅ Audio playback to Discord voice channels
  - ✅ Audio receiving from users (experimental)
  - ✅ No FFMPEG required for core opus operations
  - ✅ Uses WASM opus + libsodium-wrappers
- **Requirement:** `--unstable` flag (for Deno's datagram API)

### 4. Wake Word Detection: ⚠️ Still a challenge

**Picovoice Porcupine** still requires native bindings. Options:

| Approach                              | Feasibility | Trade-off                                   |
| ------------------------------------- | ----------- | ------------------------------------------- |
| Python subprocess (openWakeWord)      | Medium      | +50-100ms latency, process management       |
| WASM-based VAD + keyword spotting     | Medium      | Less accurate than Porcupine                |
| Node.js subprocess for wake word only | Easy        | Hybrid, but simpler than full voice in Node |
| Vosk WASM                             | Medium      | General STT, not optimized for wake words   |

**Recommendation:** For Wave 2, consider running wake word detection in a lightweight Node subprocess, or evaluate WASM alternatives. This is a smaller scope than the full voice pipeline.

---

## Revised Risk Assessment

| Component                | Original Assessment | Revised Assessment                         |
| ------------------------ | ------------------- | ------------------------------------------ |
| Opus codec               | ❌ Blocker          | ✅ WASM solution exists                    |
| Encryption               | ❌ Blocker          | ✅ WASM solution exists                    |
| Discord voice connection | ❌ Unknown          | ✅ discordeno-audio-plugin proves it works |
| Audio receiving          | ⚠️ Unknown          | ⚠️ Experimental but implemented            |
| Wake word                | ❌ Blocker          | ⚠️ Needs alternative approach              |
| STT (Deepgram)           | ✅ HTTP             | ✅ No change                               |
| TTS (Cartesia)           | ✅ HTTP             | ✅ No change                               |

**Bottom line:** Full Deno voice is possible. The main remaining challenge is wake word detection, which is a smaller, more contained problem.

---

## What Would Work in Deno 2

### Fully Compatible Components

1. **Letta Memory Client** (`@letta-ai/letta-client`)
   - Pure HTTP/fetch based
   - Would work with `npm:@letta-ai/letta-client`

2. **Configuration & Environment**
   - Deno has built-in `.env` support via `--env` flag
   - `dotenv` package also works

3. **Audio Transform Pipeline** (custom code)
   - `Resampler`, `ChannelMixer` - pure TypeScript/Buffer operations
   - Would need minor Buffer → Uint8Array adjustments

4. **STT/TTS HTTP Clients** (future)
   - Deepgram, Cartesia, ElevenLabs are all HTTP-based
   - Would work natively

5. **MCP Integration** (future)
   - Protocol-based, should work

### Partially Compatible

1. **Discord.js Core**
   - Text messaging, events, REST API: ✅
   - Gateway/WebSocket: ✅
   - Voice connections: ❌ (due to opus dependency)

---

## Alternative Approach: Discordeno

There's a Deno-native Discord library called **discordeno** that could replace discord.js.

### Pros

- Built for Deno from the ground up
- No native dependencies for core functionality
- Supports Node.js, Deno, and Bun
- Active development (v21.0.0 released Dec 2024)

### Cons

- Different API surface - significant code rewrite required
- Voice support is less mature than discord.js
- Smaller community/ecosystem
- Still needs opus encoding for voice (same problem)

### Verdict

Switching to discordeno solves some problems but **not** the native opus requirement. Voice bots fundamentally need native audio codecs for acceptable performance.

---

## Migration Cost Estimate

### If We Proceed

| Task                                            | Effort    | Risk      |
| ----------------------------------------------- | --------- | --------- |
| Replace discord.js imports with npm: specifier  | 2-4 hours | Low       |
| Replace sodium-native with tweetnacl/WASM       | 4-8 hours | Medium    |
| Test opus alternatives (opusscript)             | 1-2 days  | High      |
| Update tsconfig for Deno                        | 2-4 hours | Low       |
| Replace Vitest with Deno test                   | 1-2 days  | Medium    |
| Update all Node-specific APIs (Buffer, process) | 1-2 days  | Medium    |
| Fix voice pipeline if opus works                | 2-3 days  | High      |
| OR rewrite for discordeno if opus fails         | 1-2 weeks | Very High |
| Update Wave 2 plans (Picovoice alternative)     | 3-5 days  | High      |
| Integration testing                             | 2-3 days  | Medium    |

**Total Estimate:** 3-4 weeks of focused work

**Risk:** ~40% chance voice pipeline doesn't work acceptably, requiring:

- Fallback to hybrid Node+Deno architecture, OR
- Abandon migration, OR
- Accept degraded audio performance

---

## Benefits of Migration (If Successful)

### Developer Experience

- Single executable, no node_modules by default
- Built-in TypeScript support (no ts-node)
- Built-in formatter and linter
- Better security model with explicit permissions

### Performance

- Faster startup time
- Better resource usage for I/O operations
- Native top-level await

### Modern Features

- Native fetch API
- Built-in test runner
- Web-standard APIs

### Long-term

- Deno is actively investing in Node compatibility
- Single runtime for all TypeScript projects

---

## Recommendation

### Short Term (Now - 6 months): **Stay on Node.js**

**Rationale:**

1. Voice functionality is the core value proposition of this bot
2. Native opus encoding is essentially required for acceptable latency
3. Wave 2 features (wake word, STT) depend on either native code or are not mature on Deno
4. Migration effort would delay feature development significantly

### Medium Term (6-12 months): **Monitor and Reassess**

Watch for:

1. Deno's Node-API addon compatibility improvements
2. WASM-based opus implementations maturing
3. discordeno voice support improvements
4. Alternative wake word solutions that don't require native code

### Long Term: **Consider Hybrid Architecture**

If Deno adoption is important:

1. Run HTTP/API services in Deno
2. Keep voice processing in Node.js subprocess
3. Communicate via IPC or HTTP

---

## Key Questions to Answer First

If you still want to explore migration:

1. **Test opus compatibility:**

   ```bash
   deno run --node-modules-dir=auto -A npm:@discordjs/voice
   ```

   See if it even loads.

2. **Benchmark opusscript:**
   Compare CPU usage of pure-JS opus vs native. For voice bots, this matters a lot.

3. **Evaluate discordeno voice:**
   Check their voice implementation status and test with real Discord audio.

4. **Assess Picovoice alternatives:**
   Can we use a Python subprocess with openWakeWord? What's the latency impact?

---

## Files That Would Need Changes

### Must Modify

- `package.json` → `deno.json`
- `tsconfig.json` → Deno-compatible config
- All imports using `discord.js` (add `npm:` prefix or switch library)
- All `process.env` usage (Deno uses `Deno.env`)
- All `Buffer` usage (use `Uint8Array` or import from `node:buffer`)
- Test files (Vitest → Deno test)

### May Need Modification

- `src/config/index.ts` - env handling
- `src/discord/client.ts` - discord.js imports
- `src/voice/*` - audio processing if Buffer APIs change
- `src/memory/client.ts` - should work, minor import changes

### Would Work As-Is (with npm: prefix)

- `src/memory/blocks.ts`
- `src/memory/labels.ts`
- `src/memory/splitting.ts`
- `src/voice/transform/resampler.ts`
- `src/voice/transform/channel-mixer.ts`

---

## Conclusion

The npm-to-Deno migration is technically possible but **not advisable** for this project at this time. The core value proposition (voice AI in Discord) depends on native audio codecs that have uncertain Deno compatibility.

**If Deno adoption is a strategic priority**, the recommended path is:

1. Complete Wave 2 and Wave 3 on Node.js first
2. Once the product is stable, evaluate migration with a working baseline
3. Consider hybrid architecture if full migration proves problematic

**Estimated break-even point:** The migration would need to save ~3-4 weeks of cumulative development time over the project lifetime to be worth the upfront investment. Given the risks, this seems unlikely for a voice-focused bot.

---

## Strategic Benefit: AI-Agent-Friendly Import Semantics

> _This section addresses the primary motivation for considering Deno: leveraging content-addressable, semantically-dense imports to improve AI agent comprehension of the codebase._

### The Problem with npm/Node.js Imports

In a typical Node.js project, imports look like this:

```typescript
import { Client } from "discord.js";
import { Letta } from "@letta-ai/letta-client";
import { joinVoiceChannel } from "@discordjs/voice";
```

When an AI agent reads this code, it sees:

- **Bare specifiers** with no version information
- No indication of where these come from (npm? local? monorepo?)
- Must cross-reference `package.json` to understand versions
- `node_modules/` is a black box of transitive dependencies

### How Deno Solves This

Deno offers **three layers** of semantic richness:

#### 1. Inline URL Imports (Maximum Context)

```typescript
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";
```

Every import tells you:

- **Registry** (deno.land, jsr.io, esm.sh, npm:)
- **Package name** and scope
- **Exact version** (content-addressable)
- **Entry point file** (mod.ts, index.ts, etc.)

This is _self-documenting code_ - an AI agent can understand the dependency graph without any external lookups.

#### 2. JSR Specifiers (Balanced Readability)

```typescript
import { copy } from "jsr:@std/fs@^1.0.2";
import { join } from "jsr:@std/path@^1.0.3";
import { oakCors } from "jsr:@tajpouria/cors@1.0.1";
```

JSR imports provide:

- **Registry prefix** (`jsr:`) - immediately identifies source
- **Scoped naming** (`@std/fs`) - clear organization
- **Semver constraints** visible inline
- **No node_modules indirection**

#### 3. Import Maps (Centralized + Clean Code)

```json
// deno.json
{
  "imports": {
    "@std/fs": "jsr:@std/fs@^1.0.2",
    "@std/path": "jsr:@std/path@^1.0.3",
    "@letta/client": "npm:@letta-ai/letta-client@^1.6.2",
    "@/": "./src/"
  }
}
```

```typescript
// In source files - clean imports, but deno.json is the single source of truth
import { copy } from "@std/fs";
import { Letta } from "@letta/client";
import { config } from "@/config/index.ts";
```

**For AI agents**, reading `deno.json` once provides complete dependency context that can be held in memory while analyzing any file.

### Why This Matters for AI-Assisted Development

| Aspect                   | npm/Node.js                                     | Deno                                         |
| ------------------------ | ----------------------------------------------- | -------------------------------------------- |
| **Dependency discovery** | Parse package.json + lock file                  | Single deno.json or inline specifiers        |
| **Version visibility**   | Hidden in lockfile                              | Visible in import or deno.json               |
| **Transitive deps**      | node_modules maze                               | Cached globally, inspectable via `deno info` |
| **File resolution**      | Complex algorithm (index.js, .mjs, exports map) | Explicit file extensions required            |
| **Type discovery**       | @types/\* packages, module augmentation         | TypeScript-first, types bundled              |

When an AI reads Deno code:

1. **No ambiguity** - imports resolve to exactly one thing
2. **Self-contained context** - deno.json + source files = complete picture
3. **Greppable versions** - `jsr:@std/fs@1.0.2` is searchable
4. **Web-standard patterns** - URL imports match browser mental model

### Deno Standard Library Advantage

The `@std/*` packages are particularly valuable:

```typescript
import { parse } from "jsr:@std/yaml@1.0.5";
import { format } from "jsr:@std/datetime@0.225.2";
import { retry } from "jsr:@std/async@1.0.5";
```

Benefits:

- **Curated by Deno team** - consistent quality
- **Cross-runtime compatible** - works in Node too via `npx jsr add`
- **Semantic naming** - `@std/path`, `@std/fs`, `@std/http` are obvious
- **No left-pad incidents** - audited, stable, here to stay

---

## Recommended Hybrid Architecture

Given the voice pipeline blockers but the strategic value of Deno's import semantics, here's an architecture that captures both:

### Architecture: "Deno Orchestrator + Node Voice Worker"

```
┌─────────────────────────────────────────────────────────────────┐
│                        DENO PROCESS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ HTTP/API     │  │ LLM Client   │  │ Memory (Letta)         │ │
│  │ (Hono/Oak)   │  │ (Anthropic)  │  │ MCP Integration        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ STT Client   │  │ TTS Client   │  │ Orchestration Logic    │ │
│  │ (Deepgram)   │  │ (Cartesia)   │  │ Turn-taking, Relevance │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                           │                                      │
│                     IPC / HTTP                                   │
│                           │                                      │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                           ▼              NODE PROCESS            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Discord.js   │  │ @discordjs/  │  │ Opus Encode/Decode     │ │
│  │ Gateway      │  │ voice        │  │ sodium-native          │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ Picovoice    │  │ Audio I/O    │    (Native bindings stay   │
│  │ Wake Word    │  │ Streams      │     in Node subprocess)    │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Division of Responsibilities

| Layer                | Runtime | Why                                                      |
| -------------------- | ------- | -------------------------------------------------------- |
| **Orchestration**    | Deno    | Pure logic, HTTP clients, benefits from semantic imports |
| **Memory/Letta**     | Deno    | HTTP-only, `@letta-ai/letta-client` works fine           |
| **STT/TTS Clients**  | Deno    | HTTP/WebSocket, no native deps                           |
| **LLM Integration**  | Deno    | HTTP clients, streaming responses                        |
| **MCP Tools**        | Deno    | Protocol-based, clean abstractions                       |
| **Discord Gateway**  | Node    | Native WebSocket works, but less critical                |
| **Voice Connection** | Node    | **Must stay Node** - opus, sodium, prism-media           |
| **Wake Word**        | Node    | Picovoice native bindings                                |
| **Audio Streams**    | Node    | Buffer-heavy, tight integration with voice               |

### Communication Protocol

```typescript
// Deno → Node: Commands
interface VoiceCommand {
  type: "join_channel" | "leave_channel" | "speak" | "stop_speaking";
  guildId: string;
  channelId?: string;
  audio?: Uint8Array; // PCM for TTS playback
}

// Node → Deno: Events
interface VoiceEvent {
  type:
    | "wake_word"
    | "speech_start"
    | "speech_end"
    | "transcript"
    | "user_joined";
  userId: string;
  guildId: string;
  data?: {
    transcript?: string;
    audioChunk?: Uint8Array;
    confidence?: number;
  };
}
```

Options for IPC:

1. **HTTP** (simplest) - Local HTTP server in Node, Deno calls it
2. **WebSocket** - Bidirectional, good for streaming audio chunks
3. **Unix sockets** - Lower latency, Deno supports via `Deno.connect()`
4. **Subprocess stdio** - Deno spawns Node, communicates via stdin/stdout

### Suggested File Structure

```
letta-discord-bot/
├── deno.json                    # Deno orchestrator config
├── src/
│   ├── main.ts                  # Deno entry point
│   ├── orchestration/
│   │   ├── relevance.ts         # When to speak
│   │   ├── turn-manager.ts      # Turn-taking logic
│   │   └── llm-client.ts        # Claude/GPT streaming
│   ├── memory/
│   │   ├── letta-client.ts      # jsr:@letta-ai/client (future)
│   │   └── blocks.ts            # Memory block management
│   ├── stt/
│   │   └── deepgram.ts          # jsr:@deepgram/sdk or HTTP
│   ├── tts/
│   │   └── cartesia.ts          # HTTP streaming client
│   └── voice-bridge/
│       └── client.ts            # IPC to Node voice worker
│
├── voice-worker/                # Node.js subprocess
│   ├── package.json             # Node dependencies (discord.js, opus, etc.)
│   ├── src/
│   │   ├── index.ts             # Node entry point
│   │   ├── discord-voice.ts     # @discordjs/voice integration
│   │   ├── wake-word.ts         # Picovoice Porcupine
│   │   └── ipc-server.ts        # Listens for Deno commands
│   └── tsconfig.json
│
└── shared/                      # Shared types (can be a JSR package)
    └── types.ts                 # VoiceCommand, VoiceEvent interfaces
```

### Migration Path

**Phase 1: Extract orchestration to Deno (Low Risk)**

- Move `src/memory/*` to Deno (already HTTP-only)
- Move future STT/TTS clients to Deno
- Keep all voice code in Node

**Phase 2: Build voice bridge (Medium Risk)**

- Create IPC protocol between Deno and Node
- Node becomes a "voice worker" subprocess
- Deno becomes the "brain"

**Phase 3: Expand Deno scope (Low Risk)**

- Add MCP integration in Deno
- Add LLM orchestration in Deno
- Node only handles audio I/O

### Benefits of This Approach

1. **Best of both worlds**
   - Deno's semantic imports for AI-readable code
   - Node's native addon support for audio

2. **Incremental migration**
   - No big-bang rewrite required
   - Can pause at any phase with working system

3. **Clean architecture**
   - Forces separation between "thinking" and "hearing/speaking"
   - Voice worker is a replaceable component

4. **Future-proof**
   - If Deno gets better native addon support, can migrate voice later
   - If discordeno voice matures, can swap out Node worker

### Effort Estimate for Hybrid

| Phase                               | Effort   | Risk   |
| ----------------------------------- | -------- | ------ |
| Phase 1: Deno orchestrator skeleton | 2-3 days | Low    |
| Phase 1: Migrate memory module      | 1 day    | Low    |
| Phase 2: IPC protocol design        | 1 day    | Low    |
| Phase 2: Node voice worker          | 2-3 days | Medium |
| Phase 2: Integration testing        | 2 days   | Medium |
| Phase 3: Full orchestration         | Ongoing  | Low    |

**Total for MVP hybrid:** ~1.5-2 weeks

This is **significantly less risky** than full migration because:

- Voice pipeline stays untouched in Node
- Can validate Deno benefits incrementally
- Fallback to Node-only is always available

---

## Updated Recommendation

Given the strategic value of Deno's import semantics AND the discovery of working WASM-based voice solutions:

### Revised Verdict: **Full Deno Migration is Viable**

| Approach                    | Recommendation     | When to Choose                                |
| --------------------------- | ------------------ | --------------------------------------------- |
| **Full Deno (discordeno)**  | ✅ **Recommended** | Maximum AI-agent benefits, simpler deployment |
| Hybrid (Deno + Node worker) | ✅ Viable          | If WASM performance is insufficient           |
| Stay pure Node.js           | ⚠️ Works           | If migration effort can't be justified        |

### Recommended Path: Full Deno with discordeno

**Stack:**

```
discordeno (v21+)           # Discord API
discordeno-audio-plugin     # Voice connections, opus, sodium
@evan/wasm opus             # WASM-based codec
libsodium-wrappers          # WASM-based encryption
jsr:@std/*                  # Standard library
```

**Immediate next steps:**

1. **Spike test:** Create minimal discordeno voice bot to validate WASM opus latency
2. **Port memory module:** Move `src/memory/*` to Deno (already HTTP-only)
3. **Evaluate wake word alternatives:** Test openWakeWord via subprocess or WASM VAD
4. **Incremental migration:** Port remaining modules file-by-file

### Wake Word Strategy (Wave 2)

Since Picovoice requires native bindings, options ranked by preference:

1. **WASM VAD + simple keyword detection** - Fully Deno, may be less accurate
2. **openWakeWord via Python subprocess** - +50ms latency, proven accuracy
3. **Tiny Node subprocess for wake word only** - Native Porcupine, minimal hybrid
4. **Defer wake word** - Use @-mention or voice activity only initially

**This gives you:**

- Semantic imports everywhere (not just orchestration)
- Single runtime, simpler deployment
- Proven WASM voice stack
- Clean migration path with fallback to hybrid if needed

---

## References

### Deno Core

- [Deno Node Compatibility Docs](https://docs.deno.com/runtime/fundamentals/node/)
- [Deno Node-API Addons](https://docs.deno.com/runtime/fundamentals/node/#node-api-addons)
- [Deno Configuration (deno.json)](https://docs.deno.com/runtime/fundamentals/configuration/)
- [Deno Modules & Dependencies](https://docs.deno.com/runtime/fundamentals/modules/)

### JSR & Standard Library

- [JSR - JavaScript Registry](https://jsr.io/) - Deno's TypeScript-first package registry
- [JSR Introduction Blog Post](https://deno.com/blog/jsr_open_beta) - Design goals & rationale
- [Deno Standard Library (@std)](https://jsr.io/@std) - Audited, cross-runtime modules
- [Publishing to JSR](https://jsr.io/docs/publishing-packages)

### Discord Libraries (Deno)

- [discordeno](https://github.com/discordeno/discordeno) - Deno-native Discord library (v21+)
- [discordeno-audio-plugin](https://github.com/JasperVanEsveld/discordeno-audio-plugin) - **Key: Proves Deno voice works**
- [harmony](https://github.com/harmonyland/harmony) - Alternative Deno Discord library

### WASM Audio/Crypto (Deno-Compatible)

- [@evan/wasm opus](https://unpkg.com/@evan/wasm@0.0.95/target/opus/deno.js) - WASM opus codec
- [deno.land/x/opus](https://deno.land/x/opus@0.1.1) - Emscripten-based opus bindings
- [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers) - WASM sodium (works in Deno)
- [deno.land/x/sodium](https://deno.land/x/sodium@0.2.0) - Deno sodium bindings
- [deno.land/x/tweetnacl_deno](https://deno.land/x/tweetnacl_deno@v1.0.3) - TweetNaCl for Deno

### Discord Libraries (Node.js)

- [@discordjs/voice](https://github.com/discordjs/voice) - Node.js voice implementation
- [@discordjs/opus](https://github.com/discordjs/opus) - Native opus bindings (Node only)

### Wake Word Alternatives

- [openWakeWord](https://github.com/dscripka/openWakeWord) - Python, open-source, ~1.6k stars
- [Vosk](https://alphacephei.com/vosk/) - Has WASM build, general STT
