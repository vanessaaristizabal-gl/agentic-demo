import { STAGES } from './stages';
import type { RoleId, StageId } from './types';

/**
 * Cada rol de la consultora se modela como un agente del sistema:
 * tiene una bandeja, un conjunto de capacidades declaradas, una etapa
 * de la que es responsable y un unico destinatario al que entrega el trabajo.
 *
 * El orquestador (orchestrator.ts) es quien decide que agente esta activo
 * para cada demanda y registra cada entrega en la traza.
 */
export interface AgentDefinition {
  id: RoleId;
  name: string;
  /** Nombre del rol tal y como lo usa la empresa. */
  title: string;
  /** Etapa de la que es responsable. */
  owns: StageId;
  /** A quien entrega la demanda cuando termina. */
  handoffTo: RoleId | null;
  /** Que sabe hacer este agente. Se muestra en la ficha del rol. */
  capabilities: string[];
  /**
   * Como decide. Todo el sistema es determinista salvo el Recruiter,
   * que puede apoyarse en un modelo de lenguaje para redactar la vacante.
   */
  autonomy: 'determinista' | 'asistido-por-modelo';
  /** Dos letras para el avatar. */
  initials: string;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'sales',
    name: 'Sales',
    title: 'Ejecutivo comercial',
    owns: 'demanda',
    handoffTo: 'solution-architect',
    capabilities: [
      'Registrar la necesidad del cliente',
      'Encuadrar la demanda en una práctica',
      'Asignar centro de costo y modelo de facturacion',
    ],
    autonomy: 'determinista',
    initials: 'SA',
  },
  {
    id: 'solution-architect',
    name: 'Solution Architect',
    title: 'Arquitecto de soluciones',
    owns: 'perfil',
    handoffTo: 'delivery-manager',
    capabilities: [
      'Definir el perfil técnico',
      'Elegir stack dentro de la practica',
      'Fijar seniority, habilidades y nivel de inglés',
    ],
    autonomy: 'determinista',
    initials: 'SC',
  },
  {
    id: 'delivery-manager',
    name: 'Delivery Manager',
    title: 'Responsable de entrega',
    owns: 'equipo',
    handoffTo: 'recruiter',
    capabilities: [
      'Asignar la demanda a un equipo',
      'Abrir la posicion en el equipo',
      'Fijar la dedicación desde la vista Equipos',
    ],
    autonomy: 'determinista',
    initials: 'DM',
  },
  {
    id: 'recruiter',
    name: 'Recruiter',
    title: 'Reclutador técnico',
    owns: 'vacante',
    handoffTo: 'engineering-manager',
    capabilities: [
      'Publicar la vacante',
      'Redactar la descripción del puesto con ayuda de un modelo',
      'Elegir canales y banda salarial',
    ],
    autonomy: 'asistido-por-modelo',
    initials: 'RC',
  },
  {
    id: 'engineering-manager',
    name: 'Engineering Manager',
    title: 'Responsable de ingeniería',
    owns: 'entrevista',
    handoffTo: 'hr',
    capabilities: [
      'Evaluar técnicamente al candidato',
      'Puntuar y dejar feedback escrito',
      'Decidir contratación',
    ],
    autonomy: 'determinista',
    initials: 'EM',
  },
  {
    id: 'hr',
    name: 'Recursos Humanos',
    title: 'Gestión de personas',
    owns: 'onboarding',
    handoffTo: 'consultant',
    capabilities: [
      'Formalizar el contrato',
      'Entregar equipo de trabajo',
      'Gestionar accesos y asignar buddy',
    ],
    autonomy: 'determinista',
    initials: 'RH',
  },
  {
    id: 'consultant',
    name: 'Consultor',
    title: 'Desarrollador, QA o Tech Manager',
    owns: 'activo',
    handoffTo: null,
    capabilities: [
      'Incorporarse al equipo',
      'Recorrer ramp-up hasta ser productivo',
      'Ser evaluado y, en su caso, rotar',
    ],
    autonomy: 'determinista',
    initials: 'CO',
  },
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

export function agentName(id: RoleId): string {
  return agentById(id).name;
}
