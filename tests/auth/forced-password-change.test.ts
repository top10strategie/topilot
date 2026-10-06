import { describe, expect, it } from "vitest";
import { canCompleteForcedPasswordChange } from "@/lib/auth/forced-password-change";

describe("canCompleteForcedPasswordChange", () => {
  it("autorise must_change_password ou une session recovery/invite", () => {
    expect(
      canCompleteForcedPasswordChange({
        mustChange: true,
        recoveryOrInvite: false,
      }),
    ).toBe(true);
    expect(
      canCompleteForcedPasswordChange({
        mustChange: false,
        recoveryOrInvite: true,
      }),
    ).toBe(true);
  });

  it("refuse une session login normale", () => {
    expect(
      canCompleteForcedPasswordChange({
        mustChange: false,
        recoveryOrInvite: false,
      }),
    ).toBe(false);
  });
});
