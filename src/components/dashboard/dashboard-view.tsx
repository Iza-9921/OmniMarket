"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button, Input } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { apiFetch } from "@/lib/api-client";
import {
  DASHBOARD_RANGES,
  dashboardQuerySchema,
  type DashboardPreset,
} from "@/lib/dashboard";
import { filtersToParams } from "@/lib/filters";
import {
  formatAmount,
  formatCurrency,
  formatDate,
  formatShortDay,
} from "@/lib/format";
import type { getDashboard } from "@/server/services/analytics";
import { CategoryChart, RevenueChart } from "./charts";

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

export function DashboardView() {
  const { filters, setFilters } = useUrlFilters(dashboardQuerySchema);
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () =>
      apiFetch<Dashboard>(`/api/dashboard?${filtersToParams(filters)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <RangeFilter
        range={filters.range}
        from={data?.range.from ?? filters.from}
        to={data?.range.to ?? filters.to}
        onPreset={(range) =>
          setFilters({ range, from: undefined, to: undefined })
        }
        onCustom={(from, to) => setFilters({ range: "custom", from, to })}
      />

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar las métricas.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : isPending || !data ? (
        <DashboardSkeleton />
      ) : (
        <div
          aria-busy={isFetching}
          className={`space-y-6 transition-opacity ${isFetching ? "opacity-60" : ""}`}
        >
          <Kpis summary={data.summary} />
          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Ingresos por día"
              subtitle={`${formatShortDay(data.range.from)} – ${formatShortDay(data.range.to)} · sin IVA, sin cancelados`}
            >
              <RevenueChart data={data.daily} />
              <DataTableToggle label="Ver ingresos por día">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 font-medium">Día</th>
                      <th className="py-1 text-right font-medium">Pedidos</th>
                      <th className="py-1 text-right font-medium">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {[...data.daily].reverse().map((day) => (
                      <tr key={day.date}>
                        <td className="py-1">
                          {formatDate(`${day.date}T12:00:00Z`)}
                        </td>
                        <td className="py-1 text-right">{day.orders}</td>
                        <td className="py-1 text-right">
                          {formatCurrency(day.revenueCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableToggle>
            </Card>
            <Card
              className="lg:col-span-2"
              title="Ingresos por categoría"
              subtitle="Mismo periodo, de mayor a menor"
            >
              {data.byCategory.length ? (
                <CategoryChart data={data.byCategory} />
              ) : (
                <EmptyChart />
              )}
              <DataTableToggle label="Ver ingresos por categoría">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 font-medium">Categoría</th>
                      <th className="py-1 text-right font-medium">Unidades</th>
                      <th className="py-1 text-right font-medium">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {data.byCategory.map((c) => (
                      <tr key={c.name}>
                        <td className="py-1">{c.name}</td>
                        <td className="py-1 text-right">{c.units}</td>
                        <td className="py-1 text-right">
                          {formatCurrency(c.revenueCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableToggle>
            </Card>
          </div>
          <Card
            title="Productos más vendidos"
            subtitle="Por ingresos en el periodo"
          >
            <TopProducts products={data.topProducts} />
          </Card>
        </div>
      )}
    </div>
  );
}

function RangeFilter({
  range,
  from,
  to,
  onPreset,
  onCustom,
}: {
  range: string;
  from?: string;
  to?: string;
  onPreset: (range: DashboardPreset) => void;
  onCustom: (from: string, to: string) => void;
}) {
  const uid = useId();
  // Borrador local: el rango personalizado se aplica al pulsar "Aplicar".
  const [draft, setDraft] = useState<{ from: string; to: string } | null>(null);
  const draftFrom = draft?.from ?? from ?? "";
  const draftTo = draft?.to ?? to ?? "";
  const valid = draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div
        role="group"
        aria-label="Periodo"
        className="flex rounded-lg border border-slate-300 bg-white p-0.5"
      >
        {(Object.keys(DASHBOARD_RANGES) as DashboardPreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={range === preset}
            onClick={() => {
              setDraft(null);
              onPreset(preset);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              range === preset
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {DASHBOARD_RANGES[preset].label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <div>
          <label
            htmlFor={`${uid}-from`}
            className="block text-xs text-slate-500"
          >
            Desde
          </label>
          <Input
            id={`${uid}-from`}
            type="date"
            value={draftFrom}
            onChange={(e) => setDraft({ from: e.target.value, to: draftTo })}
            className="w-40"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-to`} className="block text-xs text-slate-500">
            Hasta
          </label>
          <Input
            id={`${uid}-to`}
            type="date"
            value={draftTo}
            onChange={(e) => setDraft({ from: draftFrom, to: e.target.value })}
            className="w-40"
          />
        </div>
        <Button
          variant="secondary"
          disabled={!draft || !valid}
          onClick={() => {
            onCustom(draftFrom, draftTo);
            setDraft(null);
          }}
        >
          Aplicar
        </Button>
      </div>
      {draft && !valid && (
        <p role="alert" className="w-full text-xs text-red-600">
          La fecha inicial debe ser anterior o igual a la final.
        </p>
      )}
    </div>
  );
}

function Kpis({ summary }: { summary: Dashboard["summary"] }) {
  const tiles = [
    {
      label: "Pedidos",
      value: summary.orders.toLocaleString("es-MX"),
      testId: "kpi-orders",
    },
    {
      label: "Ticket promedio",
      value: formatAmount(summary.avgTicket),
      testId: "kpi-avg-ticket",
    },
    {
      label: "Margen bruto",
      value: formatAmount(summary.grossMargin),
      detail: `${summary.grossMarginPct}% de los ingresos`,
      testId: "kpi-margin",
    },
  ];
  return (
    <section
      aria-label="Indicadores del periodo"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:col-span-2 lg:col-span-1">
        <p className="text-sm text-slate-500">Ingresos</p>
        <p
          className="mt-1 text-3xl font-semibold tracking-tight text-slate-900"
          data-testid="kpi-revenue"
        >
          {formatAmount(summary.revenue)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Sin IVA ni pedidos cancelados
        </p>
      </div>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <p className="text-sm text-slate-500">{tile.label}</p>
          <p
            className="mt-1 text-2xl font-semibold tracking-tight text-slate-900"
            data-testid={tile.testId}
          >
            {tile.value}
          </p>
          {tile.detail && (
            <p className="mt-1 text-xs text-slate-500">{tile.detail}</p>
          )}
        </div>
      ))}
    </section>
  );
}

function TopProducts({ products }: { products: Dashboard["topProducts"] }) {
  if (products.length === 0) return <EmptyChart />;
  return (
    <table className="w-full text-sm" aria-label="Productos más vendidos">
      <thead>
        <tr className="text-left text-xs text-slate-500 uppercase">
          <th className="w-8 py-2 pr-3 font-semibold">#</th>
          <th className="py-2 font-semibold">Producto</th>
          <th className="py-2 pl-3 text-right font-semibold">Unidades</th>
          <th className="py-2 pl-3 text-right font-semibold">Ingresos</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {products.map((p, i) => (
          <tr key={p.id}>
            <td className="w-8 py-2 pr-3 text-slate-400 tabular-nums">
              {i + 1}
            </td>
            <td className="py-2">
              <span className="font-medium text-slate-900">{p.name}</span>{" "}
              <span className="font-mono text-xs text-slate-500">{p.sku}</span>
            </td>
            <td className="py-2 pl-3 text-right tabular-nums">{p.units}</td>
            <td className="py-2 pl-3 text-right font-medium tabular-nums">
              {formatCurrency(p.revenueCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}
    >
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DataTableToggle({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline">
        {label}
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto">{children}</div>
    </details>
  );
}

function EmptyChart() {
  return (
    <p className="py-10 text-center text-sm text-slate-500">
      No hay ventas en este periodo.
    </p>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-96 rounded-xl lg:col-span-3" />
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
