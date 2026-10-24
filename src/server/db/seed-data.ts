// Generador determinista del conjunto de prueba "omnimarket-v1".
//
// Con la misma semilla produce siempre los mismos productos, clientes, pedidos
// e importes. Solo las fechas dependen de `now`: los pedidos se reparten en los
// 180 días anteriores al reset para que el dashboard siempre tenga datos recientes.

import { TAX_RATE, type OrderStatus, type ProductStatus } from "@/lib/domain";
import { toBusinessDay } from "@/lib/format";
import { orderTotals } from "@/lib/metrics";

export const SEED_NAME = "omnimarket-v1";
const SEED = 20261024;
export const SEED_DAYS = 180;
export const SEED_COUNTS = { products: 120, customers: 60, orders: 1500 };

/** Pedidos ancla: los 10 más recientes, con estado fijo para los E2E y el evaluador. */
export const ANCHOR_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PENDING",
  "PENDING",
  "PROCESSING",
  "PROCESSING",
  "SHIPPED",
  "SHIPPED",
  "DELIVERED",
  "DELIVERED",
  "CANCELLED",
];

// México no aplica horario de verano desde 2022: UTC−6 todo el año.
const BUSINESS_UTC_OFFSET = "-06:00";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, items: readonly T[]) =>
  items[int(rng, 0, items.length - 1)];

function uuid(rng: Rng) {
  const hex = Array.from({ length: 32 }, () => int(rng, 0, 15).toString(16));
  hex[12] = "4";
  hex[16] = ((int(rng, 0, 15) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function shiftDay(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

const CATEGORIES = [
  {
    name: "Electrónica",
    slug: "electronica",
    code: "ELE",
    price: [399, 8999],
    nouns: [
      "Audífonos",
      "Bocina",
      "Cargador",
      "Tablet",
      "Smartwatch",
      "Teclado",
    ],
  },
  {
    name: "Hogar",
    slug: "hogar",
    code: "HOG",
    price: [149, 2499],
    nouns: [
      "Lámpara",
      "Cojín",
      "Organizador",
      "Espejo",
      "Reloj de pared",
      "Tapete",
    ],
  },
  {
    name: "Cocina",
    slug: "cocina",
    code: "COC",
    price: [99, 3499],
    nouns: [
      "Sartén",
      "Cafetera",
      "Licuadora",
      "Juego de cuchillos",
      "Tabla",
      "Termo",
    ],
  },
  {
    name: "Moda",
    slug: "moda",
    code: "MOD",
    price: [199, 1899],
    nouns: ["Chamarra", "Playera", "Mochila", "Gorra", "Bufanda", "Cinturón"],
  },
  {
    name: "Deportes",
    slug: "deportes",
    code: "DEP",
    price: [129, 4599],
    nouns: [
      "Tapete de yoga",
      "Mancuernas",
      "Balón",
      "Botella",
      "Bicicleta estática",
      "Cuerda",
    ],
  },
  {
    name: "Belleza",
    slug: "belleza",
    code: "BEL",
    price: [89, 1299],
    nouns: [
      "Crema facial",
      "Perfume",
      "Secadora",
      "Kit de brochas",
      "Sérum",
      "Plancha",
    ],
  },
  {
    name: "Juguetes",
    slug: "juguetes",
    code: "JUG",
    price: [119, 2299],
    nouns: [
      "Rompecabezas",
      "Bloques",
      "Peluche",
      "Carro RC",
      "Juego de mesa",
      "Muñeca",
    ],
  },
  {
    name: "Oficina",
    slug: "oficina",
    code: "OFI",
    price: [49, 3999],
    nouns: [
      "Silla",
      "Libreta",
      "Lámpara LED",
      "Soporte de monitor",
      "Agenda",
      "Calculadora",
    ],
  },
] as const;

const ADJECTIVES = [
  "Pro",
  "Max",
  "Eco",
  "Plus",
  "Lite",
  "Premium",
  "Compacto",
  "Clásico",
  "Urbano",
  "Nova",
];
const FIRST_NAMES = [
  "Ana",
  "Luis",
  "María",
  "José",
  "Sofía",
  "Diego",
  "Valeria",
  "Carlos",
  "Fernanda",
  "Miguel",
  "Daniela",
  "Jorge",
  "Camila",
  "Ricardo",
  "Paola",
];
const LAST_NAMES = [
  "García",
  "Hernández",
  "López",
  "Martínez",
  "González",
  "Pérez",
  "Rodríguez",
  "Sánchez",
  "Ramírez",
  "Torres",
  "Flores",
  "Rivera",
];
const CITIES = [
  "Ciudad de México",
  "Guadalajara",
  "Monterrey",
  "Puebla",
  "Querétaro",
  "Mérida",
  "Toluca",
  "León",
  "Tijuana",
  "Cuernavaca",
];

const ascii = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type SeedData = ReturnType<typeof generateSeedData>;

export function generateSeedData(now: Date) {
  const rng = mulberry32(SEED);

  const categories = CATEGORIES.map((c, i) => ({
    id: i + 1,
    name: c.name,
    slug: c.slug,
  }));

  const products = Array.from({ length: SEED_COUNTS.products }, (_, i) => {
    const categoryIndex = i % CATEGORIES.length;
    const category = CATEGORIES[categoryIndex];
    const priceCents = int(rng, category.price[0], category.price[1]) * 100 - 1;
    const costCents = Math.round(priceCents * (0.45 + rng() * 0.3));
    const status: ProductStatus =
      i >= 116 ? "ARCHIVED" : i >= 110 ? "DRAFT" : "ACTIVE";
    const name = `${pick(rng, category.nouns)} ${pick(rng, ADJECTIVES)}`;
    return {
      id: uuid(rng),
      sku: `${category.code}-${String(i + 1).padStart(4, "0")}`,
      name,
      description: `${name} de la categoría ${category.name}.`,
      categoryId: categoryIndex + 1,
      priceCents,
      costCents,
      stock: rng() < 0.08 ? 0 : int(rng, 1, 250),
      status,
    };
  });
  const activeProducts = products.filter((p) => p.status === "ACTIVE");

  const usedEmails = new Set<string>();
  const customers = Array.from({ length: SEED_COUNTS.customers }, (_, i) => {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    let email = `${ascii(first)}.${ascii(last)}@ejemplo.mx`;
    if (usedEmails.has(email))
      email = `${ascii(first)}.${ascii(last)}${i + 1}@ejemplo.mx`;
    usedEmails.add(email);
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email,
      city: pick(rng, CITIES),
    };
  });

  const today = toBusinessDay(now);
  const latestAllowed = now.getTime() - 5 * 60 * 1000;

  const draft = Array.from({ length: SEED_COUNTS.orders }, () => {
    const ageDays = Math.min(
      SEED_DAYS - 1,
      Math.floor(rng() ** 1.15 * SEED_DAYS),
    );
    const day = shiftDay(today, -ageDays);
    const hh = String(int(rng, 8, 22)).padStart(2, "0");
    const mm = String(int(rng, 0, 59)).padStart(2, "0");
    // Se ordena por la hora planeada (no depende de `now`); la que cae en el futuro
    // se recorta a "hace 5 minutos" sin alterar los códigos ni los estados.
    const plannedAt = Date.parse(`${day}T${hh}:${mm}:00${BUSINESS_UTC_OFFSET}`);
    const placedAt = new Date(Math.min(plannedAt, latestAllowed));

    const lineCount = int(rng, 1, 4);
    const chosen = new Set<number>();
    while (chosen.size < lineCount)
      chosen.add(int(rng, 0, activeProducts.length - 1));
    const lines = [...chosen].map((index) => {
      const product = activeProducts[index];
      return {
        productId: product.id,
        quantity: rng() < 0.7 ? 1 : int(rng, 2, 3),
        unitPriceCents: product.priceCents,
        unitCostCents: product.costCents,
      };
    });

    const r = rng();
    let status: OrderStatus;
    if (ageDays <= 2)
      status = r < 0.4 ? "PENDING" : r < 0.75 ? "PROCESSING" : "SHIPPED";
    else if (ageDays <= 7)
      status =
        r < 0.2
          ? "PROCESSING"
          : r < 0.7
            ? "SHIPPED"
            : r < 0.95
              ? "DELIVERED"
              : "CANCELLED";
    else status = r < 0.93 ? "DELIVERED" : "CANCELLED";

    return {
      id: uuid(rng),
      customerId: int(rng, 1, customers.length),
      plannedAt,
      placedAt,
      status,
      updateDelayHours: int(rng, 1, 72),
      lines,
    };
  });

  // Los códigos se asignan del más reciente (ORD-0001) al más antiguo.
  draft.sort((a, b) => b.plannedAt - a.plannedAt || a.id.localeCompare(b.id));
  draft.forEach((order, i) => {
    if (i < ANCHOR_ORDER_STATUSES.length)
      order.status = ANCHOR_ORDER_STATUSES[i];
  });

  const orders = draft.map((order, i) => {
    const totals = orderTotals(order.lines, TAX_RATE);
    const updatedAt =
      order.status === "PENDING"
        ? order.placedAt
        : new Date(
            Math.min(
              order.placedAt.getTime() + order.updateDelayHours * 3600 * 1000,
              latestAllowed,
            ),
          );
    return {
      id: order.id,
      code: `ORD-${String(i + 1).padStart(4, "0")}`,
      customerId: order.customerId,
      status: order.status,
      ...totals,
      version: 1,
      placedAt: order.placedAt,
      updatedAt,
    };
  });

  const orderItems = draft.flatMap((order) =>
    order.lines.map((line) => ({ orderId: order.id, ...line })),
  );

  const statusEvents = orders.map((order) => ({
    orderId: order.id,
    fromStatus: null,
    toStatus: order.status,
    source: "SEED" as const,
    createdAt: order.updatedAt,
  }));

  return { categories, products, customers, orders, orderItems, statusEvents };
}
