export const CAPTIONS_ATTRIBUTE = 'captions';

export const CAPTIONS_MODES = ['off', 'recording', 'on'] as const;

export type CaptionsMode = (typeof CAPTIONS_MODES)[number];

export const DEFAULT_CAPTIONS_MODE: CaptionsMode = 'recording';

export function isCaptionsMode(value: unknown): value is CaptionsMode {
  return CAPTIONS_MODES.includes(value as CaptionsMode);
}

export function showsCaptionsInRecording(mode: string | undefined): boolean {
  return mode === 'recording' || mode === 'on';
}

export function showsCaptionsToUser(mode: CaptionsMode): boolean {
  return mode === 'on';
}
