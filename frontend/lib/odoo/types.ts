export type Persona = "admin" | "invoicing" | "portal" | "unknown";

export type M2O = [id: number, displayName: string] | false;

export interface Partner {
  id: number;
  name: string;
  partner_type: "customer" | "vendor" | "both" | false;
  email: string | false;
  phone: string | false;
  mobile: string | false;
  city: string | false;
  state_id: M2O;
  country_id: M2O;
  zip: string | false;
  customer_rank: number;
  supplier_rank: number;
}

export interface Product {
  id: number;
  name: string;
  detailed_type: "consu" | "service";
  list_price: number;
  standard_price: number;
  categ_id: M2O;
}

export interface Account {
  id: number;
  name: string;
  code: string;
  account_type: string;
  reconcile: boolean;
}

export interface Journal {
  id: number;
  name: string;
  code: string;
  type: "sale" | "purchase" | "cash" | "bank" | "general";
  default_account_id: M2O;
}

export interface AnalyticAccount {
  id: number;
  name: string;
  ufa_type: "income" | "expense" | false;
  plan_id: M2O;
}

export interface JournalEntry {
  id: number;
  name: string;
  date: string;
  ref: string | false;
  journal_id: M2O;
  state: "draft" | "posted" | "cancel";
}

export interface JournalItem {
  id: number;
  name: string | false;
  account_id: M2O;
  partner_id: M2O;
  debit: number;
  credit: number;
}

export interface Budget {
  id: number;
  name: string;
  period_start: string;
  period_end: string;
  analytic_account_id: M2O;
  planned_amount: number;
  actual_amount: number;
  variance: number;
  responsible_user_id: M2O;
  currency_id: M2O;
}

export interface SaleOrder {
  id: number;
  name: string;
  partner_id: M2O;
  date_order: string;
  amount_total: number;
  state: "draft" | "sent" | "sale" | "cancel";
  invoice_status: "upselling" | "invoiced" | "to invoice" | "no";
  invoice_ids: number[];
  currency_id: M2O;
}

export interface PurchaseOrder {
  id: number;
  name: string;
  partner_id: M2O;
  date_order: string;
  amount_total: number;
  state: "draft" | "sent" | "purchase" | "done" | "cancel";
  invoice_status: "invoiced" | "to invoice" | "no";
  invoice_ids: number[];
  currency_id: M2O;
}

export interface OrderLine {
  id?: number;
  product_id: number | M2O;
  product_uom_qty?: number;
  quantity?: number;
  price_unit: number;
}

export interface AccountMove {
  id: number;
  name: string;
  partner_id: M2O;
  invoice_date: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state:
    | "not_paid"
    | "in_payment"
    | "paid"
    | "partial"
    | "reversed"
    | "invoicing_legacy";
  state: "draft" | "posted" | "cancel";
  move_type: "out_invoice" | "in_invoice" | string;
  currency_id: M2O;
}

export type ReportSection = "asset" | "liability" | "equity" | "income" | "expense";

export interface ReportLine {
  id: number;
  section: ReportSection;
  account_id: M2O;
  balance: number;
}

export interface DashboardSummary {
  outstandingReceivable: number;
  overdueReceivable: number;
  outstandingPayable: number;
  netPosition: number;
  monthProfit: number;
  openSalesOrders: number;
  openPurchaseOrders: number;
  salesPipeline: { value: number; count: number };
  purchasePipeline: { value: number; count: number };
  budgets: { name: string; planned_amount: number; actual_amount: number }[];
  monthlyTrend: { month: string; sales: number; purchases: number }[];
  topOutstanding: {
    id: number;
    name: string;
    partnerName: string;
    amountResidual: number;
    dueDate: string | false;
  }[];
  recentActivity: {
    key: string;
    type: "sale" | "purchase" | "invoice" | "bill" | "payment";
    label: string;
    name: string;
    partnerName: string;
    amount: number;
    date: string;
    href: string | null;
  }[];
  currencySymbol: string;
}
