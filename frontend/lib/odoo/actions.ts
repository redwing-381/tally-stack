"use server";

import { revalidatePath } from "next/cache";
import { callKw } from "./client";
import { istTodayIso } from "./date";

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function savePartner(
  id: number | null,
  data: {
    name: string;
    partner_type: "customer" | "vendor" | "both";
    email?: string;
    phone?: string;
    mobile?: string;
    city?: string;
    zip?: string;
    // res.country.state; Odoo rejects a state whose country doesn't match,
    // so the dialog sends country_id resolved from the chosen state.
    state_id?: number | false;
    country_id?: number | false;
    // Base64 without the data: prefix — res.partner.image_1920 derives the
    // smaller image_128/256/512 sizes from this one field.
    image_1920?: string | false;
  },
) {
  if (id) {
    await callKw("res.partner", "write", [[id], data]);
  } else {
    await callKw("res.partner", "create", [data]);
  }
  revalidatePath("/contacts");
}

// ---------------------------------------------------------------------------
// Master data — products, chart of accounts, journals, analytic accounts
// ---------------------------------------------------------------------------

export async function saveProduct(
  id: number | null,
  data: {
    name: string;
    detailed_type: "consu" | "service";
    list_price: number;
    standard_price: number;
    categ_id?: number;
  },
) {
  if (id) {
    await callKw("product.template", "write", [[id], data]);
  } else {
    // purchase_method 'purchase' bills on ordered quantity, which is what the
    // PO -> Vendor Bill flow expects; without it new products bill on
    // received quantity and produce a zero-line bill. ufa_is_catalog puts it
    // in the order pickers — anything added here is ours by definition.
    await callKw("product.template", "create", [
      { ...data, purchase_method: "purchase", ufa_is_catalog: true },
    ]);
  }
  revalidatePath("/products");
}

export async function saveAccount(
  id: number | null,
  data: { name: string; code: string; account_type: string },
) {
  if (id) {
    await callKw("account.account", "write", [[id], data]);
  } else {
    await callKw("account.account", "create", [data]);
  }
  revalidatePath("/accounts");
}

export async function saveJournal(
  id: number | null,
  data: {
    name: string;
    code: string;
    type: "sale" | "purchase" | "cash" | "bank" | "general";
    default_account_id?: number | false;
  },
) {
  if (id) {
    await callKw("account.journal", "write", [[id], data]);
  } else {
    await callKw("account.journal", "create", [data]);
  }
  revalidatePath("/journals");
}

export async function saveAnalyticAccount(
  id: number | null,
  data: { name: string; ufa_type: "income" | "expense"; plan_id: number },
) {
  if (id) {
    await callKw("account.analytic.account", "write", [[id], data]);
  } else {
    await callKw("account.analytic.account", "create", [data]);
  }
  revalidatePath("/analytic-accounts");
  revalidatePath("/budgets");
}

// ---------------------------------------------------------------------------
// Sales: Order -> Invoice -> Payment
// ---------------------------------------------------------------------------

export async function createSaleOrder(
  partnerId: number,
  lines: {
    productId: number;
    qty: number;
    priceUnit?: number;
    taxIds?: number[];
    analyticAccountId?: number;
  }[],
) {
  const orderId = await callKw<number>("sale.order", "create", [
    {
      partner_id: partnerId,
      order_line: lines.map((l) => [
        0,
        0,
        {
          product_id: l.productId,
          product_uom_qty: l.qty,
          // Only override what the user actually set — leaving these out
          // lets Odoo apply the product's own price and default tax.
          ...(l.priceUnit === undefined ? {} : { price_unit: l.priceUnit }),
          ...(l.taxIds === undefined ? {} : { tax_id: [[6, 0, l.taxIds]] }),
          // Odoo carries this onto the invoice line it later generates, and
          // posting the invoice is what turns it into an account.analytic.line
          // — the actual figure a Budget's "Actual" column is computed from.
          // Without this, a Budget's Actual can never move off zero.
          ...(l.analyticAccountId === undefined
            ? {}
            : { analytic_distribution: { [l.analyticAccountId]: 100 } }),
        },
      ]),
    },
  ]);
  revalidatePath("/sales");
  return orderId;
}

export async function confirmSaleOrder(orderId: number) {
  await callKw("sale.order", "action_confirm", [[orderId]]);
  revalidatePath(`/sales/${orderId}`);
}

/**
 * sale.order._create_invoices is a private method — Odoo's RPC layer
 * rejects any leading-underscore method name. Go through the same wizard
 * the native "Create Invoice" button opens instead.
 */
export async function createSaleInvoice(orderId: number) {
  const wizardId = await callKw<number>(
    "sale.advance.payment.inv",
    "create",
    [{}],
    { context: { active_model: "sale.order", active_ids: [orderId], active_id: orderId } },
  );
  await callKw(
    "sale.advance.payment.inv",
    "create_invoices",
    [[wizardId]],
    { context: { active_model: "sale.order", active_ids: [orderId] } },
  );
  const [order] = await callKw<Array<{ invoice_ids: number[] }>>("sale.order", "read", [
    [orderId],
    ["invoice_ids"],
  ]);
  if (order.invoice_ids.length) {
    await callKw("account.move", "action_post", [order.invoice_ids]);
  }
  revalidatePath(`/sales/${orderId}`);
  return order.invoice_ids;
}

// ---------------------------------------------------------------------------
// Purchases: Order -> Bill -> Payment
// ---------------------------------------------------------------------------

export async function createPurchaseOrder(
  partnerId: number,
  lines: {
    productId: number;
    qty: number;
    priceUnit?: number;
    taxIds?: number[];
    analyticAccountId?: number;
  }[],
) {
  const orderId = await callKw<number>("purchase.order", "create", [
    {
      partner_id: partnerId,
      order_line: lines.map((l) => [
        0,
        0,
        {
          product_id: l.productId,
          product_qty: l.qty,
          ...(l.priceUnit === undefined ? {} : { price_unit: l.priceUnit }),
          ...(l.taxIds === undefined ? {} : { taxes_id: [[6, 0, l.taxIds]] }),
          ...(l.analyticAccountId === undefined
            ? {}
            : { analytic_distribution: { [l.analyticAccountId]: 100 } }),
        },
      ]),
    },
  ]);
  revalidatePath("/purchases");
  return orderId;
}

export async function confirmPurchaseOrder(orderId: number) {
  await callKw("purchase.order", "button_confirm", [[orderId]]);
  revalidatePath(`/purchases/${orderId}`);
}

/**
 * Corrects a single draft order line's unit price — used by the agent's
 * anomaly-fix flow. Draft only: a posted line needs a credit note/reversal,
 * not a silent field edit.
 */
export async function fixOrderLinePrice(orderType: "sale" | "purchase", lineId: number, unitPrice: number) {
  const model = orderType === "sale" ? "sale.order.line" : "purchase.order.line";
  await callKw(model, "write", [[lineId], { price_unit: unitPrice }]);
  revalidatePath(orderType === "sale" ? "/sales" : "/purchases");
}

export async function createPurchaseBill(orderId: number) {
  await callKw("purchase.order", "action_create_invoice", [[orderId]]);
  const [order] = await callKw<Array<{ invoice_ids: number[] }>>("purchase.order", "read", [
    [orderId],
    ["invoice_ids"],
  ]);
  if (order.invoice_ids.length) {
    // Unlike customer invoices (which default invoice_date automatically),
    // action_create_invoice() leaves a vendor bill's date unset — Odoo
    // rejects posting with "The Bill/Refund date is required" until it's
    // set. The native UI's manual "set Bill Date" step does the same thing.
    // istTodayIso (not raw UTC) so this agrees with the journal line's own
    // date, which Odoo computes in the posting user's IST timezone.
    const today = istTodayIso();
    await callKw("account.move", "write", [order.invoice_ids, { invoice_date: today }]);
    await callKw("account.move", "action_post", [order.invoice_ids]);
  }
  revalidatePath(`/purchases/${orderId}`);
  return order.invoice_ids;
}

// ---------------------------------------------------------------------------
// Shared payment registration (used by both Sales and Purchases)
// ---------------------------------------------------------------------------

/**
 * Registers a payment against an invoice or bill. `journalId` picks the
 * Bank or Cash journal the money moves through — the spec's "select bank
 * or cash". Omitting it lets Odoo fall back to its own default journal.
 */
export async function registerPayment(
  moveId: number,
  redirectPath: string,
  journalId?: number,
) {
  const wizardId = await callKw<number>(
    "account.payment.register",
    "create",
    [journalId ? { journal_id: journalId } : {}],
    { context: { active_model: "account.move", active_ids: [moveId], active_id: moveId } },
  );
  await callKw(
    "account.payment.register",
    "action_create_payments",
    [[wizardId]],
    { context: { active_model: "account.move", active_ids: [moveId] } },
  );
  revalidatePath(redirectPath);
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export async function saveBudget(
  id: number | null,
  data: {
    name: string;
    period_start: string;
    period_end: string;
    analytic_account_id: number;
    planned_amount: number;
    responsible_user_id?: number | false;
  },
) {
  if (id) {
    await callKw("ufa.budget", "write", [[id], data]);
  } else {
    await callKw("ufa.budget", "create", [data]);
  }
  revalidatePath("/budgets");
}

export async function deleteBudget(id: number) {
  await callKw("ufa.budget", "unlink", [[id]]);
  revalidatePath("/budgets");
}

// ---------------------------------------------------------------------------
// Reports: headless drive of ufa.financial.report.wizard
// ---------------------------------------------------------------------------

export async function generateReport(
  wizardId: number | null,
  reportType: "balance_sheet" | "profit_loss",
  dateTo: string,
  dateFrom: string | null,
) {
  const payload = {
    report_type: reportType,
    date_to: dateTo,
    date_from: reportType === "profit_loss" ? dateFrom : false,
  };

  const id =
    wizardId ?? (await callKw<number>("ufa.financial.report.wizard", "create", [payload]));
  if (wizardId) {
    await callKw("ufa.financial.report.wizard", "write", [[wizardId], payload]);
  }
  await callKw("ufa.financial.report.wizard", "action_generate", [[id]]);

  const [wizard] = await callKw<Array<{ net_result: number }>>(
    "ufa.financial.report.wizard",
    "read",
    [[id], ["net_result"]],
  );
  const lines = await callKw<Array<{ section: string; account_id: [number, string]; balance: number }>>(
    "ufa.financial.report.line",
    "search_read",
    [[["wizard_id", "=", id]], ["section", "account_id", "balance"]],
  );

  return { wizardId: id, netResult: wizard.net_result, lines };
}
