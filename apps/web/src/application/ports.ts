import type {
  Consultant,
  Demand,
  OrchestrationEvent,
  Position,
  Team,
} from '@/domain';

/**
 * Puertos de la capa de aplicación.
 *
 * Los casos de uso dependen de estas interfaces, nunca de Dexie ni de fetch.
 * La infraestructura las implementa y el contenedor las inyecta.
 */

export interface DemandRepository {
  list(): Promise<Demand[]>;
  get(id: string): Promise<Demand | undefined>;
  save(demand: Demand): Promise<void>;
  /** Siguiente código legible de demanda, del tipo DEM-2026-047. */
  nextCode(): Promise<string>;
}

export interface TeamRepository {
  list(): Promise<Team[]>;
}

export interface PositionRepository {
  list(): Promise<Position[]>;
  get(id: string): Promise<Position | undefined>;
  save(position: Position): Promise<void>;
  saveMany(positions: Position[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ConsultantRepository {
  list(): Promise<Consultant[]>;
  get(id: string): Promise<Consultant | undefined>;
  save(consultant: Consultant): Promise<void>;
}

export interface EventRepository {
  list(limit?: number): Promise<OrchestrationEvent[]>;
  append(events: OrchestrationEvent[]): Promise<void>;
}

/** Entrada del generador de descripciones de puesto. */
export interface DraftInput {
  clientName: string;
  practice: string;
  stack: string;
  seniority: string;
  consultantRole: string;
  englishLevel: string;
  skills: string[];
  teamName: string;
  vacancyTitle: string;
  context: string;
}

export interface DraftOutcome {
  description: string;
  /** De dónde salió el texto: del servidor, del modelo del navegador o de la reserva. */
  source: 'anthropic' | 'gemini-nano' | 'reserva';
  model: string | null;
  /** Explicación legible cuando no se pudo usar el modelo del servidor. */
  reason: string | null;
}

export interface DraftPort {
  draft(input: DraftInput): Promise<DraftOutcome>;
}

/** Reloj e identificadores, para que los casos de uso no dependan de globals. */
export interface SystemPort {
  now(): string;
  id(prefix: string): string;
}

export interface Container {
  demands: DemandRepository;
  teams: TeamRepository;
  positions: PositionRepository;
  consultants: ConsultantRepository;
  events: EventRepository;
  drafts: DraftPort;
  system: SystemPort;
}
