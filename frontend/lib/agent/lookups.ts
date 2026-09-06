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

export interface PriceAnomaly {
  orderType: "sale" | "purchase";
  lineId: number;
  orderId: number;
  orderName: string;
  productName: string;
  catalogPrice: number;
  actualPrice: number;
  qty: number;
}

// A line's unit price is flagged when it's this many times higher (or
// lower) than the product's own catalogue price — generous enough to leave
// real negotiated discounts/markups alone, but well past what a legitimate
// deal would use. Draft orders only: a posted, paid transaction needs a
// correction/credit-note flow, not a silent field edit.
const ANOMALY_RATIO = 3;

async function catalogPricesFor(productIds: number[]): Promise<Map<number, number>> {
  if (productIds.length === 0) return new Map();
  const products = await searchRead<{ id: number; list_price: number }>(
    "product.product",
    [["id", "in", productIds]],
    ["list_price"],
  );
  return new Map(products.map((p) => [p.id, p.list_price]));
}

function flagLine(
  orderType: "sale" | "purchase",
  line: {
    id: number;
    price_unit: number;
    product_id: [number, string] | false;
    order_id: [number, string] | false;
  },
  qty: number,
  catalogPrice: Map<number, number>,
): PriceAnomaly | null {
  if (!line.product_id || !line.order_id) return null;
  const [productId, productName] = line.product_id;
  const [orderId, orderName] = line.order_id;
  const expected = catalogPrice.get(productId);
  if (!expected || expected <= 0) return null;
  const ratio = line.price_unit / expected;
  if (ratio < ANOMALY_RATIO && ratio > 1 / ANOMALY_RATIO) return null;
  return {
    orderType,
    lineId: line.id,
    orderId,
    orderName,
    productName,
    catalogPrice: expected,
    actualPrice: line.price_unit,
    qty,
  };
}

/**
 * Scans draft (not-yet-confirmed) sales and purchase order lines for a unit
 * price that looks like a data-entry mistake — e.g. the currency/decimal
 * slip that once turned a real ₹85,000 chair order into ₹37,00,000. Draft
 * only, since fixing a line here is a plain field write, not a reversal.
 */
export async function findPriceAnomalies(): Promise<PriceAnomaly[]> {
  const [saleLines, purchaseLines] = await Promise.all([
    searchRead<{
      id: number;
      price_unit: number;
      product_uom_qty: number;
      product_id: [number, string] | false;
      order_id: [number, string] | false;
    }>(
      "sale.order.line",
      [
        ["state", "=", "draft"],
        ["product_id", "!=", false],
      ],
      ["price_unit", "product_uom_qty", "product_id", "order_id"],
    ),
    searchRead<{
      id: number;
      price_unit: number;
      product_qty: number;
      product_id: [number, string] | false;
      order_id: [number, string] | false;
    }>(
      "purchase.order.line",
      [
        ["state", "=", "draft"],
        ["product_id", "!=", false],
      ],
      ["price_unit", "product_qty", "product_id", "order_id"],
    ),
  ]);

  const productIds = [
    ...new Set(
      [...saleLines, ...purchaseLines]
        .map((l) => (l.product_id ? l.product_id[0] : null))
        .filter((id): id is number => id !== null),
    ),
  ];
  const catalogPrice = await catalogPricesFor(productIds);

  const anomalies: PriceAnomaly[] = [];
  for (const line of saleLines) {
    const found = flagLine("sale", line, line.product_uom_qty, catalogPrice);
    if (found) anomalies.push(found);
  }
  for (const line of purchaseLines) {
    const found = flagLine("purchase", line, line.product_qty, catalogPrice);
    if (found) anomalies.push(found);
  }
  return anomalies;
}
