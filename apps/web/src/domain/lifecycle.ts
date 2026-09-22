import type {
  Consultant,
  ConsultantOutcome,
  Demand,
  LifecyclePhase,
  LifecyclePhaseId,
  Position,
} from './entities';
import type { ConsultantRole, RoleId, Seniority } from './types';

/**
 * Ciclo de vida del consultor, posterior a la demanda.
 *
 * Es determinista igual que el flujo de la demanda: cada fase tiene un
 * responsable, una lista de exigencias y una fecha de cumplimiento, y solo
 * avanza cuando el usuario lo pide.
 */

interface PhaseBlueprint {
  id: LifecyclePhaseId;
  label: string;
  owner: RoleId;
  summary: string;
  requirements: { label: string; detail: string }[];
}

export const PHASE_BLUEPRINTS: PhaseBlueprint[] = [
  {
    id: 'onboarding',
    label: 'Onboarding',
    owner: 'hr',
    summary: 'Alta administrativa: contrato, equipo de trabajo y accesos.',
    requirements: [
      { label: 'Contrato firmado', detail: 'Recursos Humanos formaliza el tipo de contrato acordado en la demanda.' },
      { label: 'Equipo de trabajo entregado', detail: 'El portátil y los periféricos están en manos del consultor.' },
      { label: 'Accesos concedidos', detail: 'Al menos tres accesos activos, incluidos correo y repositorio del cliente.' },
      { label: 'Buddy asignado', detail: 'Una persona del equipo acompaña al consultor las dos primeras semanas.' },
    ],
  },
  {
    id: 'ramp-up',
    label: 'Ramp-up',
    owner: 'delivery-manager',
    summary: 'Puesta en contexto hasta que el consultor entrega sin apoyo continuo.',
    requirements: [
      { label: 'Sesión de contexto con el cliente', detail: 'El consultor conoce el negocio, el producto y a quién preguntar.' },
      { label: 'Primer cambio en producción', detail: 'Una entrega real, por pequeña que sea, revisada por el referente técnico.' },
      { label: 'Plan de ramp-up acordado', detail: 'El referente técnico y el Delivery Manager fijan objetivos de las primeras seis semanas.' },
    ],
  },
  {
    id: 'productivo',
    label: 'Productivo',
    owner: 'engineering-manager',
    summary: 'El consultor sostiene el compromiso del equipo de forma autónoma.',
    requirements: [
      { label: 'Un sprint completo sin apoyo del referente', detail: 'El consultor toma, resuelve y entrega su trabajo por su cuenta.' },
      { label: 'Dedicación estable en el equipo', detail: 'La dedicación fijada en la vista Equipos se mantiene sin cambios durante un mes.' },
      { label: 'Feedback del cliente registrado', detail: 'El Delivery Manager recoge la valoración del cliente por escrito.' },
    ],
  },
  {
    id: 'evaluacion',
    label: 'Evaluación',
    owner: 'engineering-manager',
    summary: 'Revisión formal de desempeño y decisión sobre la continuidad.',
    requirements: [
      { label: 'Evaluación de desempeño', detail: 'El Engineering Manager evalúa al consultor a los tres meses de estar productivo.' },
      { label: 'Feedback del equipo', detail: 'Se recoge la valoración de quienes trabajan con el consultor a diario.' },
      { label: 'Plan de carrera acordado', detail: 'Consultor y Engineering Manager fijan el siguiente paso.' },
    ],
  },
  {
    id: 'salida',
    label: 'Salida o rotación',
    owner: 'hr',
    summary: 'Cierre del ciclo: el consultor rota a otro equipo o sale de la cuenta.',
    requirements: [
      { label: 'Decisión registrada', detail: 'Queda por escrito si el consultor rota a otro equipo o sale de la cuenta.' },
      { label: 'Traspaso documentado', detail: 'El conocimiento del consultor queda en manos del equipo antes de su último día.' },
      { label: 'Accesos revocados', detail: 'Recursos Humanos retira los accesos al cliente en las 24 horas siguientes.' },
    ],
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
    label: blueprint.label,
    owner: blueprint.owner,
    summary: blueprint.summary,
    status,
    startedAt,
    completedAt,
    requirements: blueprint.requirements.map((requirement) => ({
      ...requirement,
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
 * Crea el consultor cuando la demanda llega a `activo`.
 * El nombre sale del candidato evaluado por el Engineering Manager.
 */
export function buildConsultantFromDemand(params: {
  id: string;
  demand: Demand;
  position: Position | undefined;
  now: string;
}): Consultant {
  const { demand, now } = params;
  return {
    id: params.id,
    name: demand.interview.candidateName.trim(),
    role: (demand.profile.consultantRole || 'desarrollador') as ConsultantRole,
    seniority: (demand.profile.seniority || 'semi-senior') as Seniority,
    teamId: demand.assignment.teamId,
    demandId: demand.id,
    initials: initialsOf(demand.interview.candidateName),
    joinedAt: demand.onboarding.startDate || demand.assignment.joinDate || now,
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
