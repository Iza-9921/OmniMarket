import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  DEFAULT_USER_ROLE,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  STATUS_EVENT_SOURCES,
  USER_ROLES,
} from "@/lib/domain";

// El dinero se guarda en centavos (enteros) para evitar errores de redondeo.

export const userRole = pgEnum("user_role", USER_ROLES);
export const orderStatus = pgEnum("order_status", ORDER_STATUSES);
export const productStatus = pgEnum("product_status", PRODUCT_STATUSES);
export const statusEventSource = pgEnum(
  "status_event_source",
  STATUS_EVENT_SOURCES,
);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// Usuarios y cuentas OAuth (forma que exige @auth/drizzle-adapter). Las sesiones
// son JWT, así que no hay tabla de sesiones. El reset de datos no toca estas tablas.
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // El valor por defecto lo aplica la base de datos: un alta nunca elige su rol.
  role: userRole("role").notNull().default(DEFAULT_USER_ROLE),
  createdAt: timestamps.createdAt,
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    priceCents: integer("price_cents").notNull(),
    costCents: integer("cost_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    status: productStatus("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [
    check("products_price_non_negative", sql`${t.priceCents} >= 0`),
    check("products_cost_non_negative", sql`${t.costCents} >= 0`),
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_updated_at_idx").on(t.updatedAt.desc()),
  ],
);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  city: text("city").notNull(),
  createdAt: timestamps.createdAt,
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Código legible y estable, p. ej. ORD-0001 (lo usan el evaluador y los E2E).
    code: text("code").notNull().unique(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("PENDING"),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    costCents: integer("cost_cents").notNull(),
    // Control de concurrencia optimista: cada cambio de estado la incrementa.
    version: integer("version").notNull().default(1),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    updatedAt: timestamps.updatedAt,
  },
  (t) => [
    index("orders_status_updated_at_idx").on(t.status, t.updatedAt.desc()),
    index("orders_placed_at_idx").on(t.placedAt),
    index("orders_customer_idx").on(t.customerId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitCostCents: integer("unit_cost_cents").notNull(),
  },
  (t) => [
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
  ],
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    // Quién hizo el cambio; null para el seed o si el usuario se elimina.
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    source: statusEventSource("source").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("order_status_events_order_created_idx").on(
      t.orderId,
      t.createdAt.desc(),
    ),
  ],
);

// Ventas agregadas por día (zona horaria del negocio). Se recalcula al escribir
// pedidos para que la analítica paginada lea pocas filas ya agregadas.
export const dailySales = pgTable("daily_sales", {
  date: date("date", { mode: "string" }).primaryKey(),
  ordersCount: integer("orders_count").notNull(),
  revenueCents: bigint("revenue_cents", { mode: "number" }).notNull(),
  costCents: bigint("cost_cents", { mode: "number" }).notNull(),
});
