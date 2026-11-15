/**
 * Formatting and utility helpers for QueueFlow
 */

/**
 * Format ISO timestamp into localized readable string
 */
export function formatTimestamp(isoString) {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Format latency milliseconds into human-readable string
 */
export function formatLatency(latencyMs) {
  if (latencyMs === null || latencyMs === undefined) return "N/A";
  return `${latencyMs.toFixed(1)} ms`;
}


/**
 * Build up to two uppercase initials from a person's name.
 */
export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
