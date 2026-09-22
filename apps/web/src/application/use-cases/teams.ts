import { allocatedPct, type Position, type Team } from '@/domain';
import type { Container } from '../ports';

/**
 * La dedicación se fija aquí, desde la vista Equipos, y no en la demanda.
 * Es lo que bloquea la última etapa del flujo.
 */
export async function setPositionAllocation(
  container: Container,
  positionId: string,
  allocationPct: number | null,
): Promise<void> {
  const position = await container.positions.get(positionId);
  if (!position) throw new Error(`No existe la posición ${positionId}.`);

  await container.positions.save({ ...position, allocationPct });

  if (position.demandId) {
    const demand = await container.demands.get(position.demandId);
    if (demand) {
      await container.events.append([
        {
          id: container.system.id('evt'),
          at: container.system.now(),
          demandId: demand.id,
          demandCode: demand.code,
          kind: 'dedicacion',
          fromAgent: 'delivery-manager',
          toAgent: 'delivery-manager',
          fromStage: demand.stage,
          toStage: demand.stage,
          summary:
            allocationPct === null
              ? `Delivery Manager retira la dedicación de la posición de ${demand.code}.`
              : `Delivery Manager fija la dedicación de ${demand.code} en ${allocationPct} puntos.`,
          checks: [],
        },
      ]);
    }
  }
}

/** Libera una posición abierta. Rompe el requisito de la etapa Equipo. */
export async function releasePosition(container: Container, positionId: string): Promise<void> {
  const position = await container.positions.get(positionId);
  if (!position) return;
  await container.positions.remove(positionId);

  if (position.demandId) {
    const demand = await container.demands.get(position.demandId);
    if (demand) {
      await container.events.append([
        {
          id: container.system.id('evt'),
          at: container.system.now(),
          demandId: demand.id,
          demandCode: demand.code,
          kind: 'bloqueo',
          fromAgent: 'delivery-manager',
          toAgent: null,
          fromStage: demand.stage,
          toStage: null,
          summary: `Se liberó la posición de ${demand.code}: la demanda vuelve a necesitar equipo.`,
          checks: [],
        },
      ]);
    }
  }
}

export interface TeamOccupancy {
  team: Team;
  positions: Position[];
  covered: Position[];
  open: Position[];
  /** Dedicación comprometida sobre la capacidad del equipo. */
  used: number;
  free: number;
  overCapacity: boolean;
  /** Posiciones abiertas sin dedicación fijada. */
  withoutAllocation: number;
}

export function buildOccupancy(teams: Team[], positions: Position[]): TeamOccupancy[] {
  return teams.map((team) => {
    const teamPositions = positions.filter((position) => position.teamId === team.id);
    const used = allocatedPct(positions, team.id);
    return {
      team,
      positions: teamPositions,
      covered: teamPositions.filter((position) => position.status === 'cubierta'),
      open: teamPositions.filter((position) => position.status === 'abierta'),
      used,
      free: team.capacityPct - used,
      overCapacity: used > team.capacityPct,
      withoutAllocation: teamPositions.filter(
        (position) => position.status === 'abierta' && position.allocationPct === null,
      ).length,
    };
  });
}
