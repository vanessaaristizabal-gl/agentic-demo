import type { Container, SystemPort } from '@/application/ports';
import { draftClient } from './http/draft-client';
import {
  consultantRepository,
  demandRepository,
  eventRepository,
  positionRepository,
  teamRepository,
} from './persistence/repositories';

const system: SystemPort = {
  now: () => new Date().toISOString(),
  id: (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`,
};

/** Único punto donde se conectan dominio, aplicación e infraestructura. */
export const container: Container = {
  demands: demandRepository,
  teams: teamRepository,
  positions: positionRepository,
  consultants: consultantRepository,
  events: eventRepository,
  drafts: draftClient,
  system,
};
