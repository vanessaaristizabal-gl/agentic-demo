import {
  advance,
  agentForStage,
  createDemand,
  type Demand,
  type DemandIntake,
  type Interview,
  type OnboardingFile,
  type TeamAssignment,
  type TechProfile,
  type Vacancy,
} from '@/domain';
import type { BlockingReport } from '@/domain';
import type { Container } from '../ports';

/** Secciones editables de una demanda, una por etapa. */
export interface DemandPatch {
  intake?: Partial<DemandIntake>;
  profile?: Partial<TechProfile>;
  assignment?: Partial<TeamAssignment>;
  vacancy?: Partial<Vacancy>;
  interview?: Partial<Interview>;
  onboarding?: Partial<OnboardingFile>;
}

export async function createNewDemand(
  container: Container,
  intake: Partial<DemandIntake>,
): Promise<Demand> {
  const now = container.system.now();
  const demand = createDemand({
    id: container.system.id('dem'),
    code: await container.demands.nextCode(),
    now,
    intake,
  });

  await container.demands.save(demand);
  await container.events.append([
    {
      id: container.system.id('evt'),
      at: now,
      demandId: demand.id,
      demandCode: demand.code,
      kind: 'demanda-creada',
      fromAgent: null,
      toAgent: 'sales',
      fromStage: null,
      toStage: 'demanda',
      summary: `Sales registra ${demand.code} para ${demand.intake.clientName || 'un cliente sin nombre'}.`,
      checks: [],
    },
  ]);

  return demand;
}

export async function updateDemand(
  container: Container,
  demandId: string,
  patch: DemandPatch,
): Promise<Demand> {
  const demand = await container.demands.get(demandId);
  if (!demand) throw new Error(`No existe la demanda ${demandId}.`);

  const updated: Demand = {
    ...demand,
    intake: { ...demand.intake, ...patch.intake },
    profile: { ...demand.profile, ...patch.profile },
    assignment: { ...demand.assignment, ...patch.assignment },
    vacancy: { ...demand.vacancy, ...patch.vacancy },
    interview: { ...demand.interview, ...patch.interview },
    onboarding: { ...demand.onboarding, ...patch.onboarding },
    updatedAt: container.system.now(),
  };

  // Cambiar de práctica invalida el stack: sus opciones dependen de ella.
  if (patch.intake?.practice && patch.intake.practice !== demand.intake.practice) {
    updated.intake.stack = '';
  }

  await container.demands.save(updated);
  return updated;
}

export type AdvanceOutcome =
  | { ok: true; message: string; demand: Demand }
  | { ok: false; report: BlockingReport };

/**
 * Avanza una demanda a la etapa siguiente.
 *
 * Nunca ocurre sola: siempre nace de una acción del usuario. Si falta algo,
 * no se cambia nada y se devuelve el informe con todo lo que falta.
 */
export async function advanceDemand(
  container: Container,
  demandId: string,
): Promise<AdvanceOutcome> {
  const [demand, teams, positions] = await Promise.all([
    container.demands.get(demandId),
    container.teams.list(),
    container.positions.list(),
  ]);
  if (!demand) throw new Error(`No existe la demanda ${demandId}.`);

  const result = advance({ demand, teams, positions }, container.system);

  if (!result.ok) {
    await container.events.append([result.event]);
    return { ok: false, report: result.report };
  }

  const { transaction } = result;
  await container.demands.save(transaction.demand);
  await container.positions.saveMany(transaction.positions);
  if (transaction.consultant) {
    await container.consultants.save(transaction.consultant);
  }
  await container.events.append(transaction.events);

  return { ok: true, message: transaction.message, demand: transaction.demand };
}

/**
 * Asigna la demanda a un equipo y abre la posición correspondiente.
 *
 * La dedicación NO se fija aquí: queda en null a propósito, porque se
 * configura desde la vista Equipos.
 */
export async function assignDemandToTeam(
  container: Container,
  demandId: string,
  teamId: string,
): Promise<void> {
  const [demand, positions] = await Promise.all([
    container.demands.get(demandId),
    container.positions.list(),
  ]);
  if (!demand) throw new Error(`No existe la demanda ${demandId}.`);

  const existing = positions.find((position) => position.demandId === demandId);
  const now = container.system.now();

  if (!teamId) {
    if (existing) await container.positions.remove(existing.id);
    await container.demands.save({
      ...demand,
      assignment: { ...demand.assignment, teamId: '' },
      updatedAt: now,
    });
    return;
  }

  if (existing) {
    await container.positions.save({ ...existing, teamId });
  } else {
    await container.positions.save({
      id: container.system.id('pos'),
      teamId,
      demandId,
      consultantId: null,
      role: demand.profile.consultantRole || 'desarrollador',
      seniority: demand.profile.seniority || 'semi-senior',
      allocationPct: null,
      status: 'abierta',
      openedAt: now,
      coveredAt: null,
    });
  }

  await container.demands.save({
    ...demand,
    assignment: { ...demand.assignment, teamId },
    updatedAt: now,
  });
}

/** Genera la descripción del puesto. Es el único paso no determinista. */
export async function draftVacancyDescription(
  container: Container,
  demandId: string,
): Promise<{ description: string; source: string; reason: string | null; model: string | null }> {
  const [demand, teams] = await Promise.all([
    container.demands.get(demandId),
    container.teams.list(),
  ]);
  if (!demand) throw new Error(`No existe la demanda ${demandId}.`);

  const team = teams.find((candidate) => candidate.id === demand.assignment.teamId);

  const outcome = await container.drafts.draft({
    clientName: demand.intake.clientName,
    practice: demand.intake.practice,
    stack: demand.intake.stack,
    seniority: demand.profile.seniority,
    consultantRole: demand.profile.consultantRole,
    englishLevel: demand.profile.englishLevel,
    skills: demand.profile.skills,
    teamName: team?.name ?? '',
    vacancyTitle: demand.vacancy.title,
    context: demand.intake.description,
  });

  const now = container.system.now();
  await container.demands.save({
    ...demand,
    vacancy: {
      ...demand.vacancy,
      jobDescription: outcome.description,
      draftSource: outcome.source,
      draftedAt: now,
    },
    updatedAt: now,
  });

  await container.events.append([
    {
      id: container.system.id('evt'),
      at: now,
      demandId: demand.id,
      demandCode: demand.code,
      kind: 'borrador-ia',
      fromAgent: agentForStage('vacante').id,
      toAgent: agentForStage('vacante').id,
      fromStage: 'vacante',
      toStage: 'vacante',
      summary:
        outcome.source === 'anthropic'
          ? `Recruiter genera la descripción de ${demand.code} con ${outcome.model}.`
          : outcome.source === 'gemini-nano'
            ? `Recruiter genera la descripción de ${demand.code} con el modelo local del navegador.`
            : `Recruiter compone la descripción de ${demand.code} con el texto de reserva.`,
      checks: outcome.reason ? [outcome.reason] : [],
    },
  ]);

  return outcome;
}
