import { afterEach, describe, expect, it } from "vitest";
import {
  PURGE_REAUTH_TTL_SECONDS,
  createPurgeReauthCookieValue,
  verifyPurgeReauthCookieValue,
} from "@/lib/data-admin/purge-reauth";

const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COLLABORATOR_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

describe("purge reauth cookie", () => {
  it("accepte un cookie frais pour le bon collaborateur", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const now = 1_700_000_000_000;
    const value = createPurgeReauthCookieValue(COLLABORATOR_ID, now);
    expect(verifyPurgeReauthCookieValue(value, COLLABORATOR_ID, now)).toBe(true);
    expect(
      verifyPurgeReauthCookieValue(value, COLLABORATOR_ID, now + 60_000),
    ).toBe(true);
  });

  it("refuse un cookie expiré, un autre collaborateur, ou une signature altérée", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const now = 1_700_000_000_000;
    const value = createPurgeReauthCookieValue(COLLABORATOR_ID, now);
    expect(
      verifyPurgeReauthCookieValue(
        value,
        COLLABORATOR_ID,
        now + (PURGE_REAUTH_TTL_SECONDS + 1) * 1000,
      ),
    ).toBe(false);
    expect(verifyPurgeReauthCookieValue(value, "other-id", now)).toBe(false);
    expect(verifyPurgeReauthCookieValue(`${value}x`, COLLABORATOR_ID, now)).toBe(
      false,
    );
    expect(verifyPurgeReauthCookieValue(undefined, COLLABORATOR_ID, now)).toBe(
      false,
    );
  });
});
