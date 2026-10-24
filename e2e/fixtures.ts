import { test as base, expect } from "@playwright/test";

type Fixtures = {
  /** Errores de consola que una prueba provoca a propósito (p. ej. un 500 simulado). */
  allowedConsoleErrors: RegExp[];
  consoleErrors: string[];
};

// Toda prueba E2E falla si el navegador registra un error en consola o una
// excepción no capturada (requisito "sin errores de consola", §1), salvo los
// que la propia prueba declare como esperados con `test.use`.
export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      const record = (text: string) => {
        if (!allowedConsoleErrors.some((pattern) => pattern.test(text))) {
          errors.push(text);
        }
      };
      page.on("console", (message) => {
        if (message.type() === "error") record(message.text());
      });
      page.on("pageerror", (error) => record(error.message));

      await use(errors);

      expect(errors, "errores en la consola del navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
