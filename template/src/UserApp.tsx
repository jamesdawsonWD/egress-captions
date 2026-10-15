import '@livekit/components-styles';
import {
  DisconnectButton,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';
import CaptionOverlay from './CaptionOverlay';
import {
  CAPTIONS_ATTRIBUTE,
  CAPTIONS_MODES,
  type CaptionsMode,
  DEFAULT_CAPTIONS_MODE,
  isCaptionsMode,
  showsCaptionsToUser,
} from './captionsMode';
import type { Session } from './session';
import './UserApp.css';

const SAVED_MODE_KEY = 'captionsMode';

const MODE_LABELS: Record<CaptionsMode, string> = {
  off: 'Off',
  recording: 'Recording only',
  on: 'On',
};

export default function UserApp() {
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState<string>();
  const [captionsMode, setCaptionsMode] = useState<CaptionsMode>(loadSavedMode);

  const changeCaptionsMode = (mode: CaptionsMode) => {
    setCaptionsMode(mode);
    saveMode(mode);
  };

  const startCall = async () => {
    setError(undefined);
    const response = await fetch(`/api/session?captions=${captionsMode}`, { method: 'POST' });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error);
      return;
    }
    setSession(body);
  };

  return (
    <div className="userApp">
      <header className="callBar">
        <CaptionsModeControl mode={captionsMode} onChange={changeCaptionsMode} />
        {session && (
          <span className="recordingStatus">
            {session.recording ? '● Recording' : 'Not recording (egress not configured)'}
          </span>
        )}
      </header>
      {session ? (
        <LiveKitRoom
          serverUrl={session.serverUrl}
          token={session.token}
          connect
          audio
          video={false}
          onDisconnected={() => setSession(undefined)}
          className="callRoom"
        >
          <Call captionsMode={captionsMode} />
        </LiveKitRoom>
      ) : (
        <div className="lobby">
          <button className="lk-button" onClick={startCall}>
            Start call
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Call({ captionsMode }: { captionsMode: CaptionsMode }) {
  usePublishedCaptionsMode(captionsMode);
  const tiles = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  return (
    <>
      <GridLayout tracks={tiles}>
        <ParticipantTile />
      </GridLayout>
      {showsCaptionsToUser(captionsMode) && <CaptionOverlay />}
      <RoomAudioRenderer />
      <DisconnectButton className="lk-button hangUp">Hang up</DisconnectButton>
    </>
  );
}

function usePublishedCaptionsMode(mode: CaptionsMode) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant.attributes[CAPTIONS_ATTRIBUTE] !== mode) {
      void localParticipant.setAttributes({ [CAPTIONS_ATTRIBUTE]: mode });
    }
  }, [localParticipant, mode]);
}

function CaptionsModeControl({
  mode,
  onChange,
}: {
  mode: CaptionsMode;
  onChange: (mode: CaptionsMode) => void;
}) {
  return (
    <fieldset className="captionsMode">
      <legend>Captions</legend>
      {CAPTIONS_MODES.map((option) => (
        <label key={option} className={option === mode ? 'selected' : undefined}>
          <input
            type="radio"
            name="captionsMode"
            value={option}
            checked={option === mode}
            onChange={() => onChange(option)}
          />
          {MODE_LABELS[option]}
        </label>
      ))}
    </fieldset>
  );
}

function loadSavedMode(): CaptionsMode {
  try {
    const saved = localStorage.getItem(SAVED_MODE_KEY);
    return isCaptionsMode(saved) ? saved : DEFAULT_CAPTIONS_MODE;
  } catch {
    return DEFAULT_CAPTIONS_MODE;
  }
}

function saveMode(mode: CaptionsMode) {
  try {
    localStorage.setItem(SAVED_MODE_KEY, mode);
  } catch {
    return;
  }
}
