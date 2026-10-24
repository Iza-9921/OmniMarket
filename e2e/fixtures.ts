import { test as base, expect } from "@playwright/test";

// Toda prueba E2E falla si el navegador registra un error en consola o una
// excepción no capturada (requisito "sin errores de consola", §1).
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));

      await use(errors);

      expect(errors, "errores en la consola del navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
