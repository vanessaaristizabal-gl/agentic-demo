import { agentForStage, type AgentDefinition } from './agents';
import type { Consultant, StaffingRequest, OrchestrationEvent, Position } from './entities';
import { buildConsultantFromRequest } from './lifecycle';
import {
  composeBlockingReport,
  composeFinalStageReport,
  composeHandoffMessage,
  type BlockingReport,
  type Message,
} from './messages';
import {
  evaluate,
  positionForRequest,
  type EvaluationContext,
  type RequirementCheck,
} from './requirements';
import { isFinalStage, nextStage } from './stages';
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
    report:
      missing.length > 0 && target ? composeBlockingReport(request.code, target, missing) : null,
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
  message: Message;
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
    return {
      ok: false,
      report: composeFinalStageReport(request.code, request.stage),
      event: blockedEvent(request, null, [], ports, {
        key: 'events.alreadyFinal',
        params: { code: request.code },
      }),
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
        inspection.missing.map((check) => check.requirement.id),
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
      summary: {
        key: 'events.handoff',
        params: { from: inspection.agent.id, to: nextAgent.id, code: request.code },
      },
      checks: inspection.checks.map((check) => check.requirement.id),
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
      summary: { key: 'events.consultantActive', params: { name: consultant.name } },
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
      message: composeHandoffMessage(request.code, request.stage, target, inspection.checks.length),
    },
  };
}

function blockedEvent(
  request: StaffingRequest,
  target: StageId | null,
  checks: string[],
  ports: RuntimePorts,
  summary: Message,
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
