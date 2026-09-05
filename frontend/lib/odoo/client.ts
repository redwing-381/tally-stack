import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";
const SESSION_COOKIE = "ufa_session";

export class OdooRpcError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "OdooRpcError";
  }
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number | null;
  result?: T;
  error?: { code: number; message: string; data?: { message?: string; name?: string } };
}

async function jsonRpc<T>(
  path: string,
  params: Record<string, unknown>,
  sessionId?: string,
): Promise<{ result: T; setCookie: string | null }> {
  const res = await fetch(`${ODOO_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: Date.now() }),
    cache: "no-store",
  });

  const json = (await res.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw new OdooRpcError(json.error.data?.message ?? json.error.message, json.error.data);
  }

  return { result: json.result as T, setCookie: res.headers.get("set-cookie") };
}

/** Extracts the session_id value out of a Set-Cookie header. */
export function extractSessionId(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
}

export async function authenticate(db: string, login: string, password: string) {
  const { result, setCookie } = await jsonRpc<{ uid: number | false; [k: string]: unknown }>(
    "/web/session/authenticate",
    { db, login, password },
  );
  if (!result?.uid) {
    throw new OdooRpcError("Invalid login or password");
  }
  const sessionId = extractSessionId(setCookie);
  return { uid: result.uid as number, sessionId };
}

export async function destroySession(sessionId: string) {
  await jsonRpc("/web/session/destroy", {}, sessionId).catch(() => undefined);
}

async function getSessionId(): Promise<string> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) throw new OdooRpcError("Not authenticated");
  return sid;
}

/**
 * Calls an Odoo model method over /web/dataset/call_kw using the current
 * request's session cookie. Server-only — never exposed to the browser.
 */
export async function callKw<T>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const sessionId = await getSessionId();
  try {
    const { result } = await jsonRpc<T>(
      "/web/dataset/call_kw",
      { model, method, args, kwargs },
      sessionId,
    );
    return result;
  } catch (err) {
    // The ufa_session cookie outlives the Odoo session it points to (e.g. the
    // server restarted, or the session was destroyed elsewhere). Bounce to
    // login rather than crash the page with a raw 500 — proxy.ts only checks
    // cookie *presence*, not validity, so this is the actual re-auth trigger.
    const data = err instanceof OdooRpcError ? (err.data as { name?: string } | undefined) : undefined;
    if (data?.name === "odoo.http.SessionExpiredException") {
      redirect("/login");
    }
    throw err;
  }
}

/** Same as callKw but takes an explicit session id (used during login, before a cookie exists). */
export async function callKwWithSession<T>(
  sessionId: string,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const { result } = await jsonRpc<T>(
    "/web/dataset/call_kw",
    { model, method, args, kwargs },
    sessionId,
  );
  return result;
}

export function searchRead<T>(
  model: string,
  domain: unknown[] = [],
  fields: string[] = [],
  opts: { limit?: number; offset?: number; order?: string } = {},
) {
  return callKw<T[]>(model, "search_read", [domain, fields], opts);
}

/** Total matching rows, for pagination footers. */
export function searchCount(model: string, domain: unknown[] = []) {
  return callKw<number>(model, "search_count", [domain]);
}

export function readGroup(
  model: string,
  domain: unknown[],
  fields: string[],
  groupBy: string[],
) {
  return callKw<Array<Record<string, unknown>>>(model, "read_group", [domain, fields, groupBy]);
}
