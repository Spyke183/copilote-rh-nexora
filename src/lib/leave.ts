export type Employee = {
  name: string;
  hireDate: string;
  /** Congés payés acquis sur la période en cours */
  acquiredDays: number;
  /** Congés payés déjà posés */
  takenDays: number;
  rttTotal: number;
  rttTaken: number;
};

/**
 * Employé de démonstration. En production, ces données proviendraient du
 * SIRH de l'entreprise (identité de la personne connectée).
 */
export const DEMO_EMPLOYEE: Employee = {
  name: "Camille Martin",
  hireDate: "2021-09-01",
  acquiredDays: 25,
  takenDays: 12,
  rttTotal: 10,
  rttTaken: 4,
};

export type LeaveBalance = {
  cpRestants: number;
  cpAcquis: number;
  cpPris: number;
  rttRestants: number;
  rttTotal: number;
};

export function leaveBalance(emp: Employee = DEMO_EMPLOYEE): LeaveBalance {
  return {
    cpRestants: emp.acquiredDays - emp.takenDays,
    cpAcquis: emp.acquiredDays,
    cpPris: emp.takenDays,
    rttRestants: emp.rttTotal - emp.rttTaken,
    rttTotal: emp.rttTotal,
  };
}

export function draftLeaveRequest(opts: {
  start?: string;
  end?: string;
  type?: string;
  emp?: Employee;
} = {}): string {
  const emp = opts.emp ?? DEMO_EMPLOYEE;
  const type = opts.type ?? "congés payés";
  const start = opts.start ?? "[date de début]";
  const end = opts.end ?? "[date de fin]";
  const balance = leaveBalance(emp);

  return [
    `Objet : Demande de ${type}`,
    ``,
    `Bonjour,`,
    ``,
    `Je souhaite poser des ${type} du ${start} au ${end}.`,
    `À ce jour, mon solde disponible est de ${balance.cpRestants} jours de congés payés.`,
    ``,
    `Je reste à votre disposition pour toute information complémentaire.`,
    ``,
    `Cordialement,`,
    emp.name,
  ].join("\n");
}

/** Détecte si la question concerne le solde de congés ou une demande à rédiger. */
export function detectLeaveIntent(query: string): "balance" | "draft" | null {
  const q = query.toLowerCase();
  // Les outils "congés" ne s'activent que si la question parle bien de congés ou de RTT.
  if (!/(cong[eé]|\brtt\b)/.test(q)) return null;
  if (/(brouillon|r[eé]dige|mod[eè]le|[eé]cris|pr[eé]pare|g[eé]n[eé]re|\bposer\b|\bpose\b)/.test(q)) {
    return "draft";
  }
  if (/(solde|combien|reste|restant|dispo)/.test(q)) return "balance";
  return null;
}
