import { STAGES, stageLabel, type StageId } from '@/domain';
import type { Workspace } from './workspace';

/**
 * Métricas del tablero.
 *
 * Se calculan aquí, en la capa de aplicación, a partir del diagnóstico que ya
 * produjo el orquestador para cada demanda. La presentación solo las pinta.
 */

export interface StageBlockers {
  stage: StageId;
  label: string;
  /** Requisitos sin cumplir que introdujo esta etapa, sumando todas las demandas. */
  count: number;
  /** Cuántas demandas distintas están frenadas por algo que pidió esta etapa. */
  demands: number;
}

export interface FlowMetrics {
  /** Demandas que todavía recorren el flujo, sin contar las cerradas. */
  inFlight: number;
  /** Demandas que hoy podrían entregarse al siguiente rol. */
  ready: number;
  /** Demandas que hoy no pueden avanzar. */
  blocked: number;
  /** Demandas ya cerradas con el consultor trabajando. */
  closed: number;
  activeConsultants: number;
  openPositions: number;
  positionsWithoutAllocation: number;
  /** Total de requisitos sin cumplir en todo el flujo. */
  totalBlockers: number;
  /** Requisitos sin cumplir agrupados por la etapa que los pide. */
  blockersByStage: StageBlockers[];
}

export function buildFlowMetrics(workspace: Workspace): FlowMetrics {
  const counts = new Map<StageId, { count: number; demands: Set<string> }>(
    STAGES.map((stage) => [stage.id, { count: 0, demands: new Set<string>() }]),
  );

  let inFlight = 0;
  let ready = 0;
  let blocked = 0;
  let closed = 0;
  let totalBlockers = 0;

  for (const demand of workspace.demands) {
    const inspection = workspace.inspections[demand.id];
    if (!inspection) continue;

    if (inspection.isFinal) {
      closed += 1;
      continue;
    }

    inFlight += 1;
    if (inspection.canAdvance) ready += 1;
    else blocked += 1;

    for (const check of inspection.missing) {
      totalBlockers += 1;
      const bucket = counts.get(check.requirement.stage);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.demands.add(demand.id);
    }
  }

  const blockersByStage: StageBlockers[] = STAGES.map((stage) => {
    const bucket = counts.get(stage.id)!;
    return {
      stage: stage.id,
      label: stageLabel(stage.id),
      count: bucket.count,
      demands: bucket.demands.size,
    };
  }).filter((entry) => entry.count > 0);

  return {
    inFlight,
    ready,
    blocked,
    closed,
    activeConsultants: workspace.consultants.filter(
      (consultant) => consultant.outcome === 'en-curso',
    ).length,
    openPositions: workspace.positions.filter((position) => position.status === 'abierta').length,
    positionsWithoutAllocation: workspace.positions.filter(
      (position) => position.status === 'abierta' && position.allocationPct === null,
    ).length,
    totalBlockers,
    blockersByStage,
  };
}
