import { tool } from "ai";
import { z } from "zod";
import { searchRead } from "@/lib/odoo/client";
import { generateReport } from "@/lib/odoo/actions";
import {
  resolvePartner,
  resolveProduct,
  resolveSaleOrder,
  resolvePurchaseOrder,
  resolveInvoice,
} from "@/lib/agent/lookups";

/**
 * The agent's whole tool catalog. Every tool has a real `execute` — none of
 * them pause the SDK's stream. The split that matters is what `execute`
 * does:
 *
 *  - Read tools run the real query and hand back real data.
 *  - Write tools resolve names to ids, validate, and hand back a proposal
 *    object ({ requiresConfirmation: true, ... }) — they never call an
 *    Odoo-mutating Server Action themselves. The actual mutation only ever
 *    happens from POST /api/agent/execute, which the Confirm button calls
 *    directly — see that route for why doing it there (rather than through
 *    any tool-repeat/resume mechanism) is the deliberate choice here.
 */

const lineSchema = z.object({
  productName: z.string().describe("The product's name, e.g. \"Office Chair\"."),
  qty: z.number().positive().describe("Quantity."),
});

export const agentTools = {
  // ---------------------------------------------------------------------
  // Read tools — execute the real query, no confirmation needed.
  // ---------------------------------------------------------------------

  findContact: tool({
    description: "Search contacts (customers/vendors) by name.",
    inputSchema: z.object({
      name: z.string().describe("Full or partial name to search for."),
      kind: z.enum(["customer", "vendor"]).optional(),
    }),
    execute: async ({ name, kind }) => {
      const domain: unknown[] = [["name", "ilike", name]];
      if (kind === "customer") domain.push(["customer_rank", ">", 0]);
      if (kind === "vendor") domain.push(["supplier_rank", ">", 0]);
      const rows = await searchRead<{ id: number; name: string; email: string | false }>(
        "res.partner",
        domain,
        ["name", "email"],
        { limit: 5 },
      );
      return rows.length ? rows : { message: `No contacts found matching "${name}".` };
    },
  }),

  findProduct: tool({
    description: "Search the furniture catalogue by product name.",
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      const rows = await searchRead<{ id: number; name: string; list_price: number }>(
        "product.product",
        [
          ["ufa_is_catalog", "=", true],
          ["name", "ilike", name],
        ],
        ["name", "list_price"],
        { limit: 5 },
      );
      return rows.length ? rows : { message: `No products found matching "${name}".` };
    },
  }),

  getOrderStatus: tool({
    description: "Look up a sales or purchase order's status and total by its order number.",
    inputSchema: z.object({
      orderType: z.enum(["sale", "purchase"]),
      reference: z.string().describe("Order number or a fragment of it, e.g. \"S00042\"."),
    }),
    execute: async ({ orderType, reference }) => {
      const model = orderType === "sale" ? "sale.order" : "purchase.order";
      const rows = await searchRead<{ id: number; name: string; state: string; amount_total: number }>(
        model,
        [["name", "ilike", reference]],
        ["name", "state", "amount_total"],
        { limit: 5, order: "id desc" },
      );
      return rows.length ? rows : { message: `No ${orderType} order found matching "${reference}".` };
    },
  }),

  getInvoiceStatus: tool({
    description: "Look up an invoice or bill's payment status by its number.",
    inputSchema: z.object({
      reference: z.string().describe("Invoice/bill number or a fragment, e.g. \"INV/2026/00003\"."),
    }),
    execute: async ({ reference }) => {
      const rows = await searchRead<{
        id: number;
        name: string;
        payment_state: string;
        amount_total: number;
        amount_residual: number;
      }>(
        "account.move",
        [["name", "ilike", reference]],
        ["name", "payment_state", "amount_total", "amount_residual"],
        { limit: 5, order: "id desc" },
      );
      return rows.length ? rows : { message: `No invoice or bill found matching "${reference}".` };
    },
  }),

  runFinancialReport: tool({
    description: "Run the Balance Sheet or Profit & Loss report for a date range and summarize it.",
    inputSchema: z.object({
      reportType: z.enum(["balance_sheet", "profit_loss"]),
      dateFrom: z.string().optional().describe("YYYY-MM-DD, Profit & Loss only."),
      dateTo: z.string().describe("YYYY-MM-DD."),
    }),
    execute: async ({ reportType, dateFrom, dateTo }) => {
      const { netResult, lines } = await generateReport(null, reportType, dateTo, dateFrom ?? null);
      return { netResult, lines };
    },
  }),

  // ---------------------------------------------------------------------
  // Write tools — resolve + validate + propose. No Odoo write happens here.
  // ---------------------------------------------------------------------

  createContact: tool({
    description: "Propose creating a new contact (customer, vendor, or both).",
    inputSchema: z.object({
      name: z.string(),
      partnerType: z.enum(["customer", "vendor", "both"]),
      email: z.string().optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
    }),
    execute: async ({ name, partnerType, email, phone, city }) => {
      const args = { name, partner_type: partnerType, email, phone, city };
      return {
        requiresConfirmation: true as const,
        toolName: "createContact",
        summary: `Create ${partnerType} contact "${name}"${email ? ` (${email})` : ""}`,
        args,
      };
    },
  }),

  createSalesOrder: tool({
    description: "Propose a new sales order for a customer with one or more product lines.",
    inputSchema: z.object({
      customerName: z.string(),
      lines: z.array(lineSchema).min(1),
    }),
    execute: async ({ customerName, lines }) => {
      const customer = await resolvePartner(customerName, "customer");
      const resolvedLines = await Promise.all(
        lines.map(async (l) => {
          const product = await resolveProduct(l.productName);
          return { productId: product.id, productName: product.name, qty: l.qty, unitPrice: product.list_price };
        }),
      );
      const estimatedTotal = resolvedLines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
      return {
        requiresConfirmation: true as const,
        toolName: "createSalesOrder",
        summary: `Sales order for ${customer.name}: ${resolvedLines
          .map((l) => `${l.qty} × ${l.productName}`)
          .join(", ")} — est. ₹${estimatedTotal.toLocaleString("en-IN")}`,
        args: { partnerId: customer.id, lines: resolvedLines.map((l) => ({ productId: l.productId, qty: l.qty })) },
      };
    },
  }),

  confirmSalesOrder: tool({
    description: "Propose confirming a draft sales order, turning it into a real order.",
    inputSchema: z.object({ orderReference: z.string() }),
    execute: async ({ orderReference }) => {
      const order = await resolveSaleOrder(orderReference);
      return {
        requiresConfirmation: true as const,
        toolName: "confirmSalesOrder",
        summary: `Confirm sales order ${order.name}`,
        args: { orderId: order.id },
      };
    },
  }),

  createSalesInvoice: tool({
    description: "Propose generating the customer invoice for a confirmed sales order.",
    inputSchema: z.object({ orderReference: z.string() }),
    execute: async ({ orderReference }) => {
      const order = await resolveSaleOrder(orderReference);
      return {
        requiresConfirmation: true as const,
        toolName: "createSalesInvoice",
        summary: `Generate the customer invoice for ${order.name}`,
        args: { orderId: order.id },
      };
    },
  }),

  createPurchaseOrder: tool({
    description: "Propose a new purchase order for a vendor with one or more product lines.",
    inputSchema: z.object({
      vendorName: z.string(),
      lines: z.array(lineSchema).min(1),
    }),
    execute: async ({ vendorName, lines }) => {
      const vendor = await resolvePartner(vendorName, "vendor");
      const resolvedLines = await Promise.all(
        lines.map(async (l) => {
          const product = await resolveProduct(l.productName);
          return { productId: product.id, productName: product.name, qty: l.qty, unitPrice: product.list_price };
        }),
      );
      const estimatedTotal = resolvedLines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
      return {
        requiresConfirmation: true as const,
        toolName: "createPurchaseOrder",
        summary: `Purchase order for ${vendor.name}: ${resolvedLines
          .map((l) => `${l.qty} × ${l.productName}`)
          .join(", ")} — est. ₹${estimatedTotal.toLocaleString("en-IN")}`,
        args: { partnerId: vendor.id, lines: resolvedLines.map((l) => ({ productId: l.productId, qty: l.qty })) },
      };
    },
  }),

  confirmPurchaseOrder: tool({
    description: "Propose confirming a draft purchase order.",
    inputSchema: z.object({ orderReference: z.string() }),
    execute: async ({ orderReference }) => {
      const order = await resolvePurchaseOrder(orderReference);
      return {
        requiresConfirmation: true as const,
        toolName: "confirmPurchaseOrder",
        summary: `Confirm purchase order ${order.name}`,
        args: { orderId: order.id },
      };
    },
  }),

  createPurchaseBill: tool({
    description: "Propose generating the vendor bill for a confirmed purchase order.",
    inputSchema: z.object({ orderReference: z.string() }),
    execute: async ({ orderReference }) => {
      const order = await resolvePurchaseOrder(orderReference);
      return {
        requiresConfirmation: true as const,
        toolName: "createPurchaseBill",
        summary: `Generate the vendor bill for ${order.name}`,
        args: { orderId: order.id },
      };
    },
  }),

  registerPayment: tool({
    description: "Propose registering a payment against an invoice or bill, through Bank or Cash.",
    inputSchema: z.object({
      invoiceReference: z.string(),
      journal: z.enum(["bank", "cash"]),
    }),
    execute: async ({ invoiceReference, journal }) => {
      const invoice = await resolveInvoice(invoiceReference);
      if (invoice.amount_residual === 0) {
        return { message: `${invoice.name} is already fully paid — nothing to register.` };
      }
      return {
        requiresConfirmation: true as const,
        toolName: "registerPayment",
        summary: `Register payment of ₹${invoice.amount_residual.toLocaleString("en-IN")} for ${invoice.name} via ${journal === "bank" ? "Bank" : "Cash"}`,
        args: { moveId: invoice.id, journal },
      };
    },
  }),
};
