"use client";

import { useParams } from "next/navigation";
import { FormSkeleton } from "@/components/products/product-editor";
import { useOrder } from "@/hooks/use-orders";
import { OrderForm } from "./order-form";

/** Detalle y edición del pedido de la URL. */
export function OrderEditor() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = useOrder(id);

  if (isPending) return <FormSkeleton />;
  if (isError) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error.message}
      </p>
    );
  }
  return <OrderForm key={`${data.id}-${data.version}`} order={data} />;
}
