"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/hooks/use-products";
import { ProductForm } from "./product-form";

/** Edición: carga el producto de la URL y muestra el formulario relleno. */
export function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = useProduct(id);

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
  return <ProductForm product={data} />;
}

export function FormSkeleton() {
  return (
    <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
