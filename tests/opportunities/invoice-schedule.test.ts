import { describe, expect, it } from "vitest";
import {
  parseInvoiceScheduleFormData,
  validateEchellonneSchedule,
} from "@/lib/opportunities/invoice-schedule";

function scheduleForm(json: string | null): FormData {
  const form = new FormData();
  if (json !== null) {
    form.set("invoice_schedule", json);
  }
  return form;
}

describe("parseInvoiceScheduleFormData", () => {
  it("accepte un tableau valide et un champ vide", () => {
    expect(parseInvoiceScheduleFormData(scheduleForm(null))).toEqual({
      ok: true,
      rows: [],
    });
    expect(
      parseInvoiceScheduleFormData(
        scheduleForm(
          JSON.stringify([
            { invoice_at: "2026-01-15", amount: 100 },
            { invoice_at: "2026-02-15", amount: "50,5" },
          ]),
        ),
      ),
    ).toEqual({
      ok: true,
      rows: [
        { invoice_at: "2026-01-15", amount: 100 },
        { invoice_at: "2026-02-15", amount: 50.5 },
      ],
    });
  });

  it("refuse JSON, dates ou montants invalides", () => {
    expect(parseInvoiceScheduleFormData(scheduleForm("{"))).toEqual({
      ok: false,
      error: "Échéancier invalide.",
    });
    expect(
      parseInvoiceScheduleFormData(
        scheduleForm(JSON.stringify([{ invoice_at: "", amount: 10 }])),
      ),
    ).toEqual({
      ok: false,
      error: "Chaque échelon doit avoir une date.",
    });
    expect(
      parseInvoiceScheduleFormData(
        scheduleForm(JSON.stringify([{ invoice_at: "2026-01-01", amount: 0 }])),
      ),
    ).toEqual({
      ok: false,
      error: "Chaque échelon doit avoir un montant strictement positif.",
    });
  });
});

describe("validateEchellonneSchedule", () => {
  const twoRows = [
    { invoice_at: "2026-01-10", amount: 50 },
    { invoice_at: "2026-02-10", amount: 50 },
  ];

  it("valide un échéancier de 2 lignes dont la somme égale le prix", () => {
    expect(validateEchellonneSchedule(twoRows, 100)).toBeNull();
  });

  it("refuse moins de 2 ou plus de 12 échéances", () => {
    expect(validateEchellonneSchedule([twoRows[0]!], 50)).toBe(
      "Une facturation échelonnée requiert au moins 2 échéances.",
    );
    const tooMany = Array.from({ length: 13 }, (_, i) => ({
      invoice_at: `2025-${String((i % 12) + 1).padStart(2, "0")}-01`,
      amount: 1,
    }));
    tooMany[12] = { invoice_at: "2026-01-01", amount: 1 };
    expect(validateEchellonneSchedule(tooMany, 13)).toBe(
      "Une facturation échelonnée autorise au maximum 12 échéances.",
    );
  });

  it("refuse deux dates le même mois calendaire", () => {
    expect(
      validateEchellonneSchedule(
        [
          { invoice_at: "2026-01-05", amount: 40 },
          { invoice_at: "2026-01-20", amount: 60 },
        ],
        100,
      ),
    ).toBe("Une seule échéance est autorisée par mois calendaire.");
  });

  it("compare la somme au prix en centimes", () => {
    expect(
      validateEchellonneSchedule(
        [
          { invoice_at: "2026-01-01", amount: 10.1 },
          { invoice_at: "2026-02-01", amount: 10.2 },
        ],
        20.3,
      ),
    ).toBeNull();
    expect(validateEchellonneSchedule(twoRows, 99.99)).toBe(
      "La somme des échelons doit égaler exactement le montant de l'opportunité.",
    );
    expect(validateEchellonneSchedule(twoRows, null)).toBe(
      "Le montant est obligatoire pour une facturation échelonnée.",
    );
  });
});
