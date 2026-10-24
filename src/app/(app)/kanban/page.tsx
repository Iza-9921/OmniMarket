import type { Metadata } from "next";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Kanban" };

export default function KanbanPage() {
  return (
    <main>
      <PageHeader
        title="Kanban de pedidos"
        description="Arrastra una tarjeta a otra columna (o usa «Mover a») para cambiar el estado del pedido."
      />
      <KanbanBoard />
    </main>
  );
}
