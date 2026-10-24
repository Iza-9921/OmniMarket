import type { Metadata } from "next";
import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default function NewOrderPage() {
  return (
    <main className="max-w-4xl">
      <PageHeader title="Nuevo pedido" />
      <OrderForm />
    </main>
  );
}
