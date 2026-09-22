import type { Message } from './messages-types';
import type { RequirementCheck } from './requirements';
import type { ResolutionView, StageId } from './types';

export type { Message } from './messages-types';

/**
 * Composición de mensajes.
 *
 * Regla del producto: cuando algo falta, se nombra TODO lo que falta de una
 * vez, en un solo mensaje. Nunca de a uno, nunca «hay errores en el
 * formulario». Cada frase dice qué falta, por qué se pide y dónde se arregla.
 *
 * Aquí se decide QUÉ se dice y con qué datos; el texto concreto vive en las
 * traducciones, así que el dominio no sabe en qué idioma se está mostrando.
 */

export interface BlockingItem {
  requirementId: string;
  message: Message;
  /** Etapa que lo pide. */
  originStage: StageId;
  inherited: boolean;
  resolveIn: ResolutionView;
}

export interface BlockingReport {
  headline: Message;
  /** Frase adicional cuando parte de lo que falta viene de antes o de otra pantalla. */
  aside: Message | null;
  items: BlockingItem[];
}

function toItems(missing: RequirementCheck[]): BlockingItem[] {
  return missing.map((check) => ({
    requirementId: check.requirement.id,
    message: check.message!,
    originStage: check.originStage,
    inherited: check.inherited,
    resolveIn: check.requirement.resolveIn,
  }));
}

export function composeBlockingReport(
  code: string,
  targetStage: StageId,
  missing: RequirementCheck[],
): BlockingReport {
  const inherited = missing.filter((check) => check.inherited).length;
  const elsewhere = missing.filter((check) => check.requirement.resolveIn === 'equipos').length;

  // Una sola frase de contexto: la de otra pantalla pesa más que la heredada,
  // porque es la que el usuario no encontrará si nadie se lo dice.
  let aside: Message | null = null;
  if (elsewhere > 0) {
    aside = { key: 'blocking.aside.elsewhere', params: { count: elsewhere, total: missing.length } };
  } else if (inherited > 0) {
    aside = { key: 'blocking.aside.inherited', params: { count: inherited, total: missing.length } };
  }

  return {
    headline: {
      key: 'blocking.headline',
      params: { count: missing.length, code, stage: targetStage },
    },
    aside,
    items: toItems(missing),
  };
}

/** La solicitud ya estaba en la última etapa: no hay nada que entregar. */
export function composeFinalStageReport(code: string, stage: StageId): BlockingReport {
  return {
    headline: { key: 'blocking.alreadyFinal', params: { code, stage } },
    aside: null,
    items: [],
  };
}

/** Mensaje de confirmación cuando un agente entrega el trabajo al siguiente. */
export function composeHandoffMessage(
  code: string,
  fromStage: StageId,
  toStage: StageId,
  checksPassed: number,
): Message {
  if (toStage === 'activo') {
    return { key: 'handoff.activated', params: { code, checks: checksPassed } };
  }
  return {
    key: 'handoff.delivered',
    params: { code, from: fromStage, to: toStage, checks: checksPassed },
  };
}

/**
 * Mensaje del formulario de la solicitud al intentar guardar.
 *
 * Mismo criterio que el resto: una sola alerta con todo lo que falta. Aquí se
 * nota especialmente, porque uno de los campos obligatorios no lleva marca
 * visual y el usuario solo se entera al guardar.
 */
export function composeIntakeReport(missing: RequirementCheck[]): BlockingReport {
  return {
    headline: { key: 'blocking.intakeHeadline', params: { count: missing.length } },
    aside: null,
    items: toItems(missing),
  };
}
