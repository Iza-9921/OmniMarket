"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useElementWidth } from "@/hooks/use-element-width";
import {
  formatAmount,
  formatCompactCurrency,
  formatShortDay,
} from "@/lib/format";

// Tokens de las gráficas (guía de visualización): una sola serie en un solo
// tono validado contra el fondo; cuadrícula y ejes discretos; texto en tinta.
const SERIES = "#2a78d6";
const GRID = "#e2e8f0";
const TEXT_MUTED = "#64748b";
const SURFACE = "#ffffff";

const axisTick = { fill: TEXT_MUTED, fontSize: 12 };

function ChartTooltip({
  active,
  payload,
  title,
  detail,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>;
  title: (row: Record<string, unknown>) => string;
  detail?: (row: Record<string, unknown>) => string;
}) {
  const row = payload?.[0]?.payload as Record<string, unknown> | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-sm font-semibold text-slate-900 tabular-nums">
        {formatAmount(Number(payload?.[0]?.value ?? 0))}
      </p>
      <p className="mt-0.5 text-slate-500">{title(row)}</p>
      {detail && <p className="text-slate-500">{detail(row)}</p>}
    </div>
  );
}

type DailyPoint = { date: string; orders: number; revenueCents: number };

/** Ingresos por día: una serie, línea de 2 px con área al 10 %. */
export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const points = data.map((d) => ({ ...d, revenue: d.revenueCents / 100 }));

  return (
    <div ref={ref} className="h-72 w-full">
      {width > 0 && (
        <AreaChart
          width={width}
          height={288}
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={32}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatCompactCurrency}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ stroke: TEXT_MUTED, strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                title={(row) => formatShortDay(String(row.date))}
                detail={(row) =>
                  `${row.orders} ${row.orders === 1 ? "pedido" : "pedidos"}`
                }
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Ingresos"
            stroke={SERIES}
            strokeWidth={2}
            fill={SERIES}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </div>
  );
}

type CategoryPoint = { name: string; units: number; revenueCents: number };

/** Ingresos por categoría: barras horizontales de un solo tono, ordenadas. */
export function CategoryChart({ data }: { data: CategoryPoint[] }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const points = data.map((d) => ({ ...d, revenue: d.revenueCents / 100 }));
  const height = Math.max(points.length * 36, 72);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && (
        <BarChart
          width={width}
          height={height}
          data={points}
          layout="vertical"
          margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
          accessibilityLayer
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...axisTick, fill: "#334155" }}
            tickLine={false}
            axisLine={false}
            width={96}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                title={(row) => String(row.name)}
                detail={(row) => `${row.units} unidades`}
              />
            )}
          />
          <Bar
            dataKey="revenue"
            name="Ingresos"
            fill={SERIES}
            barSize={18}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="revenue"
              position="right"
              formatter={(value) => formatCompactCurrency(Number(value))}
              style={{ fill: "#334155", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      )}
    </div>
  );
}
