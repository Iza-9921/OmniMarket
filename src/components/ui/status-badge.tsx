import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type ProductStatus,
} from "@/lib/domain";

const ORDER_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-600/20",
  SHIPPED: "bg-violet-50 text-violet-800 ring-violet-600/20",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Activo",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
};

const PRODUCT_STYLES: Record<ProductStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  DRAFT: "bg-amber-50 text-amber-800 ring-amber-600/20",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${BASE} ${ORDER_STYLES[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={`${BASE} ${PRODUCT_STYLES[status]}`}>
      {PRODUCT_STATUS_LABELS[status]}
    </span>
  );
}
