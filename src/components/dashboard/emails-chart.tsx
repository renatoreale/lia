"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function EmailsChart({
  data,
}: {
  data: { day: string; ricevute: number; evase: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillRicevute" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillEvase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          className="fill-muted-foreground"
        />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="ricevute"
          stroke="var(--color-chart-1)"
          fill="url(#fillRicevute)"
          strokeWidth={2}
          name="Ricevute"
        />
        <Area
          type="monotone"
          dataKey="evase"
          stroke="var(--color-chart-2)"
          fill="url(#fillEvase)"
          strokeWidth={2}
          name="Evase"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
