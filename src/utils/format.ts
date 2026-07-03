/**
 * Formatting utilities shared across the admin UI.
 */

/**
 * Convert a byte count into a human-readable string (e.g. "1.23 GB").
 * Returns "0 B" for non-finite, null, undefined, or zero values.
 */
export const formatBytes = (bytes?: number | null): string => {
  if (!Number.isFinite(bytes as number) || (bytes as number) <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes as number;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
};