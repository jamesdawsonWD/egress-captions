# Egress caption test

Proof that LiveKit can burn live captions into a RoomComposite recording **today**, with no feature request and no agent changes.

The agent already sends every transcript (its own speech and the user's STT) to all participants on the `lk.transcription` text stream. That includes the hidden egress recorder. A custom recording template listens to that stream and draws captions over the grid, so they end up in the MP4. Each user decides whether captions appear in the recording, on their own screen, or nowhere.

## What's here

| Path | What it is |
| --- | --- |
| `agent/` | Unmodified `agent-starter-node` (`lk agent init`). Dispatched explicitly as `agent`. |
| `template/` | Fork of [`livekit/egress/template-default`](https://github.com/livekit/egress/tree/main/template-default) at `63eb8bd`, plus captions. |
| `template/src/CaptionOverlay.tsx` | Draws the last two transcript segments with `useTranscriptions()`. Clears after 5 s of quiet. |
| `template/src/Room.tsx` | The recording view. Grid with placeholder tiles for audio-only participants, and captions when anyone asks for them. |
| `template/client.html`, `src/UserApp.tsx` | A minimal user page with the captions control. |
| `template/server/sessionEndpoint.ts` | Dev-server endpoint `POST /api/session`. It creates the room with **auto egress**, dispatches the agent and returns a user token. |

## Caption modes

The user page sets a `captions` participant attribute. The recording template reads it live.

| Mode | User sees captions | Recording has captions |
| --- | --- | --- |
| Off | no | no |
| Recording only (default) | no | yes |
| On | yes | yes |

The recording shows captions while **any** participant has `recording` or `on`. Changing the mode mid-call takes effect in the recording from that moment.

## Run it

Prerequisites: `lk` CLI, pnpm, `cloudflared`, and an S3 bucket (or R2, which needs `S3_ENDPOINT` set).

1. Add the recording settings to `agent/.env.local`, next to the `LIVEKIT_*` keys:

   ```bash
   S3_BUCKET=...
   S3_REGION=...
   S3_ACCESS_KEY=...
   S3_SECRET=...
   # S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # non-AWS only
   TEMPLATE_PUBLIC_URL=https://<from step 3>.trycloudflare.com
   ```

   Without `TEMPLATE_PUBLIC_URL` and `S3_BUCKET`, calls still work but aren't recorded.

2. Start the agent:

   ```bash
   cd agent && lk agent dev
   ```

3. Start the template and expose it so LiveKit Cloud egress can load it:

   ```bash
   cd template && pnpm install && pnpm dev
   ```

   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```

   Put the printed URL in `TEMPLATE_PUBLIC_URL`, then restart `pnpm dev`.

4. Open <http://localhost:5173/client.html>, pick a captions mode and start a call. Recording starts when the room is created and stops when the room closes, shortly after you hang up. The MP4 lands at `s3://$S3_BUCKET/egress-caption-test/<room>-<time>.mp4`.

## Limits

- **User captions lag.** User speech is captioned after STT, typically a few hundred ms to about a second behind the audio. Agent captions are synced to its audio playout.
- **Off is display-only.** The agent still sends transcripts to every participant; Off only stops them being drawn. Actually withholding them would need agent changes.
- **Any user opts the whole recording in.** A privacy-minded alternative is per speaker: caption each user's speech only if they opted in, and always caption the agent. To do that, filter `useTranscriptions()` by the speaker's own `captions` attribute.
- **Use a real mic.** The agent links to the first participant to join. If that participant has no audio track (for example a browser with the mic blocked), the starter agent's greeting can stall, and there's nothing to transcribe.
- **Local only.** The session endpoint only answers requests addressed to `localhost`, so the public tunnel can serve the recording template but can't mint tokens. In production, create the room (with its `egress` config) from your backend and host the template on any static host.
