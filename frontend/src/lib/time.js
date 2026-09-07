// Helpers for formatting time
export const formatTime = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// Format seconds as mm:ss (no hours cap). Used for both single-stint durations
// and cumulative totals across a match/season — always minutes and seconds only.
export const formatTimeLong = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// Real (clocked) match duration in seconds. Uses total_duration when available and
// sane, otherwise reconstructs from halfDurationSec * half_reached (fallback 1200 = 20 min).
// Old matches saved the sum of all players' minutes as total_duration by mistake — this
// helper caps that inflated value.
export const getMatchDuration = (match) => {
  const half = match.halfDurationSec || 1200;
  const reached = match.half_reached || 1;
  const wallClock = half * reached;
  const stored = Number(match.total_duration) || 0;
  const upper = half * 2;
  if (stored > 0 && stored <= upper + 60) return stored;
  return wallClock;
};

// Convert elapsed seconds within a half into countdown time (e.g., 05:30 elapsed → 14:30 remaining)
export const formatCountdown = (elapsedSeconds, halfDuration = 1200) => {
  return formatTime(Math.max(0, halfDuration - elapsedSeconds));
};
