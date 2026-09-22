import { STAGES } from './stages';
import type { RoleId, StageId } from './types';

/**
 * Cada rol de la consultora se modela como un agente del sistema: tiene una
 * bandeja, una etapa de la que es responsable y un unico destinatario al que
 * entrega el trabajo.
 *
 * Como en el resto del dominio, aqui no hay texto visible. El nombre, el cargo
 * y las capacidades se traducen en la presentacion a partir del identificador.
 */
export interface AgentDefinition {
  id: RoleId;
  /** Etapa de la que es responsable. */
  owns: StageId;
  /** A quien entrega la solicitud cuando termina. */
  handoffTo: RoleId | null;
  /**
   * Como decide. Todo el sistema es determinista salvo el Recruiter, que puede
   * apoyarse en un modelo de lenguaje para redactar la vacante.
   */
  autonomy: 'determinista' | 'asistido-por-modelo';
  /** Dos letras para el avatar. No se traducen: identifican al agente. */
  initials: string;
  /** Cuantas capacidades declara, para recorrerlas al traducirlas. */
  capabilityCount: number;
}

export const AGENTS: AgentDefinition[] = [
  { id: 'sales', owns: 'registro', handoffTo: 'solution-architect', autonomy: 'determinista', initials: 'SA', capabilityCount: 3 },
  { id: 'solution-architect', owns: 'perfil', handoffTo: 'delivery-manager', autonomy: 'determinista', initials: 'SC', capabilityCount: 3 },
  { id: 'delivery-manager', owns: 'equipo', handoffTo: 'recruiter', autonomy: 'determinista', initials: 'DM', capabilityCount: 3 },
  { id: 'recruiter', owns: 'vacante', handoffTo: 'engineering-manager', autonomy: 'asistido-por-modelo', initials: 'RC', capabilityCount: 3 },
  { id: 'engineering-manager', owns: 'entrevista', handoffTo: 'hr', autonomy: 'determinista', initials: 'EM', capabilityCount: 3 },
  { id: 'hr', owns: 'onboarding', handoffTo: 'consultant', autonomy: 'determinista', initials: 'RH', capabilityCount: 3 },
  { id: 'consultant', owns: 'activo', handoffTo: null, autonomy: 'determinista', initials: 'CO', capabilityCount: 3 },
];

const AGENT_BY_ID = new Map<RoleId, AgentDefinition>(AGENTS.map((agent) => [agent.id, agent]));
const AGENT_BY_STAGE = new Map<StageId, AgentDefinition>(
  STAGES.map((stage) => [stage.id, AGENT_BY_ID.get(stage.owner)!]),
);

export function agentById(id: RoleId): AgentDefinition {
  const found = AGENT_BY_ID.get(id);
  if (!found) throw new Error(`Agente desconocido: ${id}`);
  return found;
}

export function agentForStage(stage: StageId): AgentDefinition {
  const found = AGENT_BY_STAGE.get(stage);
  if (!found) throw new Error(`Etapa sin agente responsable: ${stage}`);
  return found;
}

/** `agents.<id>.name`, `.title` o `.capabilities.<n>`. */
export function agentKey(id: RoleId, part: 'name' | 'title'): string {
  return `agents.${id}.${part}`;
}

export function agentCapabilityKey(id: RoleId, index: number): string {
  return `agents.${id}.capabilities.${index}`;
}
