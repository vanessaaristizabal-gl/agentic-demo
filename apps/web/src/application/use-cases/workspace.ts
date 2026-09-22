import {
  inspect,
  type Consultant,
  type StaffingRequest,
  type Inspection,
  type OrchestrationEvent,
  type Position,
  type Team,
} from '@/domain';
import type { Container } from '../ports';

/** Fotografía completa del estado, tal y como la consumen las tres vistas. */
export interface Workspace {
  requests: StaffingRequest[];
  teams: Team[];
  positions: Position[];
  consultants: Consultant[];
  events: OrchestrationEvent[];
  /** Diagnóstico del orquestador para cada solicitud, indexado por id. */
  inspections: Record<string, Inspection>;
}

export async function loadWorkspace(container: Container): Promise<Workspace> {
  const [requests, teams, positions, consultants, events] = await Promise.all([
    container.requests.list(),
    container.teams.list(),
    container.positions.list(),
    container.consultants.list(),
    container.events.list(),
  ]);

  const inspections: Record<string, Inspection> = {};
  for (const request of requests) {
    inspections[request.id] = inspect({ request, teams, positions });
  }

  return {
    requests,
    teams,
    positions,
    consultants,
    events,
    inspections,
  };
}
