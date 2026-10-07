import { describe, expect, it } from "vitest";
import {
  NEW_PASSWORD_TOO_SHORT,
  validateNewPassword,
  validateVoluntaryPasswordChange,
} from "@/lib/auth/password-policy";

describe("validateNewPassword", () => {
  it("exige au moins 8 caractères après trim", () => {
    expect(validateNewPassword("1234567")).toBe(NEW_PASSWORD_TOO_SHORT);
    expect(validateNewPassword("        ")).toBe(NEW_PASSWORD_TOO_SHORT);
    expect(validateNewPassword("12345678")).toBeNull();
    expect(validateNewPassword("  12345678  ")).toBeNull();
  });
});

describe("validateVoluntaryPasswordChange", () => {
  it("exige le mot de passe actuel", () => {
    expect(
      validateVoluntaryPasswordChange({
        currentPassword: "  ",
        password: "abcdefgh",
        confirm: "abcdefgh",
      }),
    ).toEqual({
      ok: false,
      error: "Le mot de passe actuel est obligatoire.",
      fieldErrors: { currentPassword: "Obligatoire." },
    });
  });

  it("refuse un nouveau mot de passe trop court", () => {
    expect(
      validateVoluntaryPasswordChange({
        currentPassword: "oldpass1",
        password: "short",
        confirm: "short",
      }),
    ).toEqual({
      ok: false,
      error: NEW_PASSWORD_TOO_SHORT,
      fieldErrors: { password: "Minimum 8 caractères." },
    });
  });

  it("exige que la confirmation corresponde", () => {
    expect(
      validateVoluntaryPasswordChange({
        currentPassword: "oldpass1",
        password: "newpass12",
        confirm: "newpass13",
      }),
    ).toEqual({
      ok: false,
      error: "Les mots de passe ne correspondent pas.",
      fieldErrors: { confirm: "Ne correspond pas." },
    });
  });

  it("retourne les valeurs trimées si tout est valide", () => {
    expect(
      validateVoluntaryPasswordChange({
        currentPassword: " oldpass1 ",
        password: " newpass12 ",
        confirm: " newpass12 ",
      }),
    ).toEqual({
      ok: true,
      currentPassword: "oldpass1",
      password: "newpass12",
    });
  });
});
