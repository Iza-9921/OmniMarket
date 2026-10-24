import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderEditor } from "@/components/orders/order-editor";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/products/product-editor";

export const metadata: Metadata = { title: "Pedido" };

export default function OrderPage() {
  return (
    <main className="max-w-4xl">
      <PageHeader title="Detalle del pedido" />
      <Suspense fallback={<FormSkeleton />}>
        <OrderEditor />
      </Suspense>
    </main>
  );
}
