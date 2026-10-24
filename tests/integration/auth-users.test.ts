import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema";
import { resetDatabase } from "@/server/services/reset";

const adapter = () =>
  DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts });

beforeEach(async () => {
  await getDb().delete(users);
});

afterAll(async () => {
  await closeDb();
});

describe("alta de usuarios con Auth.js", () => {
  it("todo usuario nuevo recibe el rol OPERATOR (nadie es ADMIN por defecto)", async () => {
    const created = await adapter().createUser!({
      id: crypto.randomUUID(),
      name: "Ana García",
      email: "ana@ejemplo.mx",
      emailVerified: null,
      image: null,
    });

    const [row] = await getDb()
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, created.id));
    expect(row.role).toBe("OPERATOR");
    expect((created as { role?: string }).role).toBe("OPERATOR");
  });

  it("vincula la cuenta OAuth y la encuentra por proveedor", async () => {
    const user = await adapter().createUser!({
      id: crypto.randomUUID(),
      name: "Luis",
      email: "luis@ejemplo.mx",
      emailVerified: null,
    });
    await adapter().linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId: "12345",
    });

    const found = await adapter().getUserByAccount!({
      provider: "github",
      providerAccountId: "12345",
    });
    expect(found?.id).toBe(user.id);
  });

  it("el reset de datos de prueba no borra usuarios ni cuentas", async () => {
    const user = await adapter().createUser!({
      id: crypto.randomUUID(),
      name: "Sofía",
      email: "sofia@ejemplo.mx",
      emailVerified: null,
    });

    await resetDatabase(getDb());

    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(rows).toHaveLength(1);
  });
});
