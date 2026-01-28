## 1. Dependencies Setup

- [ ] 1.1 Install @picovoice/porcupine-node
- [ ] 1.2 Set up Picovoice access key in environment
- [ ] 1.3 Create or download custom wake word model (via Porcupine console)
- [ ] 1.4 Add keywords/ directory for wake word models

## 2. Porcupine Integration

- [ ] 2.1 Create PorcupineWrapper class
- [ ] 2.2 Initialize Porcupine with custom wake word
- [ ] 2.3 Configure for 16kHz mono PCM input
- [ ] 2.4 Process audio frames (512 samples per frame)
- [ ] 2.5 Handle detection callback with keyword index
- [ ] 2.6 Track detection confidence scores

## 3. Wake Word Detector

- [ ] 3.1 Create WakeWordDetector class
- [ ] 3.2 Accept audio stream from AudioTransformPipeline
- [ ] 3.3 Buffer audio into correct frame size
- [ ] 3.4 Emit 'detected' event with userId
- [ ] 3.5 Track detection latency metrics
- [ ] 3.6 Support multiple wake words

## 4. Integration

- [ ] 4.1 Connect to AudioInputManager output
- [ ] 4.2 Route through AudioTransformPipeline (48kHz→16kHz)
- [ ] 4.3 Forward detection events to orchestration layer
- [ ] 4.4 Handle cleanup on connection destroy

## 5. Testing

- [ ] 5.1 Create mock Porcupine for unit tests
- [ ] 5.2 Create audio fixtures with wake words
- [ ] 5.3 Write unit tests for frame buffering
- [ ] 5.4 Write unit tests for detection events
- [ ] 5.5 Document manual testing procedure
