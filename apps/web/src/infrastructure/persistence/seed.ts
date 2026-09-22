import {
  createRequest,
  initialPhases,
  initialsOf,
  type Consultant,
  type StaffingRequest,
  type LifecyclePhase,
  type OrchestrationEvent,
  type Position,
  type Team,
} from '@/domain';
import { db } from './database';

/**
 * Datos de arranque.
 *
 * Están pensados para una demo: hay una solicitud parada en cada etapa y cada
 * una tropieza con una regla distinta, para poder enseñarlas sin preparar
 * nada antes.
 */

const day = (offset: number): string => {
  const date = new Date('2026-09-22T09:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
};

const dateOnly = (offset: number): string => day(offset).slice(0, 10);

const TEAMS: Team[] = [
  {
    id: 'team-aurora',
    name: 'Equipo Aurora',
    clientName: 'Lakeside Bank',
    practice: 'digital-products',
    deliveryManager: 'Catalina Restrepo',
    capacityPct: 300,
  },
  {
    id: 'team-bitacora',
    name: 'Equipo Bitácora',
    clientName: 'Ridgefield Insurance',
    practice: 'quality-engineering',
    deliveryManager: 'Julián Betancur',
    capacityPct: 200,
  },
  {
    id: 'team-cardume',
    name: 'Equipo Cardume',
    clientName: 'Summit Retail Group',
    practice: 'cloud-data',
    deliveryManager: 'Paula Ossa',
    capacityPct: 400,
  },
  {
    id: 'team-delta',
    name: 'Equipo Delta',
    clientName: 'Blue Ridge Airlines',
    practice: 'ai-automation',
    deliveryManager: 'Mauricio Cadavid',
    capacityPct: 200,
  },
];

interface SeedConsultant {
  id: string;
  name: string;
  role: Consultant['role'];
  seniority: Consultant['seniority'];
  teamId: string;
  allocationPct: number;
  joinedOffset: number;
  /** Cuántas fases están completadas ya. */
  completedPhases: number;
  outcome: Consultant['outcome'];
  outcomeNote: string;
}

const SEED_CONSULTANTS: SeedConsultant[] = [
  {
    id: 'con-daniela-quintero',
    name: 'Daniela Quintero',
    role: 'desarrollador',
    seniority: 'senior',
    teamId: 'team-aurora',
    allocationPct: 100,
    joinedOffset: -190,
    completedPhases: 4,
    outcome: 'en-curso',
    outcomeNote: '',
  },
  {
    id: 'con-camilo-marin',
    name: 'Camilo Marín',
    role: 'qa',
    seniority: 'semi-senior',
    teamId: 'team-bitacora',
    allocationPct: 100,
    joinedOffset: -70,
    completedPhases: 2,
    outcome: 'en-curso',
    outcomeNote: '',
  },
  {
    id: 'con-sofia-loaiza',
    name: 'Sofía Loaiza',
    role: 'tech-manager',
    seniority: 'staff',
    teamId: 'team-cardume',
    allocationPct: 150,
    joinedOffset: -420,
    completedPhases: 5,
    outcome: 'rotacion',
    outcomeNote:
      'Rota al Equipo Delta en octubre para arrancar la práctica de automatización con el mismo cliente.',
  },
  {
    id: 'con-diego-naranjo',
    name: 'Diego Naranjo',
    role: 'desarrollador',
    seniority: 'junior',
    teamId: 'team-aurora',
    allocationPct: 100,
    joinedOffset: -25,
    completedPhases: 1,
    outcome: 'en-curso',
    outcomeNote: '',
  },
  {
    id: 'con-marcela-rueda',
    name: 'Marcela Rueda',
    role: 'desarrollador',
    seniority: 'staff',
    teamId: 'team-cardume',
    allocationPct: 100,
    joinedOffset: -330,
    completedPhases: 4,
    outcome: 'en-curso',
    outcomeNote: '',
  },
];

/** Marca las primeras `completed` fases como cumplidas y pone en curso la siguiente. */
function phasesWithProgress(completed: number, joinedOffset: number): LifecyclePhase[] {
  const phases = initialPhases(day(joinedOffset));
  return phases.map((phase, index) => {
    const completedAt = day(joinedOffset + (index + 1) * 28);
    if (index < completed) {
      return {
        ...phase,
        status: 'completada' as const,
        startedAt: day(joinedOffset + index * 28),
        completedAt,
        requirements: phase.requirements.map((requirement, position) => ({
          ...requirement,
          completedAt: day(joinedOffset + index * 28 + (position + 1) * 5),
        })),
      };
    }
    if (index === completed) {
      return {
        ...phase,
        status: 'en-curso' as const,
        startedAt: day(joinedOffset + index * 28),
        completedAt: null,
        requirements: phase.requirements.map((requirement, position) => ({
          ...requirement,
          // Dentro de la fase en curso, lo primero ya está hecho y lo demás no.
          completedAt: position === 0 ? day(joinedOffset + index * 28 + 4) : null,
        })),
      };
    }
    return { ...phase, status: 'pendiente' as const, startedAt: null, completedAt: null };
  });
}

function buildConsultants(): Consultant[] {
  return SEED_CONSULTANTS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    role: seed.role,
    seniority: seed.seniority,
    teamId: seed.teamId,
    requestId: null,
    initials: initialsOf(seed.name),
    joinedAt: day(seed.joinedOffset),
    outcome: seed.outcome,
    outcomeNote: seed.outcomeNote,
    phases: phasesWithProgress(seed.completedPhases, seed.joinedOffset),
  }));
}

function coveredPositions(): Position[] {
  return SEED_CONSULTANTS.map((seed, index) => ({
    id: `pos-cubierta-${index + 1}`,
    teamId: seed.teamId,
    requestId: null,
    consultantId: seed.id,
    role: seed.role,
    seniority: seed.seniority,
    allocationPct: seed.allocationPct,
    status: 'cubierta' as const,
    openedAt: day(seed.joinedOffset - 30),
    coveredAt: day(seed.joinedOffset),
  }));
}

/* ------------------------------------------------------------------ */
/* Solicitudes: una parada en cada etapa, cada una con su tropiezo         */
/* ------------------------------------------------------------------ */

function buildRequests(): { requests: StaffingRequest[]; positions: Position[] } {
  const positions: Position[] = [];

  const base = (id: string, code: string, offset: number): StaffingRequest =>
    createRequest({ id, code, now: day(offset) });

  // 1 · Etapa Solicitud — le falta el centro de costo, que no está marcado.
  const uno: StaffingRequest = {
    ...base('sol-001', 'SOL-2026-041', -3),
    intake: {
      clientName: 'City of Riverton',
      practice: 'digital-products',
      stack: '',
      costCenter: '',
      description:
        'Quieren rehacer el portal de trámites ciudadanos y necesitan reforzar el equipo de front.',
      expectedStart: dateOnly(30),
      billingModel: 'time-and-materials',
      priority: 'media',
    },
  };

  // 2 · Etapa Perfil — la práctica está puesta pero falta el stack que depende de ella.
  const dos: StaffingRequest = {
    ...base('sol-002', 'SOL-2026-042', -6),
    stage: 'perfil',
    stageEnteredAt: { registro: day(-6), perfil: day(-4) },
    intake: {
      clientName: 'Ridgefield Insurance',
      practice: 'quality-engineering',
      stack: '',
      costCenter: 'CC-2207',
      description:
        'La suite de regresión tarda seis horas y bloquea las liberaciones de los viernes.',
      expectedStart: dateOnly(21),
      billingModel: 'capacity',
      priority: 'alta',
    },
    profile: {
      seniority: 'semi-senior',
      consultantRole: 'qa',
      skills: ['Testing automatizado'],
      englishLevel: '',
      notes: 'El cliente pide experiencia previa en seguros.',
    },
  };

  // 3 · Etapa Equipo — perfil completo, sin equipo asignado todavía.
  const tres: StaffingRequest = {
    ...base('sol-003', 'SOL-2026-043', -9),
    stage: 'equipo',
    stageEnteredAt: { registro: day(-9), perfil: day(-8), equipo: day(-5) },
    intake: {
      clientName: 'Summit Retail Group',
      practice: 'cloud-data',
      stack: 'Databricks + Spark',
      costCenter: 'CC-3390',
      description:
        'Migración del almacén analítico y necesitan una persona que sostenga los pipelines diarios.',
      expectedStart: dateOnly(18),
      billingModel: 'time-and-materials',
      priority: 'alta',
    },
    profile: {
      seniority: 'senior',
      consultantRole: 'desarrollador',
      skills: ['Modelado de datos', 'CI/CD', 'Observabilidad'],
      englishLevel: 'B2',
      notes: '',
    },
  };

  // 4 · Etapa Vacante — sin descripción del puesto: es el caso de «Redactar con IA».
  const cuatro: StaffingRequest = {
    ...base('sol-004', 'SOL-2026-044', -14),
    stage: 'vacante',
    stageEnteredAt: {
      registro: day(-14),
      perfil: day(-12),
      equipo: day(-9),
      vacante: day(-6),
    },
    intake: {
      clientName: 'Lakeside Bank',
      practice: 'digital-products',
      stack: 'React + TypeScript',
      costCenter: 'CC-4410',
      description:
        'Refuerzo del equipo de canales digitales para sacar la nueva app de pagos antes de diciembre.',
      expectedStart: dateOnly(14),
      billingModel: 'time-and-materials',
      priority: 'alta',
    },
    profile: {
      seniority: 'senior',
      consultantRole: 'desarrollador',
      skills: ['CI/CD', 'Testing automatizado', 'Accesibilidad', 'Performance'],
      englishLevel: 'B2',
      notes: 'Trabajo directo con el equipo de diseño del banco.',
    },
    assignment: {
      teamId: 'team-aurora',
      joinDate: dateOnly(14),
      technicalReferent: 'Marcela Rueda',
    },
    vacancy: {
      title: 'Desarrollador Senior React — Lakeside Bank',
      jobDescription: '',
      channels: ['LinkedIn'],
      salaryBand: 'banda-3',
      draftSource: null,
      draftedAt: null,
    },
  };
  positions.push({
    id: 'pos-sol-004',
    teamId: 'team-aurora',
    requestId: 'sol-004',
    consultantId: null,
    role: 'desarrollador',
    seniority: 'senior',
    allocationPct: null,
    status: 'abierta',
    openedAt: day(-9),
    coveredAt: null,
  });

  // 5 · Etapa Entrevista — el referente técnico de la etapa 3 se borró:
  //     la etapa 5 sigue exigiéndolo.
  const cinco: StaffingRequest = {
    ...base('sol-005', 'SOL-2026-045', -22),
    stage: 'entrevista',
    stageEnteredAt: {
      registro: day(-22),
      perfil: day(-20),
      equipo: day(-17),
      vacante: day(-12),
      entrevista: day(-4),
    },
    intake: {
      clientName: 'Blue Ridge Airlines',
      practice: 'ai-automation',
      stack: 'Python + LangChain',
      costCenter: 'CC-5108',
      description:
        'Asistente interno para el centro de atención al pasajero: necesitan alguien que lo lleve a producción.',
      expectedStart: dateOnly(10),
      billingModel: 'precio-fijo',
      priority: 'critica',
    },
    profile: {
      seniority: 'senior',
      consultantRole: 'desarrollador',
      skills: ['Seguridad de aplicaciones', 'Observabilidad', 'Comunicación con cliente'],
      englishLevel: 'C1',
      notes: '',
    },
    assignment: {
      teamId: 'team-delta',
      joinDate: dateOnly(10),
      // Se quedó vacío al reorganizar el equipo. La etapa 5 lo vuelve a pedir.
      technicalReferent: '',
    },
    vacancy: {
      title: 'Desarrollador Senior de IA — Blue Ridge Airlines',
      jobDescription:
        'Buscamos un desarrollador senior para llevar a producción el asistente interno del centro de atención de Blue Ridge Airlines. El trabajo combina integración con sistemas existentes, evaluación de calidad de respuestas y puesta en marcha con observabilidad desde el primer día.',
      channels: ['LinkedIn', 'Referidos internos'],
      salaryBand: 'banda-4',
      draftSource: 'manual',
      draftedAt: day(-12),
    },
    interview: {
      candidateName: 'Sebastián Cifuentes',
      technicalScore: 8,
      decision: 'pendiente',
      feedback: '',
    },
  };
  positions.push({
    id: 'pos-sol-005',
    teamId: 'team-delta',
    requestId: 'sol-005',
    consultantId: null,
    role: 'desarrollador',
    seniority: 'senior',
    allocationPct: null,
    status: 'abierta',
    openedAt: day(-17),
    coveredAt: null,
  });

  // 6 · Etapa Onboarding — todo hecho salvo la dedicación, que se fija en Equipos.
  const seis: StaffingRequest = {
    ...base('sol-006', 'SOL-2026-046', -35),
    stage: 'onboarding',
    stageEnteredAt: {
      registro: day(-35),
      perfil: day(-33),
      equipo: day(-30),
      vacante: day(-24),
      entrevista: day(-12),
      onboarding: day(-5),
    },
    intake: {
      clientName: 'Ridgefield Insurance',
      practice: 'quality-engineering',
      stack: 'Playwright + TypeScript',
      costCenter: 'CC-2207',
      description:
        'Automatizar la regresión de pólizas para poder liberar dos veces por semana.',
      expectedStart: dateOnly(7),
      billingModel: 'capacity',
      priority: 'alta',
    },
    profile: {
      seniority: 'senior',
      consultantRole: 'qa',
      skills: ['Testing automatizado', 'CI/CD', 'Performance'],
      englishLevel: 'B2',
      notes: '',
    },
    assignment: {
      teamId: 'team-bitacora',
      joinDate: dateOnly(7),
      technicalReferent: 'Camilo Marín',
    },
    vacancy: {
      title: 'QA Automation Senior — Ridgefield Insurance',
      jobDescription:
        'Buscamos un QA senior para automatizar la regresión de pólizas de Ridgefield Insurance dentro del Equipo Bitácora. El objetivo es bajar la suite de seis horas a menos de una y sostenerla en cada liberación, trabajando codo a codo con el equipo de desarrollo del cliente.',
      channels: ['LinkedIn', 'Portal de empleo propio'],
      salaryBand: 'banda-3',
      draftSource: 'manual',
      draftedAt: day(-24),
    },
    interview: {
      candidateName: 'Valentina Escobar',
      technicalScore: 9,
      decision: 'contratar',
      feedback:
        'Resolvió el ejercicio de automatización con criterio y explicó bien por qué descartó las alternativas. Encaja con el equipo.',
    },
    onboarding: {
      contractType: 'indefinido',
      equipmentDelivered: true,
      accesses: ['Correo corporativo', 'Repositorio del cliente', 'VPN del cliente'],
      buddyName: 'Camilo Marín',
      startDate: dateOnly(7),
    },
  };
  positions.push({
    id: 'pos-sol-006',
    teamId: 'team-bitacora',
    requestId: 'sol-006',
    consultantId: null,
    role: 'qa',
    seniority: 'senior',
    // Sin dedicación: esto es lo que bloquea el cierre y se arregla en Equipos.
    allocationPct: null,
    status: 'abierta',
    openedAt: day(-30),
    coveredAt: null,
  });

  return { requests: [uno, dos, tres, cuatro, cinco, seis], positions };
}

function seedEvents(requests: StaffingRequest[]): OrchestrationEvent[] {
  return requests.map((request, index) => ({
    id: `evt-seed-${index + 1}`,
    at: request.createdAt,
    requestId: request.id,
    requestCode: request.code,
    kind: 'solicitud-creada' as const,
    fromAgent: null,
    toAgent: 'sales' as const,
    fromStage: null,
    toStage: 'registro' as const,
    summary: `Sales registra ${request.code} para ${request.intake.clientName}.`,
    checks: [],
  }));
}

/** Siembra la base solo si está vacía. Es idempotente. */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.teams.count();
  if (existing > 0) return;
  await seedNow();
}

/** Siembra sin preguntar. La usa el botón «Reiniciar datos». */
export async function seedNow(): Promise<void> {
  const { requests, positions } = buildRequests();
  const consultants = buildConsultants();
  const allPositions = [...coveredPositions(), ...positions];

  await db.transaction(
    'rw',
    [db.requests, db.teams, db.positions, db.consultants, db.events],
    async () => {
      await db.teams.bulkPut(TEAMS);
      await db.consultants.bulkPut(consultants);
      await db.positions.bulkPut(allPositions);
      await db.requests.bulkPut(requests);
      await db.events.bulkPut(seedEvents(requests));
    },
  );
}
