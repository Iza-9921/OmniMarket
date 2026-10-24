import { z } from "zod";

// Mensajes de validación en español para toda la aplicación.
// Los esquemas deben importar `z` desde este módulo, no desde "zod".
z.config(z.locales.es());

export { z };
