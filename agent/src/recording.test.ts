import { type Room, RoomEvent } from '@livekit/rtc-node';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchWantsRecordingFirst, waitForRecordingToStart } from './recording.ts';

class FakeRoom extends EventEmitter {
  isRecording = false;

  startRecording() {
    this.isRecording = true;
    this.emit(RoomEvent.RoomUpdated);
  }

  asRoom(): Room {
    return this as unknown as Room;
  }
}

describe('dispatchWantsRecordingFirst', () => {
  it('is true only when the dispatch asks to wait for recording', () => {
    expect(dispatchWantsRecordingFirst('{"waitForRecording":true}')).toBe(true);
    expect(dispatchWantsRecordingFirst('{"waitForRecording":false}')).toBe(false);
    expect(dispatchWantsRecordingFirst('')).toBe(false);
    expect(dispatchWantsRecordingFirst('not json')).toBe(false);
  });
});

describe('waitForRecordingToStart', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when the room is already recording', async () => {
    const room = new FakeRoom();
    room.isRecording = true;

    await expect(waitForRecordingToStart(room.asRoom(), 1_000)).resolves.toBe(true);
  });

  it('resolves once the room reports recording, and stops listening', async () => {
    const room = new FakeRoom();
    const waiting = waitForRecordingToStart(room.asRoom(), 1_000);

    room.emit(RoomEvent.RoomUpdated);
    room.startRecording();

    await expect(waiting).resolves.toBe(true);
    expect(room.listenerCount(RoomEvent.RoomUpdated)).toBe(0);
  });

  it('gives up after the timeout so unrecorded rooms still get a greeting', async () => {
    vi.useFakeTimers();
    const room = new FakeRoom();
    const waiting = waitForRecordingToStart(room.asRoom(), 1_000);

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(waiting).resolves.toBe(false);
    expect(room.listenerCount(RoomEvent.RoomUpdated)).toBe(0);
  });
});
