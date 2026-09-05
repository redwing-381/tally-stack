export const PAGE_SIZE = 30;

type Query = Record<string, string | undefined>;

/**
 * Reads `?page=` off searchParams. Anything that isn't a whole number >= 1
 * (missing, "abc", "0", "-2", "1.5") falls back to page 1 rather than
 * producing a negative or fractional offset for Odoo.
 */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function pageOffset(page: number): number {
  return (page - 1) * PAGE_SIZE;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/**
 * Builds a page link, carrying any other active query params (e.g. the
 * Contacts type filter) along so paging never silently drops a filter.
 * Page 1 omits the param entirely to keep the canonical URL clean.
 */
export function buildPageHref(basePath: string, page: number, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
