"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useKanbanBoard, useMoveOrder } from "@/hooks/use-kanban";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";
import { findCard, type KanbanCard } from "@/lib/kanban";

const COLUMN_ACCENT: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  PROCESSING: "bg-blue-500",
  SHIPPED: "bg-violet-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-slate-400",
};

const label = (status: OrderStatus) => ORDER_STATUS_LABELS[status];

// Con el puntero se usa la columna bajo el cursor; con teclado, la que más se solapa.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

export function KanbanBoard() {
  const { data: board, isPending, isError, refetch } = useKanbanBoard();
  const move = useMoveOrder();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    // 6 px de margen: un clic en el enlace del pedido no inicia un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function moveTo(card: KanbanCard, toStatus: OrderStatus) {
    if (card.status === toStatus || pendingIds.has(card.id)) return;
    const fromStatus = card.status;
    setPendingIds((ids) => new Set(ids).add(card.id));

    move.mutate(
      { card, toStatus },
      {
        onSuccess: () =>
          toast.success(`${card.code} movido a «${label(toStatus)}»`),
        onError: (error) =>
          toast.error(
            `${error.message} ${card.code} volvió a «${label(fromStatus)}».`,
          ),
        onSettled: () =>
          setPendingIds((ids) => {
            const next = new Set(ids);
            next.delete(card.id);
            return next;
          }),
      },
    );
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!board || !event.over) return;
    const card = findCard(board, String(event.active.id));
    if (card) moveTo(card, event.over.id as OrderStatus);
  }

  if (isPending) return <BoardSkeleton />;
  if (isError || !board) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No se pudo cargar el tablero.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => refetch()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const activeCard = activeId ? findCard(board, activeId) : undefined;
  const codeOf = (id: string | number) =>
    findCard(board, String(id))?.code ?? "";
  const columnOf = (id: string | number | undefined) =>
    id ? label(id as OrderStatus) : "ninguna columna";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste el pedido ${codeOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      `El pedido ${codeOf(active.id)} está sobre ${columnOf(over?.id)}.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste el pedido ${codeOf(active.id)} en ${columnOf(over.id)}.`
        : `Soltaste el pedido ${codeOf(active.id)} fuera del tablero.`,
    onDragCancel: ({ active }) =>
      `Movimiento del pedido ${codeOf(active.id)} cancelado.`,
  };

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para mover un pedido, pulsa espacio o Enter, usa las flechas para elegir la columna y vuelve a pulsar espacio o Enter para soltarlo. Escape cancela.",
        },
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ORDER_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            total={board[status].total}
            cards={board[status].items}
            pendingIds={pendingIds}
            onMove={moveTo}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardBody card={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  total,
  cards,
  pendingIds,
  onMove,
}: {
  status: OrderStatus;
  total: number;
  cards: KanbanCard[];
  pendingIds: Set<string>;
  onMove: (card: KanbanCard, toStatus: OrderStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const hidden = total - cards.length;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}-title`}
      data-testid={`column-${status}`}
      className={`flex min-w-60 flex-1 flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-200 bg-slate-100/70"
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2
          id={`column-${status}-title`}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${COLUMN_ACCENT[status]}`}
          />
          {label(status)}
        </h2>
        <span
          className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums ring-1 ring-slate-200"
          data-testid={`column-${status}-total`}
        >
          {total}
        </span>
      </header>

      <ul className="flex min-h-24 flex-1 flex-col gap-2 px-3 pb-3">
        {cards.map((card) => (
          <li key={card.id}>
            <DraggableCard
              card={card}
              pending={pendingIds.has(card.id)}
              onMove={onMove}
            />
          </li>
        ))}
        {cards.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
            Sin pedidos. Suelta una tarjeta aquí.
          </li>
        )}
      </ul>

      {hidden > 0 && (
        <Link
          href={`/orders?status=${status}`}
          className="border-t border-slate-200 px-3 py-2 text-center text-xs font-medium text-indigo-600 hover:bg-white"
        >
          Ver los {hidden} pedidos más antiguos
        </Link>
      )}
    </section>
  );
}

function DraggableCard({
  card,
  pending,
  onMove,
}: {
  card: KanbanCard;
  pending: boolean;
  onMove: (card: KanbanCard, toStatus: OrderStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: pending,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="tarjeta arrastrable"
      aria-label={`Pedido ${card.code}, ${card.customerName}, ${label(card.status)}`}
      data-testid={`card-${card.code}`}
      className={`touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        isDragging ? "opacity-40" : ""
      } ${pending ? "cursor-progress" : "cursor-grab active:cursor-grabbing"}`}
    >
      <CardBody card={card} pending={pending} onMove={onMove} />
    </div>
  );
}

function CardBody({
  card,
  overlay = false,
  pending = false,
  onMove,
}: {
  card: KanbanCard;
  overlay?: boolean;
  pending?: boolean;
  onMove?: (card: KanbanCard, toStatus: OrderStatus) => void;
}) {
  const selectId = useId();
  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xs ${
        overlay ? "rotate-2 shadow-lg ring-2 ring-indigo-400" : ""
      } ${pending ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/orders/${card.id}`}
          className="font-mono text-xs font-semibold text-slate-900 hover:text-indigo-600"
          // El enlace no debe iniciar el arrastre ni robar el foco del teclado.
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {card.code}
        </Link>
        <span className="font-medium text-slate-900 tabular-nums">
          {formatCurrency(card.totalCents)}
        </span>
      </div>
      <p className="mt-1 truncate text-slate-700">{card.customerName}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {card.itemsCount} {card.itemsCount === 1 ? "artículo" : "artículos"} ·{" "}
          {formatDate(card.updatedAt)}
        </span>
        {onMove && (
          <>
            <label htmlFor={selectId} className="sr-only">
              Mover {card.code} a
            </label>
            <select
              id={selectId}
              value={card.status}
              disabled={pending}
              onChange={(e) => onMove(card, e.target.value as OrderStatus)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="max-w-28 rounded-md border border-slate-200 bg-white py-0.5 pr-6 pl-1.5 text-xs text-slate-600"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </article>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" aria-busy="true">
      {ORDER_STATUSES.map((status) => (
        <div
          key={status}
          className="min-w-60 flex-1 space-y-2 rounded-xl border border-slate-200 bg-slate-100/70 p-3"
        >
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg bg-white" />
          ))}
        </div>
      ))}
    </div>
  );
}
