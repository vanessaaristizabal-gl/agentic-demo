import type {
  Consultant,
  ConsultantOutcome,
  StaffingRequest,
  LifecyclePhase,
  LifecyclePhaseId,
  Position,
} from './entities';
import type { ConsultantRole, RoleId, Seniority } from './types';

/**
 * Ciclo de vida del consultor, posterior a la solicitud.
 *
 * Es determinista igual que el flujo de la solicitud: cada fase tiene un
 * responsable, una lista de exigencias y una fecha de cumplimiento, y solo
 * avanza cuando el usuario lo pide.
 */

interface PhaseBlueprint {
  id: LifecyclePhaseId;
  owner: RoleId;
  /** Identificadores de lo que exige la fase. El texto vive en las traducciones. */
  requirements: string[];
}

/**
 * Claves de traduccion del ciclo de vida:
 * `lifecycle.<phase>.label`, `.summary`, y `.requirements.<id>.label` / `.detail`.
 */
export function phaseKey(id: LifecyclePhaseId, part: 'label' | 'summary'): string {
  return `lifecycle.${id}.${part}`;
}

export function phaseRequirementKey(
  phase: LifecyclePhaseId,
  requirement: string,
  part: 'label' | 'detail',
): string {
  return `lifecycle.${phase}.requirements.${requirement}.${part}`;
}

export const PHASE_BLUEPRINTS: PhaseBlueprint[] = [
  {
    id: 'onboarding',
    owner: 'hr',
    requirements: ['contract', 'equipment', 'accesses', 'buddy'],
  },
  {
    id: 'ramp-up',
    owner: 'delivery-manager',
    requirements: ['context-session', 'first-change', 'ramp-up-plan'],
  },
  {
    id: 'productivo',
    owner: 'engineering-manager',
    requirements: ['unsupported-sprint', 'stable-allocation', 'client-feedback'],
  },
  {
    id: 'evaluacion',
    owner: 'engineering-manager',
    requirements: ['performance-review', 'team-feedback', 'career-plan'],
  },
  {
    id: 'salida',
    owner: 'hr',
    requirements: ['decision-recorded', 'handover', 'access-revoked'],
  },
];

export const PHASE_ORDER: LifecyclePhaseId[] = PHASE_BLUEPRINTS.map((phase) => phase.id);

function buildPhase(
  blueprint: PhaseBlueprint,
  status: LifecyclePhase['status'],
  startedAt: string | null,
  completedAt: string | null,
): LifecyclePhase {
  return {
    id: blueprint.id,
    owner: blueprint.owner,
    status,
    startedAt,
    completedAt,
    requirements: blueprint.requirements.map((id) => ({
      id,
      completedAt: status === 'completada' ? completedAt : null,
    })),
  };
}

export function initialPhases(now: string): LifecyclePhase[] {
  return PHASE_BLUEPRINTS.map((blueprint, index) => {
    if (index === 0) return buildPhase(blueprint, 'completada', now, now);
    if (index === 1) return buildPhase(blueprint, 'en-curso', now, null);
    return buildPhase(blueprint, 'pendiente', null, null);
  });
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Crea el consultor cuando la solicitud llega a `activo`.
 * El nombre sale del candidato evaluado por el Engineering Manager.
 */
export function buildConsultantFromRequest(params: {
  id: string;
  request: StaffingRequest;
  position: Position | undefined;
  now: string;
}): Consultant {
  const { request, now } = params;
  return {
    id: params.id,
    name: request.interview.candidateName.trim(),
    role: (request.profile.consultantRole || 'desarrollador') as ConsultantRole,
    seniority: (request.profile.seniority || 'semi-senior') as Seniority,
    teamId: request.assignment.teamId,
    requestId: request.id,
    initials: initialsOf(request.interview.candidateName),
    joinedAt: request.onboarding.startDate || request.assignment.joinDate || now,
    outcome: 'en-curso',
    outcomeNote: '',
    phases: initialPhases(now),
  };
}

export function currentPhase(consultant: Consultant): LifecyclePhase | undefined {
  return (
    consultant.phases.find((phase) => phase.status === 'en-curso') ??
    consultant.phases.find((phase) => phase.status === 'pendiente')
  );
}

/** Completa la fase en curso y pone en marcha la siguiente. Función pura. */
export function completeCurrentPhase(consultant: Consultant, now: string): Consultant {
  const index = consultant.phases.findIndex((phase) => phase.status === 'en-curso');
  if (index === -1) return consultant;

  const phases = consultant.phases.map((phase, position) => {
    if (position === index) {
      return {
        ...phase,
        status: 'completada' as const,
        completedAt: now,
        requirements: phase.requirements.map((requirement) => ({
          ...requirement,
          completedAt: requirement.completedAt ?? now,
        })),
      };
    }
    if (position === index + 1) {
      return { ...phase, status: 'en-curso' as const, startedAt: now };
    }
    return phase;
  });

  return { ...consultant, phases };
}

/** Cierra el ciclo con rotación o salida. */
export function closeLifecycle(
  consultant: Consultant,
  outcome: Exclude<ConsultantOutcome, 'en-curso'>,
  note: string,
  now: string,
): Consultant {
  const phases = consultant.phases.map((phase) =>
    phase.id === 'salida'
      ? {
          ...phase,
          status: 'completada' as const,
          startedAt: phase.startedAt ?? now,
          completedAt: now,
          requirements: phase.requirements.map((requirement) => ({
            ...requirement,
            completedAt: requirement.completedAt ?? now,
          })),
        }
      : phase,
  );
  return { ...consultant, phases, outcome, outcomeNote: note };
}

export function lifecycleProgress(consultant: Consultant): number {
  const completed = consultant.phases.filter((phase) => phase.status === 'completada').length;
  return Math.round((completed / consultant.phases.length) * 100);
}
