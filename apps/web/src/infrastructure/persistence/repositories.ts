import type {
  ConsultantRepository,
  RequestRepository,
  EventRepository,
  PositionRepository,
  TeamRepository,
} from '@/application/ports';
import type { Consultant, StaffingRequest, OrchestrationEvent, Position, Team } from '@/domain';
import { db } from './database';

/** Implementaciones de los puertos de persistencia sobre IndexedDB. */

export const requestRepository: RequestRepository = {
  async list(): Promise<StaffingRequest[]> {
    const requests = await db.requests.toArray();
    return requests.sort((a, b) => a.code.localeCompare(b.code));
  },
  get(id: string): Promise<StaffingRequest | undefined> {
    return db.requests.get(id);
  },
  async save(request: StaffingRequest): Promise<void> {
    await db.requests.put(request);
  },
  async nextCode(): Promise<string> {
    const requests = await db.requests.toArray();
    const year = new Date().getFullYear();
    const highest = requests.reduce((max, request) => {
      const match = /^SOL-\d{4}-(\d+)$/.exec(request.code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `SOL-${year}-${String(highest + 1).padStart(3, '0')}`;
  },
};

export const teamRepository: TeamRepository = {
  async list(): Promise<Team[]> {
    const teams = await db.teams.toArray();
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  },
};

export const positionRepository: PositionRepository = {
  list(): Promise<Position[]> {
    return db.positions.toArray();
  },
  get(id: string): Promise<Position | undefined> {
    return db.positions.get(id);
  },
  async save(position: Position): Promise<void> {
    await db.positions.put(position);
  },
  async saveMany(positions: Position[]): Promise<void> {
    if (positions.length === 0) return;
    await db.positions.bulkPut(positions);
  },
  async remove(id: string): Promise<void> {
    await db.positions.delete(id);
  },
};

export const consultantRepository: ConsultantRepository = {
  async list(): Promise<Consultant[]> {
    const consultants = await db.consultants.toArray();
    return consultants.sort((a, b) => a.name.localeCompare(b.name));
  },
  get(id: string): Promise<Consultant | undefined> {
    return db.consultants.get(id);
  },
  async save(consultant: Consultant): Promise<void> {
    await db.consultants.put(consultant);
  },
};

export const eventRepository: EventRepository = {
  async list(limit = 60): Promise<OrchestrationEvent[]> {
    const events = await db.events.orderBy('at').reverse().limit(limit).toArray();
    return events;
  },
  async append(events: OrchestrationEvent[]): Promise<void> {
    if (events.length === 0) return;
    await db.events.bulkPut(events);
  },
};
