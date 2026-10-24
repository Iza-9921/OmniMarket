import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductsView } from "@/components/products/products-view";
import { ButtonLink } from "@/components/ui/controls";
import { TableSkeleton } from "@/components/ui/data-table";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage() {
  return (
    <main>
      <PageHeader
        title="Productos"
        description="Catálogo con búsqueda, filtros y paginación del servidor."
        action={<ButtonLink href="/products/new">Nuevo producto</ButtonLink>}
      />
      <Suspense fallback={<TableSkeleton />}>
        <ProductsView />
      </Suspense>
    </main>
  );
}
