// Constantes de dominio compartidas por la interfaz, los servicios y la base de datos.

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const STATUS_EVENT_SOURCES = ["KANBAN", "BULK", "FORM", "SEED"] as const;
export type StatusEventSource = (typeof STATUS_EVENT_SOURCES)[number];

// Roles (decisión D4): todo usuario nuevo entra como OPERATOR; nadie es ADMIN por defecto.
export const USER_ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const DEFAULT_USER_ROLE: UserRole = "OPERATOR";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Solo lectura",
};

// Región del negocio (decisión D5).
export const CURRENCY = "MXN";
export const LOCALE = "es-MX";
export const TIME_ZONE = "America/Mexico_City";

// IVA aplicado sobre el subtotal de cada pedido.
export const TAX_RATE = 0.16;
