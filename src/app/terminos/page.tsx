import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Condiciones del servicio" };

export default function TermsPage() {
  return (
    <LegalPage title="Condiciones del servicio" updated="24 de octubre de 2026">
      <p>
        OmniMarket Operations Hub es un proyecto académico desarrollado para un
        concurso de software. Se ofrece con fines de demostración y evaluación,
        sin garantías de disponibilidad.
      </p>
      <section className="space-y-3">
        <h2>Uso permitido</h2>
        <ul>
          <li>
            Explorar las funciones del panel con cualquier cuenta de Google o
            GitHub.
          </li>
          <li>
            Los datos de negocio son ficticios y pueden restablecerse en
            cualquier momento a un conjunto de prueba conocido.
          </li>
          <li>
            No está permitido intentar acceder a datos de otros usuarios ni
            interferir con el funcionamiento del servicio.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2>Contacto</h2>
        <p>
          Para cualquier duda, abre un issue en{" "}
          <a
            className="text-indigo-600 underline"
            href="https://github.com/Iza-9921/OmniMarket/issues"
          >
            github.com/Iza-9921/OmniMarket
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
