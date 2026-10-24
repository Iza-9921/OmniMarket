import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="24 de octubre de 2026">
      <p>
        OmniMarket Operations Hub es un proyecto académico de demostración de un
        panel de administración de comercio electrónico. Los productos, clientes
        y pedidos que muestra son datos ficticios generados automáticamente.
      </p>
      <section className="space-y-3">
        <h2>Datos que recopilamos</h2>
        <p>
          Al iniciar sesión con Google o GitHub recibimos únicamente tu nombre,
          tu correo electrónico y tu foto de perfil, junto con el identificador
          de tu cuenta en ese proveedor. No recibimos ni guardamos contraseñas.
        </p>
      </section>
      <section className="space-y-3">
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Identificarte y mantener tu sesión abierta durante 8 horas.</li>
          <li>Mostrar tu nombre y tu foto en la aplicación.</li>
          <li>Registrar qué usuario realizó cada cambio en los pedidos.</li>
        </ul>
        <p>
          No vendemos ni compartimos tus datos con terceros y no los usamos con
          fines publicitarios.
        </p>
      </section>
      <section className="space-y-3">
        <h2>Dónde se guardan</h2>
        <p>
          En una base de datos PostgreSQL alojada en Neon (Estados Unidos). La
          aplicación se sirve desde Vercel con conexión cifrada (HTTPS).
        </p>
      </section>
      <section className="space-y-3">
        <h2>Tus derechos</h2>
        <p>
          Puedes pedir la eliminación de tu cuenta y de tus datos abriendo un
          issue en{" "}
          <a
            className="text-indigo-600 underline"
            href="https://github.com/Iza-9921/OmniMarket/issues"
          >
            github.com/Iza-9921/OmniMarket
          </a>
          . También puedes revocar el acceso desde la configuración de seguridad
          de tu cuenta de Google o GitHub.
        </p>
      </section>
    </LegalPage>
  );
}
