import { AGENTS, agentForStage, type AgentDefinition } from './agents';
import type { Consultant, StaffingRequest, OrchestrationEvent, Position } from './entities';
import { buildConsultantFromRequest } from './lifecycle';
import { composeBlockingReport, composeHandoffMessage, type BlockingReport } from './messages';
import {
  evaluate,
  positionForRequest,
  type EvaluationContext,
  type RequirementCheck,
} from './requirements';
import { isFinalStage, nextStage, stageLabel } from './stages';
import type { StageId } from './types';

/**
 * Kernel de orquestación.
 *
 * Decide qué agente tiene la solicitud, si puede entregarla al siguiente y
 * qué queda por hacer. Es una función pura: no toca la base de datos ni la
 * red. La capa de aplicación aplica el resultado y lo persiste.
 */

export interface RuntimePorts {
  now: () => string;
  id: (prefix: string) => string;
}

export interface Inspection {
  request: StaffingRequest;
  stage: StageId;
  agent: AgentDefinition;
  nextStage: StageId | null;
  nextAgent: AgentDefinition | null;
  /** Todos los requisitos exigibles, cumplidos o no, con su etapa de origen. */
  checks: RequirementCheck[];
  missing: RequirementCheck[];
  canAdvance: boolean;
  isFinal: boolean;
  /** Mensaje único con todo lo que falta. null si no falta nada. */
  report: BlockingReport | null;
}

/** Fotografía del estado de una solicitud según el orquestador. */
export function inspect(context: EvaluationContext): Inspection {
  const { request } = context;
  const stage = request.stage;
  const agent = agentForStage(stage);
  const target = nextStage(stage);
  const checks = evaluate(context, stage);
  const missing = checks.filter((check) => !check.satisfied);
  const final = isFinalStage(stage);

  return {
    request,
    stage,
    agent,
    nextStage: target,
    nextAgent: target ? agentForStage(target) : null,
    checks,
    missing,
    canAdvance: !final && missing.length === 0,
    isFinal: final,
    report: missing.length > 0 && target ? composeBlockingReport(request, target, missing) : null,
  };
}

/** Transacción que hay que aplicar para materializar una entrega. */
export interface HandoffTransaction {
  request: StaffingRequest;
  /** Posiciones modificadas por la entrega (se cubren al activar). */
  positions: Position[];
  /** Consultor creado al llegar la solicitud a `activo`. */
  consultant: Consultant | null;
  events: OrchestrationEvent[];
  message: string;
}

export type AdvanceResult =
  | { ok: true; transaction: HandoffTransaction }
  | { ok: false; report: BlockingReport; event: OrchestrationEvent };

/**
 * Avanza la solicitud a la etapa siguiente si se cumplen TODOS los requisitos
 * acumulados. Nunca avanza sola: la llama el usuario desde la interfaz.
 */
export function advance(context: EvaluationContext, ports: RuntimePorts): AdvanceResult {
  const inspection = inspect(context);
  const { request } = context;
  const now = ports.now();

  if (inspection.isFinal || !inspection.nextStage) {
    const report = composeBlockingReport(request, request.stage, []);
    return {
      ok: false,
      report: {
        ...report,
        headline: `La solicitud ${request.code} ya está en la etapa ${stageLabel(request.stage)}, que es la última del flujo.`,
        items: [],
        aside: null,
        text: `La solicitud ${request.code} ya está en la etapa ${stageLabel(request.stage)}, que es la última del flujo.`,
      },
      event: blockedEvent(request, null, [], ports, 'La solicitud ya estaba en la última etapa.'),
    };
  }

  if (inspection.missing.length > 0) {
    const report = inspection.report!;
    return {
      ok: false,
      report,
      event: blockedEvent(
        request,
        inspection.nextStage,
        inspection.missing.map((check) => check.sentence),
        ports,
        report.headline,
      ),
    };
  }

  const target = inspection.nextStage;
  const nextAgent = inspection.nextAgent!;

  let updated: StaffingRequest = {
    ...request,
    stage: target,
    updatedAt: now,
    stageEnteredAt: { ...request.stageEnteredAt, [target]: now },
  };

  const events: OrchestrationEvent[] = [
    {
      id: ports.id('evt'),
      at: now,
      requestId: request.id,
      requestCode: request.code,
      kind: 'entrega',
      fromAgent: inspection.agent.id,
      toAgent: nextAgent.id,
      fromStage: request.stage,
      toStage: target,
      summary: `${inspection.agent.name} entrega ${request.code} a ${nextAgent.name}.`,
      checks: inspection.checks.map((check) => check.requirement.label),
    },
  ];

  let positions: Position[] = [];
  let consultant: Consultant | null = null;

  if (target === 'activo') {
    const position = positionForRequest(context);
    consultant = buildConsultantFromRequest({
      id: ports.id('con'),
      request: updated,
      position,
      now,
    });
    updated = { ...updated, consultantId: consultant.id };
    if (position) {
      positions = [
        {
          ...position,
          status: 'cubierta',
          consultantId: consultant.id,
          coveredAt: now,
        },
      ];
    }
    events.push({
      id: ports.id('evt'),
      at: now,
      requestId: request.id,
      requestCode: request.code,
      kind: 'consultor-activo',
      fromAgent: 'hr',
      toAgent: 'consultant',
      fromStage: 'onboarding',
      toStage: 'activo',
      summary: `${consultant.name} se incorpora al equipo y empieza su ramp-up.`,
      checks: [],
    });
  }

  return {
    ok: true,
    transaction: {
      request: updated,
      positions,
      consultant,
      events,
      message: composeHandoffMessage(
        request,
        request.stage,
        target,
        nextAgent.name,
        inspection.checks.length,
      ),
    },
  };
}

function blockedEvent(
  request: StaffingRequest,
  target: StageId | null,
  checks: string[],
  ports: RuntimePorts,
  summary: string,
): OrchestrationEvent {
  return {
    id: ports.id('evt'),
    at: ports.now(),
    requestId: request.id,
    requestCode: request.code,
    kind: 'bloqueo',
    fromAgent: agentForStage(request.stage).id,
    toAgent: null,
    fromStage: request.stage,
    toStage: target,
    summary,
    checks,
  };
}

/** Bandeja de cada agente: solicitudes cuya etapa actual le pertenece. */
export interface AgentInbox {
  agent: AgentDefinition;
  requests: StaffingRequest[];
  /** Solicitudes de su bandeja que hoy no podrían avanzar. */
  blocked: number;
  ready: number;
}

export function buildInboxes(
  requests: StaffingRequest[],
  teams: EvaluationContext['teams'],
  positions: Position[],
): AgentInbox[] {
  // Los siete agentes aparecen siempre, tengan o no trabajo pendiente.
  const inboxes: AgentInbox[] = AGENTS.map((agent) => ({
    agent,
    requests: [],
    blocked: 0,
    ready: 0,
  }));
  const byAgent = new Map(inboxes.map((inbox) => [inbox.agent.id, inbox]));

  for (const request of requests) {
    const inbox = byAgent.get(agentForStage(request.stage).id);
    if (!inbox) continue;
    inbox.requests.push(request);
    const inspection = inspect({ request, teams, positions });
    if (inspection.isFinal) continue;
    if (inspection.canAdvance) inbox.ready += 1;
    else inbox.blocked += 1;
  }

  return inboxes;
}
