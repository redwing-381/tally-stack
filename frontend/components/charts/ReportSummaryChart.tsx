"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface Row {
  name: string;
  value: number;
}

const COLORS = ["var(--accent)", "var(--muted-foreground)", "var(--success)"];

/** One bar per side of the statement — Assets vs. Liabilities+Capital for a
 * Balance Sheet, Income vs. Expenses (vs. Net) for a P&L — so the headline
 * comparison is visible at a glance above the line-item detail below it. */
export function ReportSummaryChart({ data, currencySymbol }: { data: Row[]; currencySymbol: string }) {
  // Net result (or a subtotal) can be negative — the default domain clips
  // anything below 0, which silently hid a negative bar entirely instead
  // of showing it below the axis line.
  const values = data.map((d) => d.value);
  const domain: [number, number] = [Math.min(0, ...values), Math.max(0, ...values)];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          domain={domain}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v < 0 ? "-" : ""}${currencySymbol}${Math.round(Math.abs(v) / 1000)}k`}
        />
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 0,
            fontSize: 13,
          }}
          formatter={(value) => `${currencySymbol}${Number(value).toLocaleString("en-IN")}`}
        />
        <Bar dataKey="value" name="Amount">
          {data.map((row, i) => (
            <Cell key={row.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
