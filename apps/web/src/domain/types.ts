/**
 * Capa de dominio — tipos base.
 *
 * Esta capa no importa nada de React, Dexie, la red ni el navegador.
 * Describe el negocio de la consultora y nada mas.
 */

/** Las siete etapas por las que pasa una solicitud, en orden. */
export type StageId =
  | 'registro'
  | 'perfil'
  | 'equipo'
  | 'vacante'
  | 'entrevista'
  | 'onboarding'
  | 'activo';

/** Los siete roles de la empresa. Cada uno es un agente del sistema. */
export type RoleId =
  | 'sales'
  | 'solution-architect'
  | 'delivery-manager'
  | 'recruiter'
  | 'engineering-manager'
  | 'hr'
  | 'consultant';

/** Practicas de la consultora. Determinan el stack disponible. */
export type PracticeId =
  | 'cloud-data'
  | 'digital-products'
  | 'quality-engineering'
  | 'ai-automation';

/** Un consultor puede ser desarrollador, QA o tech manager. */
export type ConsultantRole = 'desarrollador' | 'qa' | 'tech-manager';

export type Seniority = 'junior' | 'semi-senior' | 'senior' | 'staff';

export type EnglishLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type InterviewDecision = 'pendiente' | 'contratar' | 'descartar' | 'segunda-ronda';

export type ContractType = 'indefinido' | 'obra-labor' | 'contractor';

export type BillingModel = 'time-and-materials' | 'precio-fijo' | 'capacity';

export type Priority = 'baja' | 'media' | 'alta' | 'critica';

/** Donde se resuelve un requisito incumplido. */
export type ResolutionView = 'solicitudes' | 'equipos';

/** Identificador estable de cada requisito del flujo. */
export type RequirementId = string;
