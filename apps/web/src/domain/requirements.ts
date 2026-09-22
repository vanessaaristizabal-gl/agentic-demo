import type { StaffingRequest, Position, Team } from './entities';
import { stageLabel, stagesUpTo } from './stages';
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
  /** Nombre corto del requisito, para la lista de verificación. */
  label: string;
  /** Vista en la que el usuario puede resolverlo. */
  resolveIn: ResolutionView;
  /** Dónde exactamente, en palabras. */
  where: string;
  /** Se cumple o no. Función pura sobre el contexto. */
  isSatisfied: (context: EvaluationContext) => boolean;
  /** Frase completa que se muestra cuando falta. Texto de producto, no un código. */
  explain: (context: EvaluationContext) => string;
}

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

export function teamName(context: EvaluationContext, id: string): string {
  return teamById(context, id)?.name ?? 'el equipo asignado';
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
  /* --- Etapa 1 · Solicitud (Sales) ---------------------------------- */
  {
    id: 'intake.client',
    stage: 'registro',
    label: 'Cliente',
    resolveIn: 'orquestacion',
    where: 'el formulario de la solicitud',
    isSatisfied: ({ request }) => filled(request.intake.clientName),
    explain: () =>
      'La solicitud todavía no tiene cliente. Escribe el nombre del cliente en el campo «Cliente» del formulario de la solicitud.',
  },
  {
    id: 'intake.practice',
    stage: 'registro',
    label: 'Práctica',
    resolveIn: 'orquestacion',
    where: 'el formulario de la solicitud',
    isSatisfied: ({ request }) => filled(request.intake.practice),
    explain: () =>
      'Falta elegir la práctica en el formulario de la solicitud. Mientras no haya práctica, el campo «Stack tecnológico» permanece vacío y bloqueado, porque sus opciones dependen de ella.',
  },
  {
    id: 'intake.cost-center',
    stage: 'registro',
    label: 'Centro de costo',
    resolveIn: 'orquestacion',
    where: 'el formulario de la solicitud',
    isSatisfied: ({ request }) => filled(request.intake.costCenter),
    explain: () =>
      'El centro de costo está vacío. Es obligatorio para registrar la solicitud, aunque el formulario no lo marque como tal: sin él, Finanzas no puede imputar las horas del consultor.',
  },

  /* --- Etapa 2 · Perfil (Solution Architect) ----------------------- */
  {
    id: 'intake.stack',
    stage: 'perfil',
    label: 'Stack tecnológico',
    resolveIn: 'orquestacion',
    where: 'el formulario de la solicitud',
    isSatisfied: ({ request }) => filled(request.intake.stack),
    explain: ({ request }) =>
      filled(request.intake.practice)
        ? 'Falta el stack tecnológico. Lo eliges en el formulario de la solicitud, y solo se ofrecen los stacks de la práctica ya seleccionada.'
        : 'Falta el stack tecnológico, pero no se puede elegir mientras la solicitud no tenga práctica: las opciones de stack dependen de la práctica.',
  },
  {
    id: 'profile.seniority',
    stage: 'perfil',
    label: 'Seniority',
    resolveIn: 'orquestacion',
    where: 'el panel del Solution Architect',
    isSatisfied: ({ request }) => filled(request.profile.seniority),
    explain: () =>
      'El perfil técnico no tiene seniority. Defínelo en el panel del Solution Architect; de él dependen la banda salarial y la posición que se abrirá en el equipo.',
  },
  {
    id: 'profile.role',
    stage: 'perfil',
    label: 'Rol del consultor',
    resolveIn: 'orquestacion',
    where: 'el panel del Solution Architect',
    isSatisfied: ({ request }) => filled(request.profile.consultantRole),
    explain: () =>
      'Falta decir si la solicitud pide un desarrollador, un QA o un tech manager. Elige el rol en el panel del Solution Architect.',
  },
  {
    id: 'profile.skills',
    stage: 'perfil',
    label: 'Habilidades (mínimo 3)',
    resolveIn: 'orquestacion',
    where: 'el panel del Solution Architect',
    isSatisfied: ({ request }) => request.profile.skills.length >= 3,
    explain: ({ request }) => {
      const current = request.profile.skills.length;
      return `El perfil tiene ${current} ${current === 1 ? 'habilidad marcada' : 'habilidades marcadas'} y el mínimo para publicar una vacante es 3. Añade las que falten en el panel del Solution Architect.`;
    },
  },
  {
    id: 'profile.english',
    stage: 'perfil',
    label: 'Nivel de inglés',
    resolveIn: 'orquestacion',
    where: 'el panel del Solution Architect',
    isSatisfied: ({ request }) => filled(request.profile.englishLevel),
    explain: () =>
      'Falta el nivel de inglés exigido al consultor. Es obligatorio en el perfil técnico porque condiciona qué candidatos puede presentar Recruiter.',
  },

  /* --- Etapa 3 · Equipo (Delivery Manager) ------------------------- */
  {
    id: 'assignment.team',
    stage: 'equipo',
    label: 'Equipo asignado',
    resolveIn: 'orquestacion',
    where: 'el panel del Delivery Manager',
    isSatisfied: (context) => {
      const { request } = context;
      if (!filled(request.assignment.teamId)) return false;
      if (!teamById(context, request.assignment.teamId)) return false;
      const position = positionForRequest(context);
      return Boolean(position) && position!.teamId === request.assignment.teamId;
    },
    explain: (context) => {
      const { request } = context;
      if (!filled(request.assignment.teamId)) {
        return 'La solicitud no está asignada a ningún equipo. Elige el equipo en el panel del Delivery Manager: al hacerlo se abre la posición correspondiente.';
      }
      if (!teamById(context, request.assignment.teamId)) {
        return 'El equipo que tenía asignado la solicitud ya no existe. Vuelve a asignarla desde el panel del Delivery Manager.';
      }
      return `La solicitud dice estar en ${teamName(context, request.assignment.teamId)}, pero ya no hay una posición abierta para ella en ese equipo: se liberó desde la vista Equipos. Vuelve a asignarla desde el panel del Delivery Manager.`;
    },
  },
  {
    id: 'assignment.join-date',
    stage: 'equipo',
    label: 'Fecha de incorporación al equipo',
    resolveIn: 'orquestacion',
    where: 'el panel del Delivery Manager',
    isSatisfied: ({ request }) => filled(request.assignment.joinDate),
    explain: () =>
      'Falta la fecha de incorporación al equipo. El Delivery Manager la fija en su panel y es la que Recursos Humanos usa después para el contrato.',
  },
  {
    id: 'assignment.referent',
    stage: 'equipo',
    label: 'Referente técnico',
    resolveIn: 'orquestacion',
    where: 'el panel del Delivery Manager',
    isSatisfied: ({ request }) => filled(request.assignment.technicalReferent),
    explain: () =>
      'Falta el referente técnico dentro del equipo. Es la persona que acompaña al consultor durante el ramp-up y se indica en el panel del Delivery Manager.',
  },

  /* --- Etapa 4 · Vacante (Recruiter) ------------------------------- */
  {
    id: 'vacancy.title',
    stage: 'vacante',
    label: 'Título de la vacante',
    resolveIn: 'orquestacion',
    where: 'el panel del Recruiter',
    isSatisfied: ({ request }) => filled(request.vacancy.title),
    explain: () =>
      'La vacante no tiene título. Escríbelo en el panel del Recruiter: es lo que ve el candidato en el anuncio.',
  },
  {
    id: 'vacancy.description',
    stage: 'vacante',
    label: 'Descripción del puesto (mínimo 120 caracteres)',
    resolveIn: 'orquestacion',
    where: 'el panel del Recruiter',
    isSatisfied: ({ request }) => request.vacancy.jobDescription.trim().length >= 120,
    explain: ({ request }) => {
      const current = request.vacancy.jobDescription.trim().length;
      if (current === 0) {
        return 'La vacante no tiene descripción del puesto. Puedes escribirla a mano o pulsar «Redactar con IA» para generarla a partir del perfil técnico ya definido.';
      }
      return `La descripción del puesto tiene ${current} caracteres y no se publica con menos de 120. Amplíala a mano o vuelve a pulsar «Redactar con IA».`;
    },
  },
  {
    id: 'vacancy.channels',
    stage: 'vacante',
    label: 'Canales de publicación',
    resolveIn: 'orquestacion',
    where: 'el panel del Recruiter',
    isSatisfied: ({ request }) => request.vacancy.channels.length >= 1,
    explain: () =>
      'La vacante no está publicada en ningún canal. Marca al menos uno en el panel del Recruiter.',
  },
  {
    id: 'vacancy.salary-band',
    stage: 'vacante',
    label: 'Banda salarial',
    resolveIn: 'orquestacion',
    where: 'el panel del Recruiter',
    isSatisfied: ({ request }) => filled(request.vacancy.salaryBand),
    explain: () =>
      'Falta la banda salarial de la vacante. Sin ella, el Engineering Manager no puede cerrar una oferta después de la entrevista.',
  },

  /* --- Etapa 5 · Entrevista (Engineering Manager) ------------------ */
  {
    id: 'interview.candidate',
    stage: 'entrevista',
    label: 'Candidato evaluado',
    resolveIn: 'orquestacion',
    where: 'el panel del Engineering Manager',
    isSatisfied: ({ request }) => filled(request.interview.candidateName),
    explain: () =>
      'No hay ningún candidato registrado en la entrevista. Escribe su nombre en el panel del Engineering Manager: será la persona que aparezca después en el equipo.',
  },
  {
    id: 'interview.score',
    stage: 'entrevista',
    label: 'Puntuación técnica de 7 o más',
    resolveIn: 'orquestacion',
    where: 'el panel del Engineering Manager',
    isSatisfied: ({ request }) => (request.interview.technicalScore ?? -1) >= 7,
    explain: ({ request }) => {
      const score = request.interview.technicalScore;
      if (score === null) {
        return 'La entrevista no tiene puntuación técnica. Puntúa al candidato de 0 a 10 en el panel del Engineering Manager.';
      }
      return `El candidato tiene una puntuación técnica de ${score} sobre 10 y el mínimo para contratar es 7. Revisa la evaluación o descarta al candidato y busca otro.`;
    },
  },
  {
    id: 'interview.decision',
    stage: 'entrevista',
    label: 'Decisión de contratación',
    resolveIn: 'orquestacion',
    where: 'el panel del Engineering Manager',
    isSatisfied: ({ request }) => request.interview.decision === 'contratar',
    explain: ({ request }) => {
      switch (request.interview.decision) {
        case 'segunda-ronda':
          return 'La entrevista está marcada como «segunda ronda». Mientras la decisión no sea «contratar», Recursos Humanos no puede abrir el onboarding.';
        case 'descartar':
          return 'El candidato está descartado. Registra otro candidato y vuelve a evaluarlo, o cambia la decisión a «contratar».';
        default:
          return 'La decisión de la entrevista sigue en «pendiente». Cámbiala a «contratar» en el panel del Engineering Manager para poder continuar.';
      }
    },
  },
  {
    id: 'interview.feedback',
    stage: 'entrevista',
    label: 'Feedback escrito (mínimo 40 caracteres)',
    resolveIn: 'orquestacion',
    where: 'el panel del Engineering Manager',
    isSatisfied: ({ request }) => request.interview.feedback.trim().length >= 40,
    explain: ({ request }) => {
      const current = request.interview.feedback.trim().length;
      return current === 0
        ? 'La entrevista no tiene feedback escrito. Es obligatorio dejar constancia de la evaluación antes de pasar el caso a Recursos Humanos.'
        : `El feedback de la entrevista tiene ${current} caracteres y se piden al menos 40. Explica en qué se basó la decisión.`;
    },
  },

  /* --- Etapa 6 · Onboarding (Recursos Humanos) --------------------- */
  {
    id: 'onboarding.contract',
    stage: 'onboarding',
    label: 'Tipo de contrato',
    resolveIn: 'orquestacion',
    where: 'el panel de Recursos Humanos',
    isSatisfied: ({ request }) => filled(request.onboarding.contractType),
    explain: () =>
      'Falta el tipo de contrato. Recursos Humanos lo elige en su panel antes de dar de alta al consultor.',
  },
  {
    id: 'onboarding.equipment',
    stage: 'onboarding',
    label: 'Equipo de trabajo entregado',
    resolveIn: 'orquestacion',
    where: 'el panel de Recursos Humanos',
    isSatisfied: ({ request }) => request.onboarding.equipmentDelivered,
    explain: () =>
      'El equipo de trabajo todavía no consta como entregado. Márcalo en el panel de Recursos Humanos cuando el portátil esté en manos del consultor.',
  },
  {
    id: 'onboarding.accesses',
    stage: 'onboarding',
    label: 'Accesos concedidos (mínimo 3)',
    resolveIn: 'orquestacion',
    where: 'el panel de Recursos Humanos',
    isSatisfied: ({ request }) => request.onboarding.accesses.length >= 3,
    explain: ({ request }) => {
      const current = request.onboarding.accesses.length;
      return `El consultor tiene ${current} ${current === 1 ? 'acceso concedido' : 'accesos concedidos'} y no puede empezar con menos de 3. Complétalos en el panel de Recursos Humanos.`;
    },
  },
  {
    id: 'onboarding.buddy',
    stage: 'onboarding',
    label: 'Buddy asignado',
    resolveIn: 'orquestacion',
    where: 'el panel de Recursos Humanos',
    isSatisfied: ({ request }) => filled(request.onboarding.buddyName),
    explain: () =>
      'Nadie figura como buddy del consultor. Asigna uno en el panel de Recursos Humanos: es quien lo acompaña las dos primeras semanas.',
  },
  {
    id: 'team.allocation',
    stage: 'onboarding',
    label: 'Dedicación fijada en el equipo',
    resolveIn: 'equipos',
    where: 'la vista Equipos',
    isSatisfied: (context) => {
      const position = positionForRequest(context);
      return Boolean(position) && (position!.allocationPct ?? 0) > 0;
    },
    explain: (context) => {
      const { request } = context;
      const position = positionForRequest(context);
      const team = teamName(context, request.assignment.teamId);
      if (!position) {
        return `No hay ninguna posición abierta para esta solicitud, así que no hay dedicación que fijar. Vuelve a asignar la solicitud a un equipo y después fija la dedicación en la vista Equipos.`;
      }
      return `La posición de esta solicitud en ${team} no tiene dedicación asignada. La dedicación no se fija aquí: ve a la vista Equipos, busca la posición abierta y asígnale un porcentaje mayor que cero.`;
    },
  },
  {
    id: 'team.capacity',
    stage: 'onboarding',
    label: 'Capacidad del equipo respetada',
    resolveIn: 'equipos',
    where: 'la vista Equipos',
    isSatisfied: (context) => {
      const { request } = context;
      const team = teamById(context, request.assignment.teamId);
      if (!team) return false;
      return allocatedPct(context.positions, team.id) <= team.capacityPct;
    },
    explain: (context) => {
      const { request } = context;
      const team = teamById(context, request.assignment.teamId);
      if (!team) {
        return 'No se puede comprobar la capacidad porque la solicitud no tiene un equipo válido asignado.';
      }
      const used = allocatedPct(context.positions, team.id);
      const excess = used - team.capacityPct;
      return `${team.name} quedaría con ${used} puntos de dedicación comprometidos sobre una capacidad de ${team.capacityPct}, es decir ${excess} por encima. Baja la dedicación de alguna posición del equipo en la vista Equipos antes de activar al consultor.`;
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
  /** Frase de producto que explica el incumplimiento. Vacía si está cumplido. */
  sentence: string;
  /** Etiqueta de la etapa que lo introdujo, para mostrar la herencia. */
  originLabel: string;
  /** true si viene de una etapa anterior a la actual: requisito heredado. */
  inherited: boolean;
}

export function evaluate(context: EvaluationContext, stage: StageId): RequirementCheck[] {
  return requirementsUpTo(stage).map((requirement) => {
    const satisfied = requirement.isSatisfied(context);
    return {
      requirement,
      satisfied,
      sentence: satisfied ? '' : requirement.explain(context),
      originLabel: stageLabel(requirement.stage),
      inherited: requirement.stage !== stage,
    };
  });
}
