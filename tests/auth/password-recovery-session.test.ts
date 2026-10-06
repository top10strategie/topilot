import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isPasswordRecoveryOrInviteSession } from "@/lib/auth/password-recovery-session";

function jwtWithAmr(amr: unknown): string {
  const payload = Buffer.from(JSON.stringify({ amr }), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${payload}.sig`;
}

function session(opts: {
  accessToken: string;
  userAmr?: unknown;
}): Session {
  return {
    access_token: opts.accessToken,
    user: opts.userAmr === undefined ? {} : { amr: opts.userAmr },
  } as Session;
}

describe("isPasswordRecoveryOrInviteSession", () => {
  it("retourne false sans session", () => {
    expect(isPasswordRecoveryOrInviteSession(null)).toBe(false);
  });

  it("détecte recovery / invite sur le JWT", () => {
    expect(
      isPasswordRecoveryOrInviteSession(
        session({ accessToken: jwtWithAmr(["recovery"]) }),
      ),
    ).toBe(true);
    expect(
      isPasswordRecoveryOrInviteSession(
        session({ accessToken: jwtWithAmr([{ method: "invite" }]) }),
      ),
    ).toBe(true);
  });

  it("détecte recovery sur user.amr", () => {
    expect(
      isPasswordRecoveryOrInviteSession(
        session({
          accessToken: "not.a.jwt",
          userAmr: [{ method: "recovery" }],
        }),
      ),
    ).toBe(true);
  });

  it("ignore un login mot de passe", () => {
    expect(
      isPasswordRecoveryOrInviteSession(
        session({
          accessToken: jwtWithAmr(["password"]),
          userAmr: ["password"],
        }),
      ),
    ).toBe(false);
  });
});
