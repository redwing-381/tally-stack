import { searchRead } from "@/lib/odoo/client";

/**
 * Name -> id resolution for the agent's tools. Every write tool takes a
 * free-text name from the model rather than a numeric id — the model can't
 * be trusted not to invent an id, but it's good at picking the right name
 * out of a sentence. These throw plain, readable messages that get handed
 * straight back to the model as the tool's result, so it can relay "no
 * contact named X" or ask which of several matches was meant instead of
 * silently guessing.
 */

export async function resolvePartner(name: string, kind?: "customer" | "vendor") {
  const domain: unknown[] = [["name", "ilike", name]];
  if (kind === "customer") domain.push(["customer_rank", ">", 0]);
  if (kind === "vendor") domain.push(["supplier_rank", ">", 0]);

  const rows = await searchRead<{ id: number; name: string }>(
    "res.partner",
    domain,
    ["name"],
    { limit: 5 },
  );
  if (rows.length === 0) {
    throw new Error(`No ${kind ?? "contact"} found matching "${name}".`);
  }
  if (rows.length > 1) {
    throw new Error(
      `Multiple contacts match "${name}": ${rows.map((r) => r.name).join(", ")}. Ask which one was meant.`,
    );
  }
  return rows[0];
}

export async function resolveProduct(name: string) {
  // Scoped to our own catalogue, same as the manual order pickers — see
  // getCatalogProducts in lib/odoo/queries.ts for why this flag exists
  // (Odoo's own internal service products share the same policy fields).
  const rows = await searchRead<{ id: number; name: string; list_price: number }>(
    "product.product",
    [
      ["ufa_is_catalog", "=", true],
      ["name", "ilike", name],
    ],
    ["name", "list_price"],
    { limit: 5 },
  );
  if (rows.length === 0) {
    throw new Error(`No product found matching "${name}".`);
  }
  if (rows.length > 1) {
    throw new Error(
      `Multiple products match "${name}": ${rows.map((r) => r.name).join(", ")}. Ask which one was meant.`,
    );
  }
  return rows[0];
}

export async function resolveJournal(kind: "bank" | "cash") {
  const rows = await searchRead<{ id: number; name: string }>(
    "account.journal",
    [["type", "=", kind]],
    ["name"],
    { limit: 1 },
  );
  if (rows.length === 0) {
    throw new Error(`No ${kind} journal is configured.`);
  }
  return rows[0];
}

export async function resolveSaleOrder(reference: string) {
  const rows = await searchRead<{ id: number; name: string; state: string; invoice_ids: number[] }>(
    "sale.order",
    [["name", "ilike", reference]],
    ["name", "state", "invoice_ids"],
    { limit: 5, order: "id desc" },
  );
  if (rows.length === 0) throw new Error(`No sales order found matching "${reference}".`);
  if (rows.length > 1) {
    throw new Error(`Multiple sales orders match "${reference}": ${rows.map((r) => r.name).join(", ")}.`);
  }
  return rows[0];
}

export async function resolvePurchaseOrder(reference: string) {
  const rows = await searchRead<{ id: number; name: string; state: string; invoice_ids: number[] }>(
    "purchase.order",
    [["name", "ilike", reference]],
    ["name", "state", "invoice_ids"],
    { limit: 5, order: "id desc" },
  );
  if (rows.length === 0) throw new Error(`No purchase order found matching "${reference}".`);
  if (rows.length > 1) {
    throw new Error(`Multiple purchase orders match "${reference}": ${rows.map((r) => r.name).join(", ")}.`);
  }
  return rows[0];
}

export async function resolveInvoice(reference: string) {
  const rows = await searchRead<{ id: number; name: string; amount_residual: number; payment_state: string }>(
    "account.move",
    [["name", "ilike", reference]],
    ["name", "amount_residual", "payment_state"],
    { limit: 5, order: "id desc" },
  );
  if (rows.length === 0) throw new Error(`No invoice or bill found matching "${reference}".`);
  if (rows.length > 1) {
    throw new Error(`Multiple invoices match "${reference}": ${rows.map((r) => r.name).join(", ")}.`);
  }
  return rows[0];
}
