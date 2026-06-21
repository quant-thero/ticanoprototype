// =====================================================================
//  Formatting utilities — Botswana localization
// =====================================================================

/**
 * Format a number as Botswana Pula.
 *  formatPula(1000)        -> "P 1,000.00"
 *  formatPula(25500)       -> "P 25,500.00"
 *  formatPula(1250000)     -> "P 1,250,000.00"
 *  formatPula(null)        -> "P 0.00"
 *  formatPula(1000, {decimals:0}) -> "P 1,000"
 */
export function formatPula(amount, { decimals = 2 } = {}) {
  const n = Number(amount);
  if (amount === null || amount === undefined || Number.isNaN(n)) {
    return decimals === 0 ? 'P 0' : 'P 0.00';
  }
  const formatted = n.toLocaleString('en-BW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `P ${formatted}`;
}

/** Compact Pula for tight spaces: P 1.25M, P 25.5K */
export function formatPulaCompact(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1_000_000) return `P ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `P ${(n / 1_000).toFixed(1)}K`;
  return `P ${n.toFixed(0)}`;
}

/** Format a date string to a readable form: "01 Jun 2026" */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format a date + time: "01 Jun 2026, 14:05" */
export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Percentage helper: formatPercent(85) -> "85.0%" */
export function formatPercent(value, decimals = 1) {
  const n = Number(value) || 0;
  return `${n.toFixed(decimals)}%`;
}

/** Compute age from a birthday string */
export function ageFromBirthday(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Bucket an age into a demographic group */
export function ageGroup(age) {
  if (age === null || age === undefined) return 'Unknown';
  if (age < 25) return '18–24';
  if (age < 35) return '25–34';
  if (age < 45) return '35–44';
  if (age < 55) return '45–54';
  if (age < 65) return '55–64';
  return '65+';
}
