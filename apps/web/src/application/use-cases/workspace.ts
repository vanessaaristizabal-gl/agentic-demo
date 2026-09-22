import {
  buildInboxes,
  inspect,
  type AgentInbox,
  type Consultant,
  type Demand,
  type Inspection,
  type OrchestrationEvent,
  type Position,
  type Team,
} from '@/domain';
import type { Container } from '../ports';

/** Fotografía completa del estado, tal y como la consumen las tres vistas. */
export interface Workspace {
  demands: Demand[];
  teams: Team[];
  positions: Position[];
  consultants: Consultant[];
  events: OrchestrationEvent[];
  inboxes: AgentInbox[];
  /** Diagnóstico del orquestador para cada demanda, indexado por id. */
  inspections: Record<string, Inspection>;
}

export async function loadWorkspace(container: Container): Promise<Workspace> {
  const [demands, teams, positions, consultants, events] = await Promise.all([
    container.demands.list(),
    container.teams.list(),
    container.positions.list(),
    container.consultants.list(),
    container.events.list(),
  ]);

  const inspections: Record<string, Inspection> = {};
  for (const demand of demands) {
    inspections[demand.id] = inspect({ demand, teams, positions });
  }

  return {
    demands,
    teams,
    positions,
    consultants,
    events,
    inboxes: buildInboxes(demands, teams, positions),
    inspections,
  };
}
