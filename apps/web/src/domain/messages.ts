import type { StaffingRequest } from './entities';
import type { RequirementCheck } from './requirements';
import { stageLabel } from './stages';
import type { StageId } from './types';

/**
 * Composición de mensajes de error.
 *
 * Regla del producto: cuando algo falta, se nombra TODO lo que falta de una
 * vez, en un solo mensaje. Nunca de a uno, nunca «hay errores en el
 * formulario». Cada frase dice qué falta, por qué se pide y dónde se arregla.
 */

export interface BlockingItem {
  requirementId: string;
  sentence: string;
  originLabel: string;
  inherited: boolean;
  resolveIn: 'solicitudes' | 'equipos';
  where: string;
}

export interface BlockingReport {
  headline: string;
  /** Frase adicional cuando parte de lo que falta se resuelve en otra pantalla. */
  aside: string | null;
  items: BlockingItem[];
  /** Todo el mensaje en texto plano, para portapapeles o avisos cortos. */
  text: string;
}

const COUNT_WORDS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];

function countWord(value: number): string {
  return COUNT_WORDS[value] ?? String(value);
}

export function composeBlockingReport(
  request: StaffingRequest,
  targetStage: StageId,
  missing: RequirementCheck[],
): BlockingReport {
  const total = missing.length;
  const target = stageLabel(targetStage);

  const headline =
    total === 1
      ? `La solicitud ${request.code} no puede pasar a la etapa ${target}: falta un requisito por cumplir.`
      : `La solicitud ${request.code} no puede pasar a la etapa ${target}: quedan ${countWord(total)} requisitos sin cumplir.`;

  const inheritedCount = missing.filter((check) => check.inherited).length;
  const elsewhere = missing.filter((check) => check.requirement.resolveIn === 'equipos');

  const asideParts: string[] = [];
  if (elsewhere.length === 1) {
    asideParts.push(
      total === 1
        ? 'Lo que falta no se resuelve en esta pantalla: la dedicación de la posición se fija en la vista Equipos.'
        : 'Uno de ellos no se resuelve en esta pantalla: la dedicación de la posición se fija en la vista Equipos.',
    );
  } else if (elsewhere.length > 1) {
    asideParts.push(
      `${countWord(elsewhere.length).replace(/^un$/, 'Uno')} de ellos no se resuelven en esta pantalla, sino en la vista Equipos.`,
    );
  }
  if (inheritedCount > 0) {
    asideParts.push(
      inheritedCount === 1
        ? total === 1
          ? 'Viene de una etapa anterior: los requisitos no se cierran al avanzar, se siguen exigiendo hasta el final.'
          : 'Uno viene de una etapa anterior: los requisitos no se cierran al avanzar, se siguen exigiendo hasta el final.'
        : `${countWord(inheritedCount).charAt(0).toUpperCase()}${countWord(inheritedCount).slice(1)} vienen de etapas anteriores: los requisitos no se cierran al avanzar, se siguen exigiendo hasta el final.`,
    );
  }

  const items: BlockingItem[] = missing.map((check) => ({
    requirementId: check.requirement.id,
    sentence: check.sentence,
    originLabel: check.originLabel,
    inherited: check.inherited,
    resolveIn: check.requirement.resolveIn,
    where: check.requirement.where,
  }));

  const aside = asideParts.length > 0 ? asideParts.join(' ') : null;

  const text = [headline, aside, ...items.map((item) => `· ${item.sentence}`)]
    .filter(Boolean)
    .join('\n');

  return { headline, aside, items, text };
}

/** Mensaje de confirmación cuando un agente entrega el trabajo al siguiente. */
export function composeHandoffMessage(
  request: StaffingRequest,
  fromStage: StageId,
  toStage: StageId,
  toAgentName: string,
  checksPassed: number,
): string {
  if (toStage === 'activo') {
    return `${request.code} queda activa. El consultor ya figura trabajando en el equipo y se han verificado ${checksPassed} requisitos acumulados desde la etapa ${stageLabel('registro')}.`;
  }
  return `${request.code} pasa de ${stageLabel(fromStage)} a ${stageLabel(toStage)} y entra en la bandeja de ${toAgentName}. Se verificaron ${checksPassed} requisitos acumulados.`;
}

/**
 * Mensaje del formulario de la solicitud al intentar guardar.
 *
 * Mismo criterio que el resto: una sola alerta con todo lo que falta.
 * Aquí se nota especialmente, porque uno de los campos obligatorios no lleva
 * marca visual y el usuario solo se entera al guardar.
 */
export function composeIntakeReport(missing: RequirementCheck[]): BlockingReport {
  const total = missing.length;
  const headline =
    total === 1
      ? 'No se puede registrar la solicitud: falta un dato obligatorio.'
      : `No se puede registrar la solicitud: faltan ${countWord(total)} datos obligatorios.`;

  const items: BlockingItem[] = missing.map((check) => ({
    requirementId: check.requirement.id,
    sentence: check.sentence,
    originLabel: check.originLabel,
    inherited: false,
    resolveIn: check.requirement.resolveIn,
    where: check.requirement.where,
  }));

  return {
    headline,
    aside: null,
    items,
    text: [headline, ...items.map((item) => `· ${item.sentence}`)].join('\n'),
  };
}
