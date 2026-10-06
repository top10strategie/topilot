export const MIN_PASSWORD_LENGTH = 8;

export const NEW_PASSWORD_TOO_SHORT =
  "Le mot de passe doit contenir au moins 8 caractères.";

export function validateNewPassword(password: string): string | null {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return NEW_PASSWORD_TOO_SHORT;
  }
  return null;
}

export type VoluntaryPasswordChangeInput = {
  currentPassword: string;
  password: string;
  confirm: string;
};

export type VoluntaryPasswordChangeResult =
  | { ok: true; currentPassword: string; password: string }
  | {
      ok: false;
      error: string;
      fieldErrors: Partial<
        Record<"currentPassword" | "password" | "confirm", string>
      >;
    };

export function validateVoluntaryPasswordChange(
  input: VoluntaryPasswordChangeInput,
): VoluntaryPasswordChangeResult {
  const currentPassword = input.currentPassword.trim();
  const password = input.password.trim();
  const confirm = input.confirm.trim();

  if (!currentPassword) {
    return {
      ok: false,
      error: "Le mot de passe actuel est obligatoire.",
      fieldErrors: { currentPassword: "Obligatoire." },
    };
  }
  const lengthError = validateNewPassword(password);
  if (lengthError) {
    return {
      ok: false,
      error: lengthError,
      fieldErrors: { password: "Minimum 8 caractères." },
    };
  }
  if (password !== confirm) {
    return {
      ok: false,
      error: "Les mots de passe ne correspondent pas.",
      fieldErrors: { confirm: "Ne correspond pas." },
    };
  }
  return { ok: true, currentPassword, password };
}
