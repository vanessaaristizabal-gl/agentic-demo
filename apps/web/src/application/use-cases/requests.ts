import {
  advance,
  agentForStage,
  createRequest,
  type StaffingRequest,
  type RequestIntake,
  type Interview,
  type OnboardingFile,
  type TeamAssignment,
  type TechProfile,
  type Vacancy,
} from '@/domain';
import type { BlockingReport } from '@/domain';
import type { Container } from '../ports';

/** Secciones editables de una solicitud, una por etapa. */
export interface RequestPatch {
  intake?: Partial<RequestIntake>;
  profile?: Partial<TechProfile>;
  assignment?: Partial<TeamAssignment>;
  vacancy?: Partial<Vacancy>;
  interview?: Partial<Interview>;
  onboarding?: Partial<OnboardingFile>;
}

export async function createNewRequest(
  container: Container,
  intake: Partial<RequestIntake>,
): Promise<StaffingRequest> {
  const now = container.system.now();
  const request = createRequest({
    id: container.system.id('sol'),
    code: await container.requests.nextCode(),
    now,
    intake,
  });

  await container.requests.save(request);
  await container.events.append([
    {
      id: container.system.id('evt'),
      at: now,
      requestId: request.id,
      requestCode: request.code,
      kind: 'solicitud-creada',
      fromAgent: null,
      toAgent: 'sales',
      fromStage: null,
      toStage: 'registro',
      summary: `Sales registra ${request.code} para ${request.intake.clientName || 'un cliente sin nombre'}.`,
      checks: [],
    },
  ]);

  return request;
}

export async function updateRequest(
  container: Container,
  requestId: string,
  patch: RequestPatch,
): Promise<StaffingRequest> {
  const request = await container.requests.get(requestId);
  if (!request) throw new Error(`No existe la solicitud ${requestId}.`);

  const updated: StaffingRequest = {
    ...request,
    intake: { ...request.intake, ...patch.intake },
    profile: { ...request.profile, ...patch.profile },
    assignment: { ...request.assignment, ...patch.assignment },
    vacancy: { ...request.vacancy, ...patch.vacancy },
    interview: { ...request.interview, ...patch.interview },
    onboarding: { ...request.onboarding, ...patch.onboarding },
    updatedAt: container.system.now(),
  };

  // Cambiar de práctica invalida el stack: sus opciones dependen de ella.
  if (patch.intake?.practice && patch.intake.practice !== request.intake.practice) {
    updated.intake.stack = '';
  }

  await container.requests.save(updated);
  return updated;
}

export type AdvanceOutcome =
  | { ok: true; message: string; request: StaffingRequest }
  | { ok: false; report: BlockingReport };

/**
 * Avanza una solicitud a la etapa siguiente.
 *
 * Nunca ocurre sola: siempre nace de una acción del usuario. Si falta algo,
 * no se cambia nada y se devuelve el informe con todo lo que falta.
 */
export async function advanceRequest(
  container: Container,
  requestId: string,
): Promise<AdvanceOutcome> {
  const [request, teams, positions] = await Promise.all([
    container.requests.get(requestId),
    container.teams.list(),
    container.positions.list(),
  ]);
  if (!request) throw new Error(`No existe la solicitud ${requestId}.`);

  const result = advance({ request, teams, positions }, container.system);

  if (!result.ok) {
    await container.events.append([result.event]);
    return { ok: false, report: result.report };
  }

  const { transaction } = result;
  await container.requests.save(transaction.request);
  await container.positions.saveMany(transaction.positions);
  if (transaction.consultant) {
    await container.consultants.save(transaction.consultant);
  }
  await container.events.append(transaction.events);

  return { ok: true, message: transaction.message, request: transaction.request };
}

/**
 * Asigna la solicitud a un equipo y abre la posición correspondiente.
 *
 * La dedicación NO se fija aquí: queda en null a propósito, porque se
 * configura desde la vista Equipos.
 */
export async function assignRequestToTeam(
  container: Container,
  requestId: string,
  teamId: string,
): Promise<void> {
  const [request, positions] = await Promise.all([
    container.requests.get(requestId),
    container.positions.list(),
  ]);
  if (!request) throw new Error(`No existe la solicitud ${requestId}.`);

  const existing = positions.find((position) => position.requestId === requestId);
  const now = container.system.now();

  if (!teamId) {
    if (existing) await container.positions.remove(existing.id);
    await container.requests.save({
      ...request,
      assignment: { ...request.assignment, teamId: '' },
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
      requestId,
      consultantId: null,
      role: request.profile.consultantRole || 'desarrollador',
      seniority: request.profile.seniority || 'semi-senior',
      allocationPct: null,
      status: 'abierta',
      openedAt: now,
      coveredAt: null,
    });
  }

  await container.requests.save({
    ...request,
    assignment: { ...request.assignment, teamId },
    updatedAt: now,
  });
}

/** Genera la descripción del puesto. Es el único paso no determinista. */
export async function draftVacancyDescription(
  container: Container,
  requestId: string,
): Promise<{ description: string; source: string; reason: string | null; model: string | null }> {
  const [request, teams] = await Promise.all([
    container.requests.get(requestId),
    container.teams.list(),
  ]);
  if (!request) throw new Error(`No existe la solicitud ${requestId}.`);

  const team = teams.find((candidate) => candidate.id === request.assignment.teamId);

  const outcome = await container.drafts.draft({
    clientName: request.intake.clientName,
    practice: request.intake.practice,
    stack: request.intake.stack,
    seniority: request.profile.seniority,
    consultantRole: request.profile.consultantRole,
    englishLevel: request.profile.englishLevel,
    skills: request.profile.skills,
    teamName: team?.name ?? '',
    vacancyTitle: request.vacancy.title,
    context: request.intake.description,
  });

  const now = container.system.now();
  await container.requests.save({
    ...request,
    vacancy: {
      ...request.vacancy,
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
      requestId: request.id,
      requestCode: request.code,
      kind: 'borrador-ia',
      fromAgent: agentForStage('vacante').id,
      toAgent: agentForStage('vacante').id,
      fromStage: 'vacante',
      toStage: 'vacante',
      summary:
        outcome.source === 'anthropic'
          ? `Recruiter genera la descripción de ${request.code} con ${outcome.model}.`
          : outcome.source === 'gemini-nano'
            ? `Recruiter genera la descripción de ${request.code} con el modelo local del navegador.`
            : `Recruiter compone la descripción de ${request.code} con el texto de reserva.`,
      checks: outcome.reason ? [outcome.reason] : [],
    },
  ]);

  return outcome;
}
