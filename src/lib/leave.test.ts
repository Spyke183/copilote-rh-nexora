import { describe, it, expect } from "vitest";
import {
  leaveBalance,
  draftLeaveRequest,
  detectLeaveIntent,
  DEMO_EMPLOYEE,
} from "./leave";

describe("leaveBalance", () => {
  it("calcule le solde de l'employé par défaut", () => {
    const balance = leaveBalance();
    expect(balance.cpRestants).toBe(DEMO_EMPLOYEE.acquiredDays - DEMO_EMPLOYEE.takenDays);
    expect(balance.rttRestants).toBe(DEMO_EMPLOYEE.rttTotal - DEMO_EMPLOYEE.rttTaken);
  });

  it("accepte un employé personnalisé", () => {
    const balance = leaveBalance({
      name: "Test",
      hireDate: "2020-01-01",
      acquiredDays: 30,
      takenDays: 5,
      rttTotal: 12,
      rttTaken: 0,
    });
    expect(balance.cpRestants).toBe(25);
    expect(balance.rttRestants).toBe(12);
  });
});

describe("detectLeaveIntent", () => {
  it("détecte une demande de solde", () => {
    expect(detectLeaveIntent("Combien de jours de congés me reste-t-il ?")).toBe("balance");
  });

  it("détecte une demande à rédiger", () => {
    expect(detectLeaveIntent("Rédige-moi une demande de congés")).toBe("draft");
  });

  it("retourne null hors du sujet congés", () => {
    expect(detectLeaveIntent("Quelles sont les règles du télétravail ?")).toBeNull();
  });

  it("ne se déclenche pas sur 'combien de jours de télétravail'", () => {
    expect(detectLeaveIntent("Combien de jours de télétravail par semaine ?")).toBeNull();
  });

  it("détecte le solde de RTT", () => {
    expect(detectLeaveIntent("Combien de RTT me reste-t-il ?")).toBe("balance");
  });
});

describe("draftLeaveRequest", () => {
  it("contient l'objet, le solde et la signature", () => {
    const draft = draftLeaveRequest();
    expect(draft).toContain("Objet : Demande de congés payés");
    expect(draft).toContain(String(leaveBalance().cpRestants));
    expect(draft).toContain(DEMO_EMPLOYEE.name);
  });
});
