import { TextStreamData } from '@livekit/components-core';
import { useRoomContext, useTranscriptions } from '@livekit/components-react';
import { ParticipantKind, Room } from 'livekit-client';
import { useEffect, useState } from 'react';

const VISIBLE_CAPTION_COUNT = 2;
const CAPTION_LINGER_MS = 5000;
const SEGMENT_ID_ATTRIBUTE = 'lk.segment_id';

export default function CaptionOverlay() {
  const room = useRoomContext();
  const recentCaptions = useTranscriptions().slice(-VISIBLE_CAPTION_COUNT);
  const captionText = recentCaptions.map((caption) => caption.text).join('\n');
  const hasGoneQuiet = useHasGoneQuiet(captionText, CAPTION_LINGER_MS);

  if (recentCaptions.length === 0 || hasGoneQuiet) {
    return null;
  }

  return (
    <div className="captions">
      {recentCaptions.map((caption) => (
        <p key={segmentId(caption)} className="caption">
          <span className="captionSpeaker">
            {speakerLabel(room, caption.participantInfo.identity)}
          </span>
          {caption.text}
        </p>
      ))}
    </div>
  );
}

function useHasGoneQuiet(text: string, quietAfterMs: number): boolean {
  const [quietText, setQuietText] = useState<string>();

  useEffect(() => {
    const timer = setTimeout(() => setQuietText(text), quietAfterMs);
    return () => clearTimeout(timer);
  }, [text, quietAfterMs]);

  return quietText === text;
}

function segmentId(caption: TextStreamData): string {
  return caption.streamInfo.attributes?.[SEGMENT_ID_ATTRIBUTE] ?? caption.streamInfo.id;
}

function speakerLabel(room: Room, identity: string): string {
  const speaker = room.remoteParticipants.get(identity);
  if (speaker?.kind === ParticipantKind.AGENT) {
    return 'Agent';
  }
  return speaker?.name || identity;
}
