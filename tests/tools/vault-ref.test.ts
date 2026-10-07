import { describe, expect, it } from "vitest";
import {
  TOOL_ACCESS_NAME_PREFIX,
  buildToolAccessSecretName,
  isLegacyVaultUuidRef,
  isNameBasedVaultRef,
  parseReadSecretValue,
  slugifyAccessLabel,
} from "@/lib/tools/vault-ref";

describe("slugifyAccessLabel", () => {
  it("normalise accents, casse et caractères spéciaux", () => {
    expect(slugifyAccessLabel("  Accès Prod! ")).toBe("acces_prod");
    expect(slugifyAccessLabel("***")).toBe("access");
  });
});

describe("buildToolAccessSecretName", () => {
  it("compose le préfixe, l'outil, le slug et l'uniq injectable", () => {
    const toolId = "11111111-1111-1111-1111-111111111111";
    expect(buildToolAccessSecretName(toolId, "Back-office", "abc123def456")).toBe(
      `${TOOL_ACCESS_NAME_PREFIX}${toolId}_back_office_abc123def456`,
    );
  });
});

describe("références Vault", () => {
  it("distingue UUID legacy et nom tool_access_", () => {
    expect(
      isLegacyVaultUuidRef("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
    ).toBe(true);
    expect(isLegacyVaultUuidRef("tool_access_x")).toBe(false);
    expect(isNameBasedVaultRef("tool_access_foo")).toBe(true);
    expect(isNameBasedVaultRef("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")).toBe(
      false,
    );
  });
});

describe("parseReadSecretValue", () => {
  it("lit une chaîne brute ou l'enveloppe RPC", () => {
    expect(parseReadSecretValue("secret")).toBe("secret");
    expect(parseReadSecretValue({ read_secret: "secret" })).toBe("secret");
    expect(parseReadSecretValue({ read_secret: 1 })).toBeNull();
    expect(parseReadSecretValue(null)).toBeNull();
  });
});
