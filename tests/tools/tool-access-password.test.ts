import { describe, expect, it } from "vitest";
import {
  hasToolAccessPassword,
  shouldUpdateVaultPassword,
} from "@/lib/tools/tool-access-password";

describe("hasToolAccessPassword", () => {
  it("exige un mot de passe non vide à la création", () => {
    expect(hasToolAccessPassword("secret")).toBe(true);
    expect(hasToolAccessPassword("")).toBe(false);
  });
});

describe("shouldUpdateVaultPassword", () => {
  it("ignore vide et espaces à l'édition", () => {
    expect(shouldUpdateVaultPassword(undefined)).toBe(false);
    expect(shouldUpdateVaultPassword("")).toBe(false);
    expect(shouldUpdateVaultPassword("   ")).toBe(false);
    expect(shouldUpdateVaultPassword("nouveau")).toBe(true);
  });
});
