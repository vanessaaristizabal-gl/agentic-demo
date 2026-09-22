import type { Message } from './messages-types';
import type { Position, StaffingRequest, Team } from './entities';
import { stagesUpTo } from './stages';
import type { ResolutionView, StageId } from './types';

/**
 * Motor de requisitos.
 *
 * Reglas del sistema, deliberadas:
 *
 * 1. Los requisitos se ACUMULAN. Para pasar de una etapa a la siguiente se
 *    vuelven a evaluar los requisitos de todas las etapas anteriores, no solo
 *    los de la etapa actual. La etapa 5 sigue exigiendo lo que pidió la 3.
 *
 * 2. Algunos requisitos se resuelven en OTRA pantalla. La dedicación de la
 *    posición en el equipo se fija en la vista Equipos, no en la solicitud, y
 *    sin ella la última etapa no se puede cerrar.
 *
 * 3. Cuando algo falta, se nombra TODO lo que falta de una vez, en un solo
 *    mensaje, con frases completas.
 *
 * Ninguna de esas frases vive aquí: `explain` devuelve una clave de traducción
 * y sus parámetros, para que el dominio no dependa del idioma.
 */

export interface EvaluationContext {
  request: StaffingRequest;
  teams: Team[];
  positions: Position[];
}

export interface Requirement {
  id: string;
  /** Etapa que introduce el requisito. A partir de aquí se exige siempre. */
  stage: StageId;
  /** Vista en la que el usuario puede resolverlo. */
  resolveIn: ResolutionView;
  /** Se cumple o no. Función pura sobre el contexto. */
  isSatisfied: (context: EvaluationContext) => boolean;
  /** Qué decir cuando falta, como clave de traducción y parámetros. */
  explain: (context: EvaluationContext) => Message;
}

/** `requirements.<id>.label` — el nombre corto para la lista de verificación. */
export function requirementLabelKey(id: string): string {
  return `requirements.${id}.label`;
}

const explain = (id: string, variant?: string, params?: Message['params']): Message => ({
  key: variant ? `requirements.${id}.explain.${variant}` : `requirements.${id}.explain`,
  params,
});

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

const filled = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export function positionForRequest(context: EvaluationContext): Position | undefined {
  return context.positions.find((position) => position.requestId === context.request.id);
}

export function teamById(context: EvaluationContext, id: string): Team | undefined {
  return context.teams.find((team) => team.id === id);
}

/** Dedicación ya comprometida en un equipo, sumando todas sus posiciones. */
export function allocatedPct(positions: Position[], teamId: string): number {
  return positions
    .filter((position) => position.teamId === teamId)
    .reduce((total, position) => total + (position.allocationPct ?? 0), 0);
}

/* ------------------------------------------------------------------ */
/* Catálogo de requisitos, por la etapa que los introduce              */
/* ------------------------------------------------------------------ */

export const REQUIREMENTS: Requirement[] = [
  /* --- Etapa 1 · Registro (Sales) --------------------------------- */
  {
    id: 'intake.client',
    stage: 'registro',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.intake.clientName),
    explain: () => explain('intake.client'),
  },
  {
    id: 'intake.practice',
    stage: 'registro',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.intake.practice),
    explain: () => explain('intake.practice'),
  },
  {
    id: 'intake.cost-center',
    stage: 'registro',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.intake.costCenter),
    explain: () => explain('intake.cost-center'),
  },

  /* --- Etapa 2 · Perfil (Solution Architect) ----------------------- */
  {
    id: 'intake.stack',
    stage: 'perfil',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.intake.stack),
    explain: ({ request }) =>
      explain('intake.stack', filled(request.intake.practice) ? 'with-practice' : 'without-practice'),
  },
  {
    id: 'profile.seniority',
    stage: 'perfil',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.profile.seniority),
    explain: () => explain('profile.seniority'),
  },
  {
    id: 'profile.role',
    stage: 'perfil',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.profile.consultantRole),
    explain: () => explain('profile.role'),
  },
  {
    id: 'profile.skills',
    stage: 'perfil',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.profile.skills.length >= 3,
    explain: ({ request }) => explain('profile.skills', undefined, { count: request.profile.skills.length }),
  },
  {
    id: 'profile.english',
    stage: 'perfil',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.profile.englishLevel),
    explain: () => explain('profile.english'),
  },

  /* --- Etapa 3 · Equipo (Delivery Manager) ------------------------- */
  {
    id: 'assignment.team',
    stage: 'equipo',
    resolveIn: 'solicitudes',
    isSatisfied: (context) => {
      const { request } = context;
      if (!filled(request.assignment.teamId)) return false;
      if (!teamById(context, request.assignment.teamId)) return false;
      const position = positionForRequest(context);
      return Boolean(position) && position!.teamId === request.assignment.teamId;
    },
    explain: (context) => {
      const { request } = context;
      if (!filled(request.assignment.teamId)) return explain('assignment.team', 'none');
      const team = teamById(context, request.assignment.teamId);
      if (!team) return explain('assignment.team', 'missing-team');
      return explain('assignment.team', 'released', { team: team.name });
    },
  },
  {
    id: 'assignment.join-date',
    stage: 'equipo',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.assignment.joinDate),
    explain: () => explain('assignment.join-date'),
  },
  {
    id: 'assignment.referent',
    stage: 'equipo',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.assignment.technicalReferent),
    explain: () => explain('assignment.referent'),
  },

  /* --- Etapa 4 · Vacante (Recruiter) ------------------------------- */
  {
    id: 'vacancy.title',
    stage: 'vacante',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.vacancy.title),
    explain: () => explain('vacancy.title'),
  },
  {
    id: 'vacancy.description',
    stage: 'vacante',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.vacancy.jobDescription.trim().length >= 120,
    explain: ({ request }) => {
      const count = request.vacancy.jobDescription.trim().length;
      return count === 0
        ? explain('vacancy.description', 'empty')
        : explain('vacancy.description', 'short', { count });
    },
  },
  {
    id: 'vacancy.channels',
    stage: 'vacante',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.vacancy.channels.length >= 1,
    explain: () => explain('vacancy.channels'),
  },
  {
    id: 'vacancy.salary-band',
    stage: 'vacante',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.vacancy.salaryBand),
    explain: () => explain('vacancy.salary-band'),
  },

  /* --- Etapa 5 · Entrevista (Engineering Manager) ------------------ */
  {
    id: 'interview.candidate',
    stage: 'entrevista',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.interview.candidateName),
    explain: () => explain('interview.candidate'),
  },
  {
    id: 'interview.score',
    stage: 'entrevista',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => (request.interview.technicalScore ?? -1) >= 7,
    explain: ({ request }) => {
      const score = request.interview.technicalScore;
      return score === null
        ? explain('interview.score', 'none')
        : explain('interview.score', 'low', { score });
    },
  },
  {
    id: 'interview.decision',
    stage: 'entrevista',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.interview.decision === 'contratar',
    explain: ({ request }) => {
      switch (request.interview.decision) {
        case 'segunda-ronda':
          return explain('interview.decision', 'second-round');
        case 'descartar':
          return explain('interview.decision', 'rejected');
        default:
          return explain('interview.decision', 'pending');
      }
    },
  },
  {
    id: 'interview.feedback',
    stage: 'entrevista',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.interview.feedback.trim().length >= 40,
    explain: ({ request }) => {
      const count = request.interview.feedback.trim().length;
      return count === 0
        ? explain('interview.feedback', 'empty')
        : explain('interview.feedback', 'short', { count });
    },
  },

  /* --- Etapa 6 · Onboarding (Recursos Humanos) --------------------- */
  {
    id: 'onboarding.contract',
    stage: 'onboarding',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.onboarding.contractType),
    explain: () => explain('onboarding.contract'),
  },
  {
    id: 'onboarding.equipment',
    stage: 'onboarding',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.onboarding.equipmentDelivered,
    explain: () => explain('onboarding.equipment'),
  },
  {
    id: 'onboarding.accesses',
    stage: 'onboarding',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => request.onboarding.accesses.length >= 3,
    explain: ({ request }) =>
      explain('onboarding.accesses', undefined, { count: request.onboarding.accesses.length }),
  },
  {
    id: 'onboarding.buddy',
    stage: 'onboarding',
    resolveIn: 'solicitudes',
    isSatisfied: ({ request }) => filled(request.onboarding.buddyName),
    explain: () => explain('onboarding.buddy'),
  },
  {
    id: 'team.allocation',
    stage: 'onboarding',
    // No se resuelve en la pantalla de la solicitud: se fija en la vista Equipos.
    resolveIn: 'equipos',
    isSatisfied: (context) => {
      const position = positionForRequest(context);
      return Boolean(position) && (position!.allocationPct ?? 0) > 0;
    },
    explain: (context) => {
      const position = positionForRequest(context);
      if (!position) return explain('team.allocation', 'no-position');
      const team = teamById(context, context.request.assignment.teamId);
      return explain('team.allocation', 'no-allocation', { team: team?.name ?? '' });
    },
  },
  {
    id: 'team.capacity',
    stage: 'onboarding',
    resolveIn: 'equipos',
    isSatisfied: (context) => {
      const team = teamById(context, context.request.assignment.teamId);
      if (!team) return false;
      return allocatedPct(context.positions, team.id) <= team.capacityPct;
    },
    explain: (context) => {
      const team = teamById(context, context.request.assignment.teamId);
      if (!team) return explain('team.capacity', 'no-team');
      const used = allocatedPct(context.positions, team.id);
      return explain('team.capacity', 'over', {
        team: team.name,
        used,
        capacity: team.capacityPct,
        excess: used - team.capacityPct,
      });
    },
  },
];

/* ------------------------------------------------------------------ */
/* Evaluación acumulada                                                */
/* ------------------------------------------------------------------ */

/**
 * Requisitos exigibles para salir de `stage`: los de esa etapa y los de
 * todas las anteriores. Esta es la regla de acumulación.
 */
export function requirementsUpTo(stage: StageId): Requirement[] {
  const allowed = new Set<StageId>(stagesUpTo(stage));
  return REQUIREMENTS.filter((requirement) => allowed.has(requirement.stage));
}

export function requirementsIntroducedAt(stage: StageId): Requirement[] {
  return REQUIREMENTS.filter((requirement) => requirement.stage === stage);
}

export interface RequirementCheck {
  requirement: Requirement;
  satisfied: boolean;
  /** Clave y parámetros del incumplimiento. null si está cumplido. */
  message: Message | null;
  /** Etapa que lo introdujo, para mostrar la herencia. */
  originStage: StageId;
  /** true si viene de una etapa anterior a la actual: requisito heredado. */
  inherited: boolean;
}

export function evaluate(context: EvaluationContext, stage: StageId): RequirementCheck[] {
  return requirementsUpTo(stage).map((requirement) => {
    const satisfied = requirement.isSatisfied(context);
    return {
      requirement,
      satisfied,
      message: satisfied ? null : requirement.explain(context),
      originStage: requirement.stage,
      inherited: requirement.stage !== stage,
    };
  });
}
