# Agent

The voice agent for this project, based on [`agent-starter-node`](https://github.com/livekit-examples/agent-starter-node). It runs a LiveKit Inference pipeline (STT, LLM, TTS) and publishes transcripts on `lk.transcription` by default, which is what the recording template turns into captions.

The one change from the starter is in [`src/recording.ts`](src/recording.ts). When the dispatch metadata contains `{"waitForRecording": true}`, the agent waits for `room.isRecording` (up to 15 seconds) before it greets. Without that wait, the greeting plays before the egress recorder joins, and its audio and caption are missing from the recording.

```bash
lk agent dev
```

```bash
pnpm test
```

See the [root README](../README.md) for the full setup.
