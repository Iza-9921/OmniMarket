import { describe, expect, it } from "vitest";
import {
  decideAccess,
  isPublicPath,
  safeCallbackUrl,
} from "@/lib/auth-routing";

describe("decideAccess", () => {
  it("redirige a /login las páginas privadas sin sesión, recordando el destino", () => {
    expect(decideAccess("/dashboard", false)).toEqual({
      type: "redirect",
      to: "/login?callbackUrl=%2Fdashboard",
    });
    expect(decideAccess("/orders", false, "?status=PENDING")).toEqual({
      type: "redirect",
      to: "/login?callbackUrl=%2Forders%3Fstatus%3DPENDING",
    });
  });

  it("responde 401 (sin redirigir) a las APIs privadas sin sesión", () => {
    expect(decideAccess("/api/products", false)).toEqual({
      type: "unauthorized",
    });
  });

  it("deja pasar las rutas privadas con sesión", () => {
    expect(decideAccess("/dashboard", true)).toEqual({ type: "allow" });
    expect(decideAccess("/api/products", true)).toEqual({ type: "allow" });
  });

  it("muestra /login sin sesión y lo salta con sesión", () => {
    expect(decideAccess("/login", false)).toEqual({ type: "allow" });
    expect(decideAccess("/login", true)).toEqual({
      type: "redirect",
      to: "/dashboard",
    });
  });

  it("nunca bloquea el flujo OAuth ni los endpoints de auditoría", () => {
    for (const path of [
      "/api/auth/callback/github",
      "/api/test/analytics",
      "/api/test/reset-data",
      "/api/health",
    ]) {
      expect(decideAccess(path, false)).toEqual({ type: "allow" });
    }
  });
});

describe("isPublicPath", () => {
  it("no confunde rutas que solo comparten el prefijo", () => {
    expect(isPublicPath("/api/test")).toBe(true);
    expect(isPublicPath("/api/testing")).toBe(false);
    expect(isPublicPath("/api/healthz")).toBe(false);
  });
});

describe("safeCallbackUrl", () => {
  it("acepta rutas internas", () => {
    expect(safeCallbackUrl("/orders?status=PENDING")).toBe(
      "/orders?status=PENDING",
    );
  });

  it.each([
    [undefined],
    [""],
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["/login?callbackUrl=/x"],
  ])("rechaza %s y usa /dashboard", (value) => {
    expect(safeCallbackUrl(value)).toBe("/dashboard");
  });
});
