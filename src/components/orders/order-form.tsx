"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Button,
  ButtonLink,
  Field,
  Input,
  Select,
} from "@/components/ui/controls";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCatalog,
  useDeleteOrder,
  useSaveOrder,
  type Order,
} from "@/hooks/use-orders";
import { useProductList } from "@/hooks/use-products";
import { ApiError } from "@/lib/api-client";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, TAX_RATE } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/metrics";
import {
  orderInputSchema,
  type OrderData,
  type OrderInput,
} from "@/lib/schemas/catalog";

type LineInfo = { name: string; sku: string; priceCents: number };

export function OrderForm({ order }: { order?: Order }) {
  const router = useRouter();
  const catalog = useCatalog();
  const save = useSaveOrder(order?.id);
  const remove = useDeleteOrder();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Ids únicos: Next conserva montada (oculta) la página anterior al navegar.
  const uid = useId();
  const oid = (name: string) => `${uid}-${name}`;

  // Datos de presentación de cada línea (nombre, precio) por id de producto.
  const [lineInfo, setLineInfo] = useState<Record<string, LineInfo>>(() =>
    Object.fromEntries(
      (order?.items ?? []).map((item) => [
        item.productId,
        { name: item.name, sku: item.sku, priceCents: item.unitPriceCents },
      ]),
    ),
  );

  const form = useForm<OrderInput, unknown, OrderData>({
    resolver: zodResolver(orderInputSchema),
    defaultValues: order
      ? {
          customerId: order.customerId,
          status: order.status,
          version: order.version,
          items: order.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }
      : { customerId: "" as unknown as number, status: "PENDING", items: [] },
  });
  const { register, handleSubmit, getValues, control, setError, formState } =
    form;
  const {
    fields,
    append,
    remove: removeLine,
  } = useFieldArray({ control, name: "items" });
  const errors = formState.errors;
  const items = useWatch({ control, name: "items" });

  const estimate = orderTotals(
    (items ?? []).map((item) => ({
      quantity: Number(item.quantity) || 0,
      unitPriceCents: lineInfo[item.productId]?.priceCents ?? 0,
      unitCostCents: 0,
    })),
    TAX_RATE,
  );

  // Buscador de productos activos para agregar líneas.
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const results = useProductList(
    {
      q: debouncedSearch || undefined,
      status: "ACTIVE",
      limit: 6,
      sort: "name",
      dir: "asc",
    },
    { keepPrevious: false, enabled: debouncedSearch.trim() !== "" },
  );
  // Mientras el texto escrito no coincide con lo consultado, se muestra "Buscando…".
  const searching = results.isFetching || search !== debouncedSearch;
  const chosen = new Set((items ?? []).map((i) => i.productId));

  function addProduct(product: {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
  }) {
    if (chosen.has(product.id)) return;
    setLineInfo((info) => ({ ...info, [product.id]: product }));
    append({ productId: product.id, quantity: 1 });
    setSearch("");
  }

  const onSubmit = handleSubmit(() => {
    save.mutate(getValues(), {
      onSuccess: (saved) => {
        toast.success(
          order
            ? `Pedido ${saved.code} actualizado`
            : `Pedido ${saved.code} creado`,
        );
        router.push(order ? `/orders/${saved.id}` : "/orders");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          for (const issue of error.issues) {
            setError(issue.path as keyof OrderInput, {
              message: issue.message,
            });
          }
        }
        toast.error(error.message);
      },
    });
  });

  function deleteOrder() {
    if (!order) return;
    remove.mutate(order.id, {
      onSuccess: () => {
        toast.success(`Pedido ${order.code} eliminado`);
        router.push("/orders");
      },
      onError: (error) => {
        toast.error(error.message);
        setConfirmDelete(false);
      },
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {order && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600">
          <span>
            Pedido{" "}
            <span className="font-mono font-semibold text-slate-900">
              {order.code}
            </span>
          </span>
          <OrderStatusBadge status={order.status} />
          <span>Creado el {formatDate(order.placedAt)}</span>
          <span>Cliente: {order.customerName}</span>
        </div>
      )}

      <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <Field
          id={oid("customer")}
          label="Cliente"
          error={errors.customerId?.message}
        >
          <Select
            id={oid("customer")}
            aria-invalid={errors.customerId ? true : undefined}
            disabled={catalog.isPending}
            {...register("customerId")}
          >
            <option value="">Elige un cliente</option>
            {catalog.data?.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={oid("status")} label="Estado" error={errors.status?.message}>
          <Select id={oid("status")} {...register("status")}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <section
        aria-labelledby={oid("lines")}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2
          id={oid("lines")}
          className="text-base font-semibold text-slate-900"
        >
          Productos
        </h2>

        <div className="relative mt-4 max-w-md">
          <label htmlFor={oid("picker")} className="sr-only">
            Buscar producto para agregar
          </label>
          <Input
            id={oid("picker")}
            type="search"
            placeholder="Buscar producto activo por nombre o SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && (
            <ul
              aria-label="Resultados"
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              {searching || !results.data ? (
                <li className="px-3 py-2 text-sm text-slate-500">Buscando…</li>
              ) : results.data?.data.length ? (
                results.data.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={chosen.has(p.id)}
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:text-slate-400"
                    >
                      <span>
                        {p.name}{" "}
                        <span className="font-mono text-xs text-slate-500">
                          {p.sku}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(p.priceCents)}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-slate-500">
                  Sin resultados
                </li>
              )}
            </ul>
          )}
        </div>

        {fields.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Todavía no hay productos en el pedido.
          </p>
        ) : (
          <table
            className="mt-4 min-w-full text-sm"
            aria-label="Líneas del pedido"
          >
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="py-2 font-semibold">Producto</th>
                <th className="py-2 font-semibold">Precio</th>
                <th className="py-2 font-semibold">Cantidad</th>
                <th className="py-2 text-right font-semibold">Importe</th>
                <th className="py-2">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const info = lineInfo[field.productId];
                const quantity = Number(items?.[index]?.quantity) || 0;
                const qtyError = errors.items?.[index]?.quantity?.message;
                return (
                  <tr key={field.id}>
                    <td className="py-2 pr-3">
                      {info?.name}{" "}
                      <span className="font-mono text-xs text-slate-500">
                        {info?.sku}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatCurrency(info?.priceCents ?? 0)}
                    </td>
                    <td className="py-2 pr-3">
                      <label htmlFor={oid(`qty-${index}`)} className="sr-only">
                        Cantidad de {info?.name}
                      </label>
                      <Input
                        id={oid(`qty-${index}`)}
                        type="number"
                        min={1}
                        max={999}
                        className="w-20"
                        aria-invalid={qtyError ? true : undefined}
                        {...register(`items.${index}.quantity`)}
                      />
                      {qtyError && (
                        <p className="mt-1 text-xs text-red-600">{qtyError}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatCurrency((info?.priceCents ?? 0) * quantity)}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-red-600 hover:bg-red-50"
                        onClick={() => removeLine(index)}
                        aria-label={`Quitar ${info?.name}`}
                      >
                        Quitar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {errors.items?.message && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {errors.items.message}
          </p>
        )}
        {errors.items?.root?.message && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {errors.items.root.message}
          </p>
        )}

        <dl className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">
              {formatCurrency(estimate.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>IVA (16%)</dt>
            <dd className="tabular-nums">
              {formatCurrency(estimate.taxCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
            <dt>Total estimado</dt>
            <dd className="tabular-nums" data-testid="order-total">
              {formatCurrency(estimate.totalCents)}
            </dd>
          </div>
          <p className="pt-1 text-xs text-slate-500">
            El servidor calcula el total definitivo con los precios vigentes.
          </p>
        </dl>
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        {order ? (
          <Button
            variant="secondary"
            className="text-red-600"
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar pedido
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <ButtonLink variant="secondary" href="/orders">
            Cancelar
          </ButtonLink>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "Guardando…"
              : order
                ? "Guardar cambios"
                : "Crear pedido"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar pedido"
        description={`¿Seguro que quieres eliminar el pedido ${order?.code ?? ""}? Se borrarán sus líneas y su historial.`}
        confirmLabel="Eliminar"
        pending={remove.isPending}
        onConfirm={deleteOrder}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
