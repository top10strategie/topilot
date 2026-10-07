import { afterEach, describe, expect, it } from "vitest";
import { verifyBearerCronSecret } from "@/lib/auth/cron-secret";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

function requestWithAuth(header: string | null): Request {
  const headers = new Headers();
  if (header !== null) {
    headers.set("authorization", header);
  }
  return new Request("https://example.test/api/cron/mission-recurrence", {
    headers,
  });
}

describe("verifyBearerCronSecret", () => {
  it("accepte le Bearer exact", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    expect(
      verifyBearerCronSecret(requestWithAuth("Bearer cron-secret-value")),
    ).toBe(true);
  });

  it("refuse un token incorrect, absent, ou sans secret env", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    expect(verifyBearerCronSecret(requestWithAuth("Bearer other"))).toBe(false);
    expect(verifyBearerCronSecret(requestWithAuth(null))).toBe(false);
    expect(verifyBearerCronSecret(requestWithAuth("cron-secret-value"))).toBe(
      false,
    );

    delete process.env.CRON_SECRET;
    expect(
      verifyBearerCronSecret(requestWithAuth("Bearer cron-secret-value")),
    ).toBe(false);
  });
});
