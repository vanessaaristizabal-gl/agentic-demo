import type { RoleId, StageId } from './types';

export interface StageDefinition {
  id: StageId;
  /** Posicion en el flujo, 0-indexada. */
  index: number;
  label: string;
  /** Rol responsable de la etapa: el agente que tiene la solicitud en su bandeja. */
  owner: RoleId;
  /** Que hace el responsable mientras la solicitud esta aqui. */
  purpose: string;
  /** Verbo del boton que avanza la solicitud desde esta etapa. */
  action: string;
}

/**
 * El flujo es determinista y lineal. No hay ramas ni saltos:
 * una solicitud solo pasa a la etapa siguiente, y solo cuando el usuario
 * lo pide explicitamente y se cumplen todos los requisitos acumulados.
 */
export const STAGES: StageDefinition[] = [
  {
    id: 'registro',
    index: 0,
    label: 'Registro',
    owner: 'sales',
    purpose: 'Sales registra la necesidad del cliente y la encuadra en una práctica.',
    action: 'Enviar a Solution Architect',
  },
  {
    id: 'perfil',
    index: 1,
    label: 'Perfil',
    owner: 'solution-architect',
    purpose: 'El Solution Architect traduce la necesidad a un perfil técnico concreto.',
    action: 'Enviar a Delivery Manager',
  },
  {
    id: 'equipo',
    index: 2,
    label: 'Equipo',
    owner: 'delivery-manager',
    purpose: 'El Delivery Manager asigna la solicitud a un equipo y abre la posicion.',
    action: 'Enviar a Recruiter',
  },
  {
    id: 'vacante',
    index: 3,
    label: 'Vacante',
    owner: 'recruiter',
    purpose: 'Recruiter publica la vacante con una descripción de puesto utilizable.',
    action: 'Enviar a Engineering Manager',
  },
  {
    id: 'entrevista',
    index: 4,
    label: 'Entrevista',
    owner: 'engineering-manager',
    purpose: 'El Engineering Manager evalúa al candidato y decide.',
    action: 'Enviar a Recursos Humanos',
  },
  {
    id: 'onboarding',
    index: 5,
    label: 'Onboarding',
    owner: 'hr',
    purpose: 'Recursos Humanos gestiona contrato, equipo y accesos.',
    action: 'Activar en el equipo',
  },
  {
    id: 'activo',
    index: 6,
    label: 'Activo',
    owner: 'consultant',
    purpose: 'El consultor queda trabajando en el equipo.',
    action: '',
  },
];

export const STAGE_ORDER: StageId[] = STAGES.map((stage) => stage.id);

const STAGE_BY_ID = new Map<StageId, StageDefinition>(STAGES.map((stage) => [stage.id, stage]));

export function stageDef(id: StageId): StageDefinition {
  const found = STAGE_BY_ID.get(id);
  if (!found) throw new Error(`Etapa desconocida: ${id}`);
  return found;
}

export function stageIndex(id: StageId): number {
  return stageDef(id).index;
}

export function stageLabel(id: StageId): string {
  return stageDef(id).label;
}

/** La etapa siguiente, o null si la solicitud ya esta en `activo`. */
export function nextStage(id: StageId): StageId | null {
  const index = stageIndex(id);
  return index >= STAGE_ORDER.length - 1 ? null : STAGE_ORDER[index + 1];
}

export function isFinalStage(id: StageId): boolean {
  return id === 'activo';
}

/** Todas las etapas hasta `id` incluida: la base de la acumulacion de requisitos. */
export function stagesUpTo(id: StageId): StageId[] {
  return STAGE_ORDER.slice(0, stageIndex(id) + 1);
}
