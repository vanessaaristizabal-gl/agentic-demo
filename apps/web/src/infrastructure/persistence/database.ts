import Dexie, { type Table } from 'dexie';
import type {
  Consultant,
  Demand,
  OrchestrationEvent,
  Position,
  Team,
} from '@/domain';

/**
 * Persistencia local en IndexedDB.
 *
 * Se usa IndexedDB y no localStorage ni sessionStorage: los datos son
 * estructurados, se consultan por índice y deben sobrevivir al cierre de la
 * pestaña. No hay servidor de datos ni login: todo vive en el navegador.
 */
export class ConsultancyDatabase extends Dexie {
  demands!: Table<Demand, string>;
  teams!: Table<Team, string>;
  positions!: Table<Position, string>;
  consultants!: Table<Consultant, string>;
  events!: Table<OrchestrationEvent, string>;

  constructor() {
    super('agentic-demo');
    this.version(1).stores({
      demands: 'id, code, stage, updatedAt',
      teams: 'id, practice',
      positions: 'id, teamId, demandId, consultantId, status',
      consultants: 'id, teamId, demandId, outcome',
      events: 'id, at, demandId, kind',
    });
  }
}

export const db = new ConsultancyDatabase();

/** Vacía la base y vuelve a sembrarla. Lo usa el botón «Reiniciar datos». */
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [db.demands, db.teams, db.positions, db.consultants, db.events],
    async () => {
      await Promise.all([
        db.demands.clear(),
        db.teams.clear(),
        db.positions.clear(),
        db.consultants.clear(),
        db.events.clear(),
      ]);
    },
  );
}
