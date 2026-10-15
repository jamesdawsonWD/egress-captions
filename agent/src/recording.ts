import { type Room, RoomEvent } from '@livekit/rtc-node';

export const RECORDING_START_TIMEOUT_MS = 15_000;

interface DispatchMetadata {
  waitForRecording?: boolean;
}

export function dispatchWantsRecordingFirst(metadata: string): boolean {
  try {
    return (JSON.parse(metadata) as DispatchMetadata).waitForRecording === true;
  } catch {
    return false;
  }
}

export function waitForRecordingToStart(room: Room, timeoutMs: number): Promise<boolean> {
  if (room.isRecording) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const finish = (started: boolean) => {
      clearTimeout(timer);
      room.off(RoomEvent.RoomUpdated, finishIfRecording);
      resolve(started);
    };
    const finishIfRecording = () => {
      if (room.isRecording) finish(true);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    room.on(RoomEvent.RoomUpdated, finishIfRecording);
  });
}
