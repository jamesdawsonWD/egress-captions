import {
  AccessToken,
  AgentDispatchClient,
  EncodedFileOutput,
  RoomCompositeEgressRequest,
  RoomEgress,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { type Plugin, loadEnv } from 'vite';
import { CAPTIONS_ATTRIBUTE, DEFAULT_CAPTIONS_MODE, isCaptionsMode } from '../src/captionsMode.ts';
import type { Session } from '../src/session.ts';

const SESSION_PATH = '/api/session';
const ENV_DIR = '../agent';
const AGENT_NAME = 'agent';
const RECORDING_LAYOUT = 'grid';
const RECORDING_FILEPATH = 'egress-caption-test/{room_name}-{time}.mp4';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

type Env = Record<string, string>;

interface LiveKitCredentials {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function sessionEndpoint(): Plugin {
  return {
    name: 'session-endpoint',
    configureServer(server) {
      const env = loadEnv(server.config.mode, path.resolve(server.config.root, ENV_DIR), '');
      server.middlewares.use(SESSION_PATH, (req, res) => {
        handleSessionRequest(req, res, env).catch((error: unknown) => {
          respondJson(res, 500, { error: String(error) });
        });
      });
    },
  };
}

async function handleSessionRequest(req: IncomingMessage, res: ServerResponse, env: Env) {
  if (req.method !== 'POST') {
    return respondJson(res, 405, { error: 'POST only' });
  }
  if (!isLocalRequest(req)) {
    return respondJson(res, 403, { error: 'sessions can only be created from localhost' });
  }

  const requestedMode = new URL(req.url ?? '', 'http://localhost').searchParams.get('captions');
  const captionsMode = isCaptionsMode(requestedMode) ? requestedMode : DEFAULT_CAPTIONS_MODE;
  const credentials = liveKitCredentials(env);
  const roomName = `caption-test-${Date.now().toString(36)}`;
  const recordingEgress = recordingEgressFor(roomName, env);

  await new RoomServiceClient(
    credentials.url,
    credentials.apiKey,
    credentials.apiSecret,
  ).createRoom({
    name: roomName,
    egress: recordingEgress,
  });
  await new AgentDispatchClient(
    credentials.url,
    credentials.apiKey,
    credentials.apiSecret,
  ).createDispatch(roomName, AGENT_NAME, {
    metadata: JSON.stringify({ waitForRecording: recordingEgress !== undefined }),
  });

  const session: Session = {
    serverUrl: credentials.url,
    roomName,
    token: await userToken(credentials, roomName, captionsMode),
    recording: recordingEgress !== undefined,
  };
  respondJson(res, 200, session);
}

function isLocalRequest(req: IncomingMessage): boolean {
  const hostname = new URL(`http://${req.headers.host ?? ''}`).hostname;
  return LOCAL_HOSTNAMES.has(hostname);
}

function liveKitCredentials(env: Env): LiveKitCredentials {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error(
      `LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in ${ENV_DIR}/.env.local`,
    );
  }
  return { url: LIVEKIT_URL, apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET };
}

function recordingEgressFor(roomName: string, env: Env): RoomEgress | undefined {
  const { TEMPLATE_PUBLIC_URL, S3_BUCKET } = env;
  if (!TEMPLATE_PUBLIC_URL || !S3_BUCKET) {
    return undefined;
  }
  return new RoomEgress({
    room: new RoomCompositeEgressRequest({
      roomName,
      layout: RECORDING_LAYOUT,
      customBaseUrl: TEMPLATE_PUBLIC_URL,
      fileOutputs: [
        new EncodedFileOutput({
          filepath: RECORDING_FILEPATH,
          output: { case: 's3', value: s3Upload(env) },
        }),
      ],
    }),
  });
}

function s3Upload(env: Env): S3Upload {
  return new S3Upload({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION ?? '',
    accessKey: env.S3_ACCESS_KEY ?? '',
    secret: env.S3_SECRET ?? '',
    endpoint: env.S3_ENDPOINT ?? '',
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  });
}

async function userToken(
  credentials: LiveKitCredentials,
  roomName: string,
  captionsMode: string,
): Promise<string> {
  const token = new AccessToken(credentials.apiKey, credentials.apiSecret, {
    identity: `user-${crypto.randomUUID().slice(0, 8)}`,
    name: 'User',
    attributes: { [CAPTIONS_ATTRIBUTE]: captionsMode },
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });
  return token.toJwt();
}

function respondJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
