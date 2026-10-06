import { describe, expect, it } from "vitest";
import { resolveAuthGatePath } from "@/lib/auth/auth-gate-path";
import {
  ACCESS_DENIED_PATH,
  FORCE_PASSWORD_CHANGE_PATH,
} from "@/lib/auth/constants";
import type { AuthGateState } from "@/lib/auth/types";

const actif: AuthGateState = {
  collaborator_id: "c1",
  status: "actif",
  must_change_password: false,
};

const mustChange: AuthGateState = {
  ...actif,
  must_change_password: true,
};

describe("resolveAuthGatePath", () => {
  it("envoie un collaborateur inactif vers access-denied", () => {
    expect(
      resolveAuthGatePath("/missions", {
        collaborator_id: "c1",
        status: "inactif",
        must_change_password: false,
      }),
    ).toEqual({ action: "redirect", pathname: ACCESS_DENIED_PATH });
    expect(resolveAuthGatePath("/missions", undefined)).toEqual({
      action: "redirect",
      pathname: ACCESS_DENIED_PATH,
    });
    expect(resolveAuthGatePath(ACCESS_DENIED_PATH, undefined)).toEqual({
      action: "stay",
    });
  });

  it("bloque les pages métier tant que must_change_password", () => {
    expect(resolveAuthGatePath("/missions", mustChange)).toEqual({
      action: "redirect",
      pathname: FORCE_PASSWORD_CHANGE_PATH,
    });
    expect(resolveAuthGatePath(FORCE_PASSWORD_CHANGE_PATH, mustChange)).toEqual({
      action: "stay",
    });
  });

  it("quitte /auth/update-password une fois le mot de passe à jour", () => {
    expect(resolveAuthGatePath(FORCE_PASSWORD_CHANGE_PATH, actif)).toEqual({
      action: "redirect",
      pathname: "/",
    });
    expect(resolveAuthGatePath("/missions", actif)).toEqual({ action: "stay" });
    expect(resolveAuthGatePath("/auth/login", actif)).toEqual({
      action: "redirect",
      pathname: "/",
    });
  });
});
