import type {
  BillingModel,
  ConsultantRole,
  ContractType,
  EnglishLevel,
  InterviewDecision,
  PracticeId,
  Priority,
  RoleId,
  Seniority,
  StageId,
} from './types';

/* ------------------------------------------------------------------ */
/* Demanda                                                             */
/* ------------------------------------------------------------------ */

/** Etapa 1 — Sales. El formulario de la demanda: 8 campos, 3 obligatorios. */
export interface DemandIntake {
  clientName: string;
  practice: PracticeId | '';
  /** Depende de `practice`. Cambiar de practica lo invalida. */
  stack: string;
  /** Obligatorio, pero el formulario no lo marca. Solo falla al guardar. */
  costCenter: string;
  description: string;
  expectedStart: string;
  billingModel: BillingModel | '';
  priority: Priority | '';
}

/** Etapa 2 — Solution Architect. */
export interface TechProfile {
  seniority: Seniority | '';
  consultantRole: ConsultantRole | '';
  skills: string[];
  englishLevel: EnglishLevel | '';
  notes: string;
}

/** Etapa 3 — Delivery Manager. La dedicacion NO vive aqui: vive en la posicion del equipo. */
export interface TeamAssignment {
  teamId: string;
  joinDate: string;
  technicalReferent: string;
}

/** Etapa 4 — Recruiter. */
export interface Vacancy {
  title: string;
  jobDescription: string;
  channels: string[];
  salaryBand: string;
  /** De donde salio el ultimo borrador de la descripcion. */
  draftSource: 'manual' | 'anthropic' | 'gemini-nano' | 'reserva' | null;
  draftedAt: string | null;
}

/** Etapa 5 — Engineering Manager. */
export interface Interview {
  candidateName: string;
  /** 0 a 10. Se exige 7 o mas para contratar. */
  technicalScore: number | null;
  decision: InterviewDecision;
  feedback: string;
}

/** Etapa 6 — Recursos Humanos. */
export interface OnboardingFile {
  contractType: ContractType | '';
  equipmentDelivered: boolean;
  accesses: string[];
  buddyName: string;
  startDate: string;
}

export interface Demand {
  id: string;
  /** Codigo legible: DEM-2026-001. */
  code: string;
  stage: StageId;
  createdAt: string;
  updatedAt: string;
  intake: DemandIntake;
  profile: TechProfile;
  assignment: TeamAssignment;
  vacancy: Vacancy;
  interview: Interview;
  onboarding: OnboardingFile;
  /** Momento en el que la demanda entro en cada etapa. */
  stageEnteredAt: Partial<Record<StageId, string>>;
  /** Id del consultor creado al llegar a `activo`. */
  consultantId: string | null;
}

export function emptyIntake(): DemandIntake {
  return {
    clientName: '',
    practice: '',
    stack: '',
    costCenter: '',
    description: '',
    expectedStart: '',
    billingModel: '',
    priority: '',
  };
}

export function emptyProfile(): TechProfile {
  return { seniority: '', consultantRole: '', skills: [], englishLevel: '', notes: '' };
}

export function emptyAssignment(): TeamAssignment {
  return { teamId: '', joinDate: '', technicalReferent: '' };
}

export function emptyVacancy(): Vacancy {
  return {
    title: '',
    jobDescription: '',
    channels: [],
    salaryBand: '',
    draftSource: null,
    draftedAt: null,
  };
}

export function emptyInterview(): Interview {
  return { candidateName: '', technicalScore: null, decision: 'pendiente', feedback: '' };
}

export function emptyOnboarding(): OnboardingFile {
  return {
    contractType: '',
    equipmentDelivered: false,
    accesses: [],
    buddyName: '',
    startDate: '',
  };
}

export function createDemand(params: {
  id: string;
  code: string;
  now: string;
  intake?: Partial<DemandIntake>;
}): Demand {
  return {
    id: params.id,
    code: params.code,
    stage: 'demanda',
    createdAt: params.now,
    updatedAt: params.now,
    intake: { ...emptyIntake(), ...params.intake },
    profile: emptyProfile(),
    assignment: emptyAssignment(),
    vacancy: emptyVacancy(),
    interview: emptyInterview(),
    onboarding: emptyOnboarding(),
    stageEnteredAt: { demanda: params.now },
    consultantId: null,
  };
}

/* ------------------------------------------------------------------ */
/* Equipos y posiciones                                                */
/* ------------------------------------------------------------------ */

export interface Team {
  id: string;
  name: string;
  clientName: string;
  practice: PracticeId;
  deliveryManager: string;
  /**
   * Capacidad total del equipo en puntos de dedicacion.
   * 100 puntos = una persona a tiempo completo.
   */
  capacityPct: number;
}

/**
 * Una posicion es un asiento en un equipo. El Delivery Manager la abre
 * al asignar la demanda (etapa 3) y la dedicacion se fija despues,
 * desde la vista Equipos. Esa dedicacion es lo que bloquea el cierre.
 */
export interface Position {
  id: string;
  teamId: string;
  /** Posicion abierta por una demanda, o plaza historica ya cubierta. */
  demandId: string | null;
  consultantId: string | null;
  role: ConsultantRole;
  seniority: Seniority;
  /** null = todavia sin dedicacion asignada. Se fija en la vista Equipos. */
  allocationPct: number | null;
  status: 'abierta' | 'cubierta';
  openedAt: string;
  coveredAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Consultores y su ciclo de vida                                      */
/* ------------------------------------------------------------------ */

export type LifecyclePhaseId =
  | 'onboarding'
  | 'ramp-up'
  | 'productivo'
  | 'evaluacion'
  | 'salida';

export type PhaseStatus = 'pendiente' | 'en-curso' | 'completada';

export interface PhaseRequirement {
  label: string;
  detail: string;
  /** Fecha ISO en la que se cumplio, o null si sigue pendiente. */
  completedAt: string | null;
}

export interface LifecyclePhase {
  id: LifecyclePhaseId;
  label: string;
  owner: RoleId;
  summary: string;
  status: PhaseStatus;
  startedAt: string | null;
  completedAt: string | null;
  requirements: PhaseRequirement[];
}

export type ConsultantOutcome = 'en-curso' | 'rotacion' | 'salida';

export interface Consultant {
  id: string;
  name: string;
  role: ConsultantRole;
  seniority: Seniority;
  teamId: string;
  demandId: string | null;
  initials: string;
  joinedAt: string;
  outcome: ConsultantOutcome;
  outcomeNote: string;
  phases: LifecyclePhase[];
}

/* ------------------------------------------------------------------ */
/* Traza de orquestacion                                               */
/* ------------------------------------------------------------------ */

export type OrchestrationEventKind =
  | 'demanda-creada'
  | 'entrega'
  | 'bloqueo'
  | 'borrador-ia'
  | 'dedicacion'
  | 'consultor-activo';

export interface OrchestrationEvent {
  id: string;
  at: string;
  demandId: string;
  demandCode: string;
  kind: OrchestrationEventKind;
  fromAgent: RoleId | null;
  toAgent: RoleId | null;
  fromStage: StageId | null;
  toStage: StageId | null;
  /** Titular corto del evento. */
  summary: string;
  /** Requisitos verificados (entrega) o incumplidos (bloqueo). */
  checks: string[];
}
