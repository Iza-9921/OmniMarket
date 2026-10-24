import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/components/orders/orders-view";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/controls";
import { TableSkeleton } from "@/components/ui/data-table";

export const metadata: Metadata = { title: "Pedidos" };

export default function OrdersPage() {
  return (
    <main>
      <PageHeader
        title="Pedidos"
        description="Pedidos con filtros por estado, cliente y fecha."
        action={<ButtonLink href="/orders/new">Nuevo pedido</ButtonLink>}
      />
      <Suspense fallback={<TableSkeleton />}>
        <OrdersView />
      </Suspense>
    </main>
  );
}
