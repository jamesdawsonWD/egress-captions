# Recording template and call page

A fork of the LiveKit egress [`template-default`](https://github.com/livekit/egress/tree/main/template-default) (Apache-2.0), with captions added.

| Page | Who loads it | What it does |
| --- | --- | --- |
| `index.html` | The egress recorder (headless Chrome) | Grid layout, with captions drawn while any participant's `captions` attribute is `recording` or `on` |
| `client.html` | The person on the call | Joins with a microphone and picks the captions mode: Off, Recording only or On |

`server/sessionEndpoint.ts` adds `POST /api/session` to the Vite dev server. It creates the room with auto egress, dispatches the agent and returns a token. It only answers requests addressed to `localhost`, and it reads credentials from `../agent/.env.local`.

```bash
pnpm dev
```

See the [root README](../README.md) for the full setup.
