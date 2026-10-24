"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Button,
  ButtonLink,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/controls";
import { PRODUCT_STATUS_LABELS } from "@/components/ui/status-badge";
import { useCatalog } from "@/hooks/use-orders";
import { useSaveProduct, type Product } from "@/hooks/use-products";
import { ApiError, apiFetch } from "@/lib/api-client";
import { PRODUCT_STATUSES } from "@/lib/domain";
import { grossMarginPct } from "@/lib/metrics";
import { centsToInput, MONEY_PATTERN, parseMoneyToCents } from "@/lib/money";
import {
  productInputSchema,
  type ProductData,
  type ProductInput,
} from "@/lib/schemas/catalog";

const SKU_TAKEN_MESSAGE = "Ya existe un producto con ese SKU.";

const EMPTY: ProductInput = {
  sku: "",
  name: "",
  description: "",
  categoryId: "" as unknown as number,
  price: "",
  cost: "",
  stock: 0,
  status: "ACTIVE",
};

function fromProduct(product: Product): ProductInput {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    price: centsToInput(product.priceCents),
    cost: centsToInput(product.costCents),
    stock: product.stock,
    status: product.status,
  };
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const catalog = useCatalog();
  const save = useSaveProduct(product?.id);
  // Ids únicos: Next conserva montada (oculta) la página anterior al navegar.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const form = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productInputSchema),
    defaultValues: product ? fromProduct(product) : EMPTY,
  });
  const { register, handleSubmit, getValues, setError, control, formState } =
    form;
  const errors = formState.errors;

  const [price, cost] = useWatch({ control, name: ["price", "cost"] });
  const margin =
    MONEY_PATTERN.test(price) && MONEY_PATTERN.test(cost)
      ? grossMarginPct(parseMoneyToCents(price), parseMoneyToCents(cost))
      : null;

  // Se valida en el navegador y se envían los valores tal cual: el servidor
  // vuelve a validarlos con el mismo esquema.
  const onSubmit = handleSubmit(async (data) => {
    // Comprobación previa del SKU: un duplicado se informa sin provocar un 409.
    const params = new URLSearchParams({ sku: data.sku });
    if (product) params.set("excludeId", product.id);
    try {
      const { available } = await apiFetch<{ available: boolean }>(
        `/api/products/sku-availability?${params}`,
      );
      if (!available) {
        setError("sku", { message: SKU_TAKEN_MESSAGE });
        toast.error(SKU_TAKEN_MESSAGE);
        return;
      }
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }

    save.mutate(getValues(), {
      onSuccess: (saved) => {
        toast.success(
          product ? "Producto actualizado" : `Producto «${saved.name}» creado`,
        );
        router.push("/products");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          for (const issue of error.issues) {
            setError(issue.path as keyof ProductInput, {
              message: issue.message,
            });
          }
          if (error.code === "SKU_TAKEN")
            setError("sku", { message: error.message });
        }
        toast.error(error.message);
      },
    });
  });

  const fieldProps = (name: keyof ProductInput) => ({
    id: fid(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${fid(name)}-error` : undefined,
    ...register(name),
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={fid("sku")}
          label="SKU"
          error={errors.sku?.message}
          hint="Letras, números y guiones"
        >
          <Input
            {...fieldProps("sku")}
            autoComplete="off"
            className="font-mono uppercase"
          />
        </Field>
        <Field id={fid("name")} label="Nombre" error={errors.name?.message}>
          <Input {...fieldProps("name")} />
        </Field>
        <div className="sm:col-span-2">
          <Field
            id={fid("description")}
            label="Descripción (opcional)"
            error={errors.description?.message}
          >
            <Textarea {...fieldProps("description")} rows={3} />
          </Field>
        </div>
        <Field
          id={fid("categoryId")}
          label="Categoría"
          error={errors.categoryId?.message}
        >
          <Select {...fieldProps("categoryId")} disabled={catalog.isPending}>
            <option value="">Elige una categoría</option>
            {catalog.data?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={fid("status")} label="Estado" error={errors.status?.message}>
          <Select {...fieldProps("status")}>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id={fid("price")}
          label="Precio de venta (MXN)"
          error={errors.price?.message}
        >
          <Input
            {...fieldProps("price")}
            inputMode="decimal"
            placeholder="199.99"
          />
        </Field>
        <Field
          id={fid("cost")}
          label="Costo (MXN)"
          error={errors.cost?.message}
          hint={margin !== null ? `Margen bruto: ${margin}%` : undefined}
        >
          <Input
            {...fieldProps("cost")}
            inputMode="decimal"
            placeholder="120.00"
          />
        </Field>
        <Field
          id={fid("stock")}
          label="Stock (unidades)"
          error={errors.stock?.message}
        >
          <Input {...fieldProps("stock")} type="number" min={0} step={1} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <ButtonLink variant="secondary" href="/products">
          Cancelar
        </ButtonLink>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending
            ? "Guardando…"
            : product
              ? "Guardar cambios"
              : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
