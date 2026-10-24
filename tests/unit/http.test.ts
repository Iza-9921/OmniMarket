import { describe, expect, it } from "vitest";
import { isValidToken } from "@/server/http";

describe("isValidToken", () => {
  it("acepta solo el token exacto", () => {
    expect(isValidToken("secreto-123", "secreto-123")).toBe(true);
    expect(isValidToken("secreto-124", "secreto-123")).toBe(false);
    expect(isValidToken("secreto-1234", "secreto-123")).toBe(false);
  });

  it("rechaza la ausencia de token o un token vacío", () => {
    expect(isValidToken(null, "secreto-123")).toBe(false);
    expect(isValidToken("", "secreto-123")).toBe(false);
  });
});
