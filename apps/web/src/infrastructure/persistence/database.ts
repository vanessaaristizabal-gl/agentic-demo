import Dexie, { type Table } from 'dexie';
import type {
  Consultant,
  StaffingRequest,
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
  requests!: Table<StaffingRequest, string>;
  teams!: Table<Team, string>;
  positions!: Table<Position, string>;
  consultants!: Table<Consultant, string>;
  events!: Table<OrchestrationEvent, string>;

  constructor() {
    super('agentic-demo');

    // v1 — la entidad se llamaba «demanda» y la etapa 1, «Demanda».
    this.version(1).stores({
      demands: 'id, code, stage, updatedAt',
      teams: 'id, practice',
      positions: 'id, teamId, demandId, consultantId, status',
      consultants: 'id, teamId, demandId, outcome',
      events: 'id, at, demandId, kind',
    });

    // v2 — pasa a llamarse «solicitud» y la etapa 1, «Registro».
    // Los registros de v1 usan otro vocabulario en los datos, no solo en los
    // índices, así que no se migran campo a campo: se descarta el almacén
    // antiguo y se vuelve a sembrar al arrancar.
    this.version(2)
      .stores({
        demands: null,
        requests: 'id, code, stage, updatedAt',
        teams: 'id, practice',
        positions: 'id, teamId, requestId, consultantId, status',
        consultants: 'id, teamId, requestId, outcome',
        events: 'id, at, requestId, kind',
      })
      .upgrade(async (tx) => {
        await Promise.all([
          tx.table('teams').clear(),
          tx.table('positions').clear(),
          tx.table('consultants').clear(),
          tx.table('events').clear(),
        ]);
      });
  }
}

export const db = new ConsultancyDatabase();

/** Vacía la base y vuelve a sembrarla. Lo usa el botón «Reiniciar datos». */
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [db.requests, db.teams, db.positions, db.consultants, db.events],
    async () => {
      await Promise.all([
        db.requests.clear(),
        db.teams.clear(),
        db.positions.clear(),
        db.consultants.clear(),
        db.events.clear(),
      ]);
    },
  );
}
