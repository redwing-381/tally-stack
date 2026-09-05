"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Row {
  name: string;
  planned_amount: number;
  actual_amount: number;
}

export function BudgetChart({ data, currencySymbol }: { data: Row[]; currencySymbol: string }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No budgets yet. Create one to see planned vs. actual here.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
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
        <Bar dataKey="planned_amount" name="Planned" fill="var(--muted-foreground)" />
        <Bar dataKey="actual_amount" name="Actual" fill="var(--accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
