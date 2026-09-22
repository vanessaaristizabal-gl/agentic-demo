import { describe, expect, it } from 'vitest';
import { createDemand, type Demand, type Position, type Team } from './entities';
import { advance, inspect } from './orchestrator';
import type { EvaluationContext } from './requirements';
import { STAGE_ORDER } from './stages';

const ports = {
  now: () => '2026-03-01T10:00:00.000Z',
  id: (prefix: string) => `${prefix}-test`,
};

const team: Team = {
  id: 'team-1',
  name: 'Equipo Aurora',
  clientName: 'Banco Andino',
  practice: 'digital-products',
  deliveryManager: 'Lucía Ferrer',
  capacityPct: 300,
};

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: 'pos-1',
    teamId: 'team-1',
    demandId: 'dem-1',
    consultantId: null,
    role: 'desarrollador',
    seniority: 'senior',
    allocationPct: null,
    status: 'abierta',
    openedAt: '2026-02-01T00:00:00.000Z',
    coveredAt: null,
    ...overrides,
  };
}

function completeDemand(): Demand {
  const demand = createDemand({ id: 'dem-1', code: 'DEM-2026-001', now: '2026-02-01T00:00:00.000Z' });
  return {
    ...demand,
    intake: {
      clientName: 'Banco Andino',
      practice: 'digital-products',
      stack: 'React + TypeScript',
      costCenter: 'CC-4410',
      description: 'Refuerzo del equipo de canales digitales.',
      expectedStart: '2026-03-15',
      billingModel: 'time-and-materials',
      priority: 'alta',
    },
    profile: {
      seniority: 'senior',
      consultantRole: 'desarrollador',
      skills: ['CI/CD', 'Testing automatizado', 'Performance'],
      englishLevel: 'B2',
      notes: '',
    },
    assignment: {
      teamId: 'team-1',
      joinDate: '2026-03-15',
      technicalReferent: 'Marta Ruiz',
    },
    vacancy: {
      title: 'Desarrollador Senior React',
      jobDescription: 'x'.repeat(200),
      channels: ['LinkedIn'],
      salaryBand: 'banda-3',
      draftSource: 'manual',
      draftedAt: null,
    },
    interview: {
      candidateName: 'Ana Pardo',
      technicalScore: 8,
      decision: 'contratar',
      feedback: 'Resolvió el ejercicio con soltura y explicó bien sus decisiones técnicas.',
    },
    onboarding: {
      contractType: 'indefinido',
      equipmentDelivered: true,
      accesses: ['Correo corporativo', 'Repositorio del cliente', 'VPN del cliente'],
      buddyName: 'Marta Ruiz',
      startDate: '2026-03-15',
    },
  };
}

function ctx(demand: Demand, positions: Position[] = [position()]): EvaluationContext {
  return { demand, teams: [team], positions };
}

describe('formulario de la demanda', () => {
  it('bloquea por el centro de costo aunque el formulario no lo marque', () => {
    const demand = { ...completeDemand(), intake: { ...completeDemand().intake, costCenter: '' } };
    const result = inspect(ctx({ ...demand, stage: 'demanda' }));
    expect(result.canAdvance).toBe(false);
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['intake.cost-center']);
  });

  it('nombra en un solo mensaje todo lo que falta', () => {
    const demand = createDemand({ id: 'dem-1', code: 'DEM-2026-002', now: '2026-02-01T00:00:00.000Z' });
    const result = inspect(ctx(demand, []));
    expect(result.missing).toHaveLength(3);
    expect(result.report?.items).toHaveLength(3);
    expect(result.report?.text.split('\n').length).toBeGreaterThan(3);
  });
});

describe('acumulación de requisitos', () => {
  it('la etapa 5 sigue exigiendo lo que pidió la 3', () => {
    const base = completeDemand();
    const demand: Demand = {
      ...base,
      stage: 'entrevista',
      assignment: { ...base.assignment, technicalReferent: '' },
    };
    const result = inspect(ctx(demand));
    expect(result.canAdvance).toBe(false);
    const ids = result.missing.map((check) => check.requirement.id);
    expect(ids).toContain('assignment.referent');
    expect(result.missing.every((check) => check.inherited)).toBe(true);
  });

  it('liberar la posición desde Equipos rompe el requisito de la etapa 3', () => {
    const demand = { ...completeDemand(), stage: 'entrevista' as const };
    const result = inspect(ctx(demand, []));
    expect(result.missing.map((check) => check.requirement.id)).toContain('assignment.team');
  });
});

describe('cierre de la última etapa', () => {
  it('se bloquea mientras la dedicación no se fije en la vista Equipos', () => {
    const demand = { ...completeDemand(), stage: 'onboarding' as const };
    const result = inspect(ctx(demand));
    expect(result.canAdvance).toBe(false);
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['team.allocation']);
    expect(result.report?.aside).toContain('vista Equipos');
  });

  it('se bloquea si la dedicación supera la capacidad del equipo', () => {
    const demand = { ...completeDemand(), stage: 'onboarding' as const };
    const positions = [
      position({ allocationPct: 100 }),
      position({ id: 'pos-2', demandId: null, allocationPct: 250 }),
    ];
    const result = inspect(ctx(demand, positions));
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['team.capacity']);
    expect(result.report?.items[0].sentence).toContain('350');
  });

  it('activa al consultor cuando todo está cumplido', () => {
    const demand = { ...completeDemand(), stage: 'onboarding' as const };
    const result = advance(ctx(demand, [position({ allocationPct: 100 })]), ports);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transaction.demand.stage).toBe('activo');
    expect(result.transaction.consultant?.name).toBe('Ana Pardo');
    expect(result.transaction.positions[0].status).toBe('cubierta');
  });
});

describe('flujo completo', () => {
  it('recorre las siete etapas de forma determinista', () => {
    let demand = completeDemand();
    const positions = [position({ allocationPct: 80 })];
    const visited = [demand.stage];

    while (demand.stage !== 'activo') {
      const result = advance(ctx(demand, positions), ports);
      expect(result.ok).toBe(true);
      if (!result.ok) break;
      demand = result.transaction.demand;
      visited.push(demand.stage);
    }

    expect(visited).toEqual(STAGE_ORDER);
  });
});
