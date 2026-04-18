export const BP_CAPTURE_STORAGE = 'spectru_bp_capture_enabled';

export function getBPCaptureEnabled(): boolean {
  const raw = localStorage.getItem(BP_CAPTURE_STORAGE);
  if (raw === null) return true;
  return raw === 'true';
}

export function setBPCaptureEnabled(enabled: boolean): void {
  localStorage.setItem(BP_CAPTURE_STORAGE, String(enabled));
}
