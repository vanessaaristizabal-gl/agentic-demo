import { closeLifecycle, completeCurrentPhase, type Consultant } from '@/domain';
import type { Container } from '../ports';

/** Cierra la fase en curso del ciclo de vida y pone en marcha la siguiente. */
export async function advanceLifecycle(
  container: Container,
  consultantId: string,
): Promise<Consultant> {
  const consultant = await container.consultants.get(consultantId);
  if (!consultant) throw new Error(`No existe el consultor ${consultantId}.`);

  const updated = completeCurrentPhase(consultant, container.system.now());
  await container.consultants.save(updated);
  return updated;
}

/** Cierra el ciclo con rotación a otro equipo o salida de la cuenta. */
export async function closeConsultantCycle(
  container: Container,
  consultantId: string,
  outcome: 'rotacion' | 'salida',
  note: string,
): Promise<Consultant> {
  const consultant = await container.consultants.get(consultantId);
  if (!consultant) throw new Error(`No existe el consultor ${consultantId}.`);

  const updated = closeLifecycle(consultant, outcome, note, container.system.now());
  await container.consultants.save(updated);
  return updated;
}
