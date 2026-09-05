/**
 * The spec's Chart of Accounts asks for five types — Asset, Liability,
 * Expense, Income, Capital. Odoo splits those into eighteen granular
 * account_type values, and posting logic depends on the granular one (a
 * receivable behaves differently from a plain current asset). So we keep
 * Odoo's values as the stored truth and carry the spec's five families
 * alongside them: the picker groups by family, the list column shows it.
 */
export const ACCOUNT_TYPES = [
  { value: "asset_receivable", label: "Receivable", family: "Asset" },
  { value: "asset_cash", label: "Bank and cash", family: "Asset" },
  { value: "asset_current", label: "Current asset", family: "Asset" },
  { value: "asset_non_current", label: "Non-current asset", family: "Asset" },
  { value: "asset_prepayments", label: "Prepayment", family: "Asset" },
  { value: "asset_fixed", label: "Fixed asset", family: "Asset" },
  { value: "liability_payable", label: "Payable", family: "Liability" },
  { value: "liability_credit_card", label: "Credit card", family: "Liability" },
  { value: "liability_current", label: "Current liability", family: "Liability" },
  { value: "liability_non_current", label: "Non-current liability", family: "Liability" },
  { value: "income", label: "Income", family: "Income" },
  { value: "income_other", label: "Other income", family: "Income" },
  { value: "expense", label: "Expense", family: "Expense" },
  { value: "expense_direct_cost", label: "Cost of revenue", family: "Expense" },
  { value: "expense_depreciation", label: "Depreciation", family: "Expense" },
  { value: "equity", label: "Equity", family: "Capital" },
  { value: "equity_unaffected", label: "Current year earnings", family: "Capital" },
  { value: "off_balance", label: "Off-balance sheet", family: "Other" },
] as const;

export const ACCOUNT_FAMILIES = ["Asset", "Liability", "Income", "Expense", "Capital"] as const;

export function accountTypeLabel(value: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function accountFamily(value: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === value)?.family ?? "Other";
}

/** Journal types, spec-named. */
export const JOURNAL_TYPES = [
  { value: "sale", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "general", label: "Miscellaneous" },
] as const;

export function journalTypeLabel(value: string): string {
  return JOURNAL_TYPES.find((t) => t.value === value)?.label ?? value;
}

/**
 * The spec lists Goods/Service/combo. Odoo 17 Community without the stock
 * app exposes only `consu` (goods) and `service` — "combo" products arrived
 * in Odoo 18 — so those are the two real options here.
 */
export const PRODUCT_TYPES = [
  { value: "consu", label: "Goods" },
  { value: "service", label: "Service" },
] as const;

export function productTypeLabel(value: string): string {
  return PRODUCT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const ANALYTIC_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
] as const;
