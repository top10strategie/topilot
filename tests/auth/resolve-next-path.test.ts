import { describe, expect, it } from "vitest";
import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth/constants";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";

const origin = new URL("https://app.topilot.test/auth/callback");

describe("resolveNextPath", () => {
  it("conserve un chemin relatif interne", () => {
    expect(resolveNextPath("/missions", origin)).toBe("/missions");
    expect(resolveNextPath("/clients?q=acme", origin)).toBe("/clients?q=acme");
  });

  it("refuse les open redirects (protocole-relative ou autre host)", () => {
    expect(resolveNextPath("//evil.test/phish", origin)).toBe(
      FORCE_PASSWORD_CHANGE_PATH,
    );
    expect(resolveNextPath("https://evil.test/phish", origin)).toBe(
      FORCE_PASSWORD_CHANGE_PATH,
    );
  });

  it("accepte une URL de même origine et retombe sur le fallback si next est vide", () => {
    expect(
      resolveNextPath("https://app.topilot.test/opportunities", origin),
    ).toBe("/opportunities");
    expect(resolveNextPath(null, origin)).toBe(FORCE_PASSWORD_CHANGE_PATH);
    expect(resolveNextPath("not a url", origin, "/missions")).toBe("/missions");
  });
});
