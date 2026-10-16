# Egress captions

Burn live captions into LiveKit [RoomComposite egress](https://docs.livekit.io/transport/media/ingress-egress/egress/composite-recording/) recordings, for both the agent's speech and the user's. No egress changes or agent plugins are needed.

`AgentSession` already sends every transcript to all participants on the `lk.transcription` text stream. That includes the hidden egress recorder. This project's [custom recording template](https://docs.livekit.io/transport/media/ingress-egress/egress/custom-template/) listens to that stream and draws captions over the grid, so they're burned into the MP4. Each user chooses whether captions appear in the recording, on their own screen, both, or neither.

## How it works

```
call page (client.html) ── POST /api/session ──▶ CreateRoom with auto egress ──▶ egress loads index.html
        │                                         + dispatch agent                    (hidden recorder)
        │ captions = off | recording | on                                                     │
        ▼ (participant attribute)                                                             ▼
    LiveKit room ◀──── agent publishes audio + lk.transcription ────▶ template draws captions ──▶ MP4 in your bucket
```

| Path | What it is |
| --- | --- |
| [`agent/`](agent/) | Voice agent based on `agent-starter-node`. It waits for recording to start before greeting. |
| [`web/`](web/) | The recording template (`index.html`), the call page (`client.html`) and the session endpoint. |

## Caption modes

The call page sets a `captions` attribute on the user's participant. The recording template reads it live.

| Mode | User sees captions | Recording has captions |
| --- | --- | --- |
| Off | no | no |
| Recording only (default) | no | yes |
| On | yes | yes |

The recording shows captions while **any** participant has `recording` or `on`. Changing the mode mid-call takes effect in the recording from that moment.

## Getting started

You'll need the [LiveKit CLI](https://docs.livekit.io/intro/basics/cli/) (2.18.8 or later), Node.js 24, pnpm and a [LiveKit Cloud](https://cloud.livekit.io/) project. A storage bucket is only needed to save recordings.

### See the captions

This needs only your LiveKit keys: no bucket, no tunnel.

1. Install dependencies and create your env file:

   ```bash
   pnpm bootstrap
   ```

   ```bash
   cp agent/.env.example agent/.env.local
   ```

   Fill in the `LIVEKIT_*` values, or run `lk app env --write --destination agent/.env.local`. Leave the recording settings empty for now.

2. Start the agent:

   ```bash
   pnpm dev:agent
   ```

3. In a second terminal, start the template and call page:

   ```bash
   pnpm dev:web
   ```

4. Open the call page, set captions to **On**, and start a call:

   ```bash
   open http://localhost:5173/client.html
   ```

   You'll see your own captions in orange and the agent's in blue. The recording template draws the same overlay with the same component.

### Record them into an MP4 (optional)

To burn the captions into an egress recording, LiveKit Cloud needs to load the template over the internet and upload the file somewhere. You'll also need [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and an S3-compatible bucket.

1. Fill in the `S3_*` values in `agent/.env.local`. For providers other than AWS, set `S3_ENDPOINT` too.

2. In a third terminal, expose the template:

   ```bash
   pnpm tunnel
   ```

   Copy the `https://….trycloudflare.com` URL it prints into `TEMPLATE_PUBLIC_URL`, then restart `pnpm dev:web`. Quick tunnels get a new URL on every start.

3. Start a call as before, with captions on **Recording only** or **On**. The room is created with [auto egress](https://docs.livekit.io/transport/media/ingress-egress/egress/autoegress/), so recording starts by itself. The page shows **Starting recording…** for a few seconds, and the agent greets you once recording is live. After you hang up, the room closes and the MP4 is uploaded to `recordings/<room>-<time>.mp4` in your bucket.

## Things to know

- **User captions lag.** The user's speech is captioned after STT, typically a few hundred ms to about a second behind the audio. Agent captions are synced to its audio playout.
- **Late joiners miss the sentence in progress.** A transcript stream can't be picked up partway through. This is why the agent waits for `room.isRecording` before greeting; otherwise the greeting starts before the recorder joins.
- **Off is display-only.** The agent still sends transcripts to every participant; Off only stops them being drawn.
- **Any user opts the whole recording in.** If you need consent per speaker, filter `useTranscriptions()` in [`CaptionOverlay.tsx`](web/src/CaptionOverlay.tsx) by each speaker's own `captions` attribute, and always caption the agent.
- **Python agents work too.** Python's `AgentSession` sends the same `lk.transcription` stream by default, so the recording template works unchanged. Only the wait-before-greeting in `agent/src/recording.ts` would need porting.
- **The session endpoint is for local development.** It only answers requests addressed to `localhost`, so the tunnel can serve the template but can't mint tokens. In production, create rooms (with their `egress` config) from your backend, and host `web/` on any static host.

## Development

```bash
pnpm check
```

This typechecks, lints, tests and builds both packages, and CI runs the same steps. To try changes to the agent turn by turn, use the [agent debugger](https://docs.livekit.io/testing/debugger/) from `agent/`. Simulations in `agent/scenarios.yaml` run on every merge to `main`, once you add `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` as repository secrets.

## License

Apache-2.0. See [LICENSE](LICENSE). `web/` is forked from LiveKit's [`template-default`](https://github.com/livekit/egress/tree/main/template-default), also Apache-2.0, and keeps its original file headers.
