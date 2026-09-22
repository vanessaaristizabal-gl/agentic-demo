import { describe, expect, it } from 'vitest';
import { createRequest, type StaffingRequest, type Position, type Team } from './entities';
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
  clientName: 'Lakeside Bank',
  practice: 'digital-products',
  deliveryManager: 'Catalina Restrepo',
  capacityPct: 300,
};

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: 'pos-1',
    teamId: 'team-1',
    requestId: 'dem-1',
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

function completeRequest(): StaffingRequest {
  const request = createRequest({ id: 'dem-1', code: 'SOL-2026-001', now: '2026-02-01T00:00:00.000Z' });
  return {
    ...request,
    intake: {
      clientName: 'Lakeside Bank',
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
      skills: ['ci-cd', 'automated-testing', 'performance'],
      englishLevel: 'B2',
      notes: '',
    },
    assignment: {
      teamId: 'team-1',
      joinDate: '2026-03-15',
      technicalReferent: 'Marcela Rueda',
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
      candidateName: 'Daniela Quintero',
      technicalScore: 8,
      decision: 'contratar',
      feedback: 'Resolvió el ejercicio con soltura y explicó bien sus decisiones técnicas.',
    },
    onboarding: {
      contractType: 'indefinido',
      equipmentDelivered: true,
      accesses: ['corporate-email', 'client-repository', 'client-vpn'],
      buddyName: 'Marcela Rueda',
      startDate: '2026-03-15',
    },
  };
}

function ctx(request: StaffingRequest, positions: Position[] = [position()]): EvaluationContext {
  return { request, teams: [team], positions };
}

describe('formulario de la solicitud', () => {
  it('bloquea por el centro de costo aunque el formulario no lo marque', () => {
    const request = { ...completeRequest(), intake: { ...completeRequest().intake, costCenter: '' } };
    const result = inspect(ctx({ ...request, stage: 'registro' }));
    expect(result.canAdvance).toBe(false);
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['intake.cost-center']);
  });

  it('nombra en un solo mensaje todo lo que falta', () => {
    const request = createRequest({ id: 'dem-1', code: 'SOL-2026-002', now: '2026-02-01T00:00:00.000Z' });
    const result = inspect(ctx(request, []));
    expect(result.missing).toHaveLength(3);
    // Un solo informe que nombra las tres cosas de una vez, cada una con la
    // clave de su explicación y la etapa que la pide.
    expect(result.report?.items).toHaveLength(3);
    expect(result.report?.headline.params?.count).toBe(3);
    expect(result.report?.items.every((item) => item.message.key.length > 0)).toBe(true);
  });
});

describe('acumulación de requisitos', () => {
  it('la etapa 5 sigue exigiendo lo que pidió la 3', () => {
    const base = completeRequest();
    const request: StaffingRequest = {
      ...base,
      stage: 'entrevista',
      assignment: { ...base.assignment, technicalReferent: '' },
    };
    const result = inspect(ctx(request));
    expect(result.canAdvance).toBe(false);
    const ids = result.missing.map((check) => check.requirement.id);
    expect(ids).toContain('assignment.referent');
    expect(result.missing.every((check) => check.inherited)).toBe(true);
  });

  it('liberar la posición desde Equipos rompe el requisito de la etapa 3', () => {
    const request = { ...completeRequest(), stage: 'entrevista' as const };
    const result = inspect(ctx(request, []));
    expect(result.missing.map((check) => check.requirement.id)).toContain('assignment.team');
  });
});

describe('cierre de la última etapa', () => {
  it('se bloquea mientras la dedicación no se fije en la vista Equipos', () => {
    const request = { ...completeRequest(), stage: 'onboarding' as const };
    const result = inspect(ctx(request));
    expect(result.canAdvance).toBe(false);
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['team.allocation']);
    // Lo que falta se resuelve en otra pantalla, y el informe lo dice.
    expect(result.report?.aside?.key).toBe('blocking.aside.elsewhere');
    expect(result.missing[0].requirement.resolveIn).toBe('equipos');
  });

  it('se bloquea si la dedicación supera la capacidad del equipo', () => {
    const request = { ...completeRequest(), stage: 'onboarding' as const };
    const positions = [
      position({ allocationPct: 100 }),
      position({ id: 'pos-2', requestId: null, allocationPct: 250 }),
    ];
    const result = inspect(ctx(request, positions));
    expect(result.missing.map((check) => check.requirement.id)).toEqual(['team.capacity']);
    expect(result.report?.items[0].message.params).toMatchObject({ used: 350, capacity: 300, excess: 50 });
  });

  it('activa al consultor cuando todo está cumplido', () => {
    const request = { ...completeRequest(), stage: 'onboarding' as const };
    const result = advance(ctx(request, [position({ allocationPct: 100 })]), ports);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transaction.request.stage).toBe('activo');
    expect(result.transaction.consultant?.name).toBe('Daniela Quintero');
    expect(result.transaction.positions[0].status).toBe('cubierta');
  });
});

describe('flujo completo', () => {
  it('recorre las siete etapas de forma determinista', () => {
    let request = completeRequest();
    const positions = [position({ allocationPct: 80 })];
    const visited = [request.stage];

    while (request.stage !== 'activo') {
      const result = advance(ctx(request, positions), ports);
      expect(result.ok).toBe(true);
      if (!result.ok) break;
      request = result.transaction.request;
      visited.push(request.stage);
    }

    expect(visited).toEqual(STAGE_ORDER);
  });
});
