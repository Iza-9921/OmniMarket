import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { json, serviceError } from "@/server/http";
import { listCustomers } from "@/server/services/orders";
import { listCategories } from "@/server/services/products";

// GET /api/catalog — datos de referencia para los formularios: categorías y clientes.
export async function GET() {
  const session = await apiUser();
  if (session.error) return session.error;

  try {
    const db = getDb();
    const [categories, customers] = await Promise.all([
      listCategories(db),
      listCustomers(db),
    ]);
    return json({ categories, customers });
  } catch (error) {
    return serviceError("GET /api/catalog", error);
  }
}
