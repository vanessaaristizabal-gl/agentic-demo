import type { RoleId, StageId } from './types';

export interface StageDefinition {
  id: StageId;
  /** Posicion en el flujo, 0-indexada. */
  index: number;
  /** Rol responsable de la etapa: el agente que tiene la solicitud en su bandeja. */
  owner: RoleId;
}

/**
 * Claves de traduccion de una etapa. El dominio no guarda texto visible:
 * `stages.<id>.label` es el nombre, `.purpose` lo que hace el responsable
 * mientras la solicitud esta aqui, y `.action` el verbo del boton que la
 * entrega a la etapa siguiente.
 */
export function stageKey(id: StageId, part: 'label' | 'purpose' | 'action'): string {
  return `stages.${id}.${part}`;
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
    owner: 'sales',
  },
  {
    id: 'perfil',
    index: 1,
    owner: 'solution-architect',
  },
  {
    id: 'equipo',
    index: 2,
    owner: 'delivery-manager',
  },
  {
    id: 'vacante',
    index: 3,
    owner: 'recruiter',
  },
  {
    id: 'entrevista',
    index: 4,
    owner: 'engineering-manager',
  },
  {
    id: 'onboarding',
    index: 5,
    owner: 'hr',
  },
  {
    id: 'activo',
    index: 6,
    owner: 'consultant',
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
