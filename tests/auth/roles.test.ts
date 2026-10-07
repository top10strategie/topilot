import { describe, expect, it } from "vitest";
import {
  canManageCollaboratorsAndTeams,
  isCollaboratorRole,
  isManagerOrDirection,
} from "@/lib/auth/roles";

describe("isManagerOrDirection", () => {
  it("accepte manager et direction", () => {
    expect(isManagerOrDirection("manager")).toBe(true);
    expect(isManagerOrDirection("direction")).toBe(true);
  });

  it("refuse collaborator et les valeurs inconnues", () => {
    expect(isManagerOrDirection("collaborator")).toBe(false);
    expect(isManagerOrDirection("admin")).toBe(false);
    expect(isManagerOrDirection("")).toBe(false);
  });
});

describe("canManageCollaboratorsAndTeams", () => {
  it("est aligné sur Manager/Direction", () => {
    expect(canManageCollaboratorsAndTeams("manager")).toBe(true);
    expect(canManageCollaboratorsAndTeams("direction")).toBe(true);
    expect(canManageCollaboratorsAndTeams("collaborator")).toBe(false);
  });
});

describe("isCollaboratorRole", () => {
  it("valide les trois rôles V1", () => {
    expect(isCollaboratorRole("direction")).toBe(true);
    expect(isCollaboratorRole("manager")).toBe(true);
    expect(isCollaboratorRole("collaborator")).toBe(true);
  });

  it("refuse une valeur hors enum", () => {
    expect(isCollaboratorRole("admin")).toBe(false);
  });
});
