import {
  createDemand,
  initialPhases,
  initialsOf,
  type Consultant,
  type Demand,
  type LifecyclePhase,
  type OrchestrationEvent,
  type Position,
  type Team,
} from '@/domain';
import { db } from './database';

/**
 * Datos de arranque.
 *
 * Están pensados para una demo: hay una demanda parada en cada etapa y cada
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
    clientName: 'Banco Andino',
    practice: 'digital-products',
    deliveryManager: 'Lucía Ferrer',
    capacityPct: 300,
  },
  {
    id: 'team-bitacora',
    name: 'Equipo Bitácora',
    clientName: 'Seguros del Sur',
    practice: 'quality-engineering',
    deliveryManager: 'Iván Cortés',
    capacityPct: 200,
  },
  {
    id: 'team-cardume',
    name: 'Equipo Cardume',
    clientName: 'Retail Norte',
    practice: 'cloud-data',
    deliveryManager: 'Paula Nieto',
    capacityPct: 400,
  },
  {
    id: 'team-delta',
    name: 'Equipo Delta',
    clientName: 'Aerolínea Pacífico',
    practice: 'ai-automation',
    deliveryManager: 'Rubén Salas',
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
    id: 'con-ana-pardo',
    name: 'Ana Pardo',
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
    id: 'con-hugo-marin',
    name: 'Hugo Marín',
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
    id: 'con-sofia-leiva',
    name: 'Sofía Leiva',
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
    id: 'con-diego-navas',
    name: 'Diego Navas',
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
    id: 'con-marta-ruiz',
    name: 'Marta Ruiz',
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
    demandId: null,
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
    demandId: null,
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
/* Demandas: una parada en cada etapa, cada una con su tropiezo         */
/* ------------------------------------------------------------------ */

function buildDemands(): { demands: Demand[]; positions: Position[] } {
  const positions: Position[] = [];

  const base = (id: string, code: string, offset: number): Demand =>
    createDemand({ id, code, now: day(offset) });

  // 1 · Etapa Demanda — le falta el centro de costo, que no está marcado.
  const uno: Demand = {
    ...base('dem-001', 'DEM-2026-041', -3),
    intake: {
      clientName: 'Municipalidad de Valle Alto',
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
  const dos: Demand = {
    ...base('dem-002', 'DEM-2026-042', -6),
    stage: 'perfil',
    stageEnteredAt: { demanda: day(-6), perfil: day(-4) },
    intake: {
      clientName: 'Seguros del Sur',
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
  const tres: Demand = {
    ...base('dem-003', 'DEM-2026-043', -9),
    stage: 'equipo',
    stageEnteredAt: { demanda: day(-9), perfil: day(-8), equipo: day(-5) },
    intake: {
      clientName: 'Retail Norte',
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
  const cuatro: Demand = {
    ...base('dem-004', 'DEM-2026-044', -14),
    stage: 'vacante',
    stageEnteredAt: {
      demanda: day(-14),
      perfil: day(-12),
      equipo: day(-9),
      vacante: day(-6),
    },
    intake: {
      clientName: 'Banco Andino',
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
      technicalReferent: 'Marta Ruiz',
    },
    vacancy: {
      title: 'Desarrollador Senior React — Banco Andino',
      jobDescription: '',
      channels: ['LinkedIn'],
      salaryBand: 'banda-3',
      draftSource: null,
      draftedAt: null,
    },
  };
  positions.push({
    id: 'pos-dem-004',
    teamId: 'team-aurora',
    demandId: 'dem-004',
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
  const cinco: Demand = {
    ...base('dem-005', 'DEM-2026-045', -22),
    stage: 'entrevista',
    stageEnteredAt: {
      demanda: day(-22),
      perfil: day(-20),
      equipo: day(-17),
      vacante: day(-12),
      entrevista: day(-4),
    },
    intake: {
      clientName: 'Aerolínea Pacífico',
      practice: 'ai-automation',
      stack: 'Python + LangChain',
      costCenter: 'CC-5108',
      description:
        'Asistente interno para el centro de atención: necesitan alguien que lo lleve a producción.',
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
      title: 'Desarrollador Senior de IA — Aerolínea Pacífico',
      jobDescription:
        'Buscamos un desarrollador senior para llevar a producción el asistente interno del centro de atención de Aerolínea Pacífico. El trabajo combina integración con sistemas existentes, evaluación de calidad de respuestas y puesta en marcha con observabilidad desde el primer día.',
      channels: ['LinkedIn', 'Referidos internos'],
      salaryBand: 'banda-4',
      draftSource: 'manual',
      draftedAt: day(-12),
    },
    interview: {
      candidateName: 'Bruno Cifuentes',
      technicalScore: 8,
      decision: 'pendiente',
      feedback: '',
    },
  };
  positions.push({
    id: 'pos-dem-005',
    teamId: 'team-delta',
    demandId: 'dem-005',
    consultantId: null,
    role: 'desarrollador',
    seniority: 'senior',
    allocationPct: null,
    status: 'abierta',
    openedAt: day(-17),
    coveredAt: null,
  });

  // 6 · Etapa Onboarding — todo hecho salvo la dedicación, que se fija en Equipos.
  const seis: Demand = {
    ...base('dem-006', 'DEM-2026-046', -35),
    stage: 'onboarding',
    stageEnteredAt: {
      demanda: day(-35),
      perfil: day(-33),
      equipo: day(-30),
      vacante: day(-24),
      entrevista: day(-12),
      onboarding: day(-5),
    },
    intake: {
      clientName: 'Seguros del Sur',
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
      technicalReferent: 'Hugo Marín',
    },
    vacancy: {
      title: 'QA Automation Senior — Seguros del Sur',
      jobDescription:
        'Buscamos un QA senior para automatizar la regresión de pólizas de Seguros del Sur dentro del Equipo Bitácora. El objetivo es bajar la suite de seis horas a menos de una y sostenerla en cada liberación, trabajando codo a codo con el equipo de desarrollo del cliente.',
      channels: ['LinkedIn', 'Portal de empleo propio'],
      salaryBand: 'banda-3',
      draftSource: 'manual',
      draftedAt: day(-24),
    },
    interview: {
      candidateName: 'Elena Vidal',
      technicalScore: 9,
      decision: 'contratar',
      feedback:
        'Resolvió el ejercicio de automatización con criterio y explicó bien por qué descartó las alternativas. Encaja con el equipo.',
    },
    onboarding: {
      contractType: 'indefinido',
      equipmentDelivered: true,
      accesses: ['Correo corporativo', 'Repositorio del cliente', 'VPN del cliente'],
      buddyName: 'Hugo Marín',
      startDate: dateOnly(7),
    },
  };
  positions.push({
    id: 'pos-dem-006',
    teamId: 'team-bitacora',
    demandId: 'dem-006',
    consultantId: null,
    role: 'qa',
    seniority: 'senior',
    // Sin dedicación: esto es lo que bloquea el cierre y se arregla en Equipos.
    allocationPct: null,
    status: 'abierta',
    openedAt: day(-30),
    coveredAt: null,
  });

  return { demands: [uno, dos, tres, cuatro, cinco, seis], positions };
}

function seedEvents(demands: Demand[]): OrchestrationEvent[] {
  return demands.map((demand, index) => ({
    id: `evt-seed-${index + 1}`,
    at: demand.createdAt,
    demandId: demand.id,
    demandCode: demand.code,
    kind: 'demanda-creada' as const,
    fromAgent: null,
    toAgent: 'sales' as const,
    fromStage: null,
    toStage: 'demanda' as const,
    summary: `Sales registra ${demand.code} para ${demand.intake.clientName}.`,
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
  const { demands, positions } = buildDemands();
  const consultants = buildConsultants();
  const allPositions = [...coveredPositions(), ...positions];

  await db.transaction(
    'rw',
    [db.demands, db.teams, db.positions, db.consultants, db.events],
    async () => {
      await db.teams.bulkPut(TEAMS);
      await db.consultants.bulkPut(consultants);
      await db.positions.bulkPut(allPositions);
      await db.demands.bulkPut(demands);
      await db.events.bulkPut(seedEvents(demands));
    },
  );
}
