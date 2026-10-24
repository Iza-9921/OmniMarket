import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Una sola instancia por proceso: en desarrollo sobrevive a la recarga en caliente
// y en Vercel se reutiliza entre invocaciones de la misma instancia.
const globalForDb = globalThis as unknown as { db?: Database; pool?: Pool };

export function getDb(): Database {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }

  const pool = new Pool({ connectionString, max: 5 });
  // Permite a Vercel cerrar las conexiones inactivas antes de suspender la instancia.
  attachDatabasePool(pool);

  globalForDb.pool = pool;
  globalForDb.db = drizzle(pool, { schema });
  return globalForDb.db;
}

export async function closeDb() {
  await globalForDb.pool?.end();
  globalForDb.pool = undefined;
  globalForDb.db = undefined;
}
