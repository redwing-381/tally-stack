/**
 * Every user in this deployment has their Odoo timezone set to
 * Asia/Kolkata, and Odoo computes a journal entry's own `date` via
 * `fields.Date.context_today()` — the logged-in user's timezone, not the
 * server's raw clock. This server runs in UTC, so a plain `new Date()`
 * disagrees with Odoo's own notion of "today" for roughly 5.5 hours every
 * day (00:00-05:29 IST = 18:30-23:59 UTC the previous day).
 *
 * Confirmed live: a vendor bill's `invoice_date` set here via raw UTC
 * "today" ended up one calendar day BEHIND its own journal line's `date`,
 * which Odoo computed in IST — the bill was correctly posted, but silently
 * fell outside a UTC-anchored "this month" window on the dashboard.
 *
 * Anything this app sends to Odoo as "today" or a date-range boundary
 * should go through these instead of `new Date()` directly.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The current instant, shifted so its UTC-getters read India wall-clock time. */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Builds an ISO date string (YYYY-MM-DD) from explicit y/m/d components, UTC-anchored. */
export function istDateIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function istTodayIso(): string {
  const now = istNow();
  return istDateIso(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
