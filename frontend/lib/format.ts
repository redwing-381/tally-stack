export function formatMoney(amount: number, symbol = "₹") {
  // The sign has to come before the currency symbol ("-₹1,234"), not after
  // it ("₹-1,234") — toLocaleString puts the minus wherever the amount's
  // own sign lands, which is inside the template literal after the symbol
  // unless the sign is pulled out and placed first here.
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Odoo's create_date comes back as "YYYY-MM-DD HH:MM:SS" with no timezone
 * marker — it's always UTC, but a bare string like that gets parsed as
 * local time by some JS engines. Converting the separator and appending Z
 * removes the ambiguity before doing any math on it.
 */
export function timeAgo(datetime: string): string {
  const date = new Date(`${datetime.replace(" ", "T")}Z`);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(value: string | false) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
