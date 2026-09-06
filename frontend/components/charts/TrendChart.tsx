"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Row {
  month: string;
  sales: number;
  purchases: number;
}

export function TrendChart({ data, currencySymbol }: { data: Row[]; currencySymbol: string }) {
  const hasActivity = data.some((row) => row.sales > 0 || row.purchases > 0);
  if (!hasActivity) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No posted sales or purchases in this window yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${currencySymbol}${Math.round(v / 1000)}k`}
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
        <Bar dataKey="sales" name="Sales" fill="var(--accent)" />
        <Bar dataKey="purchases" name="Purchases" fill="var(--muted-foreground)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
