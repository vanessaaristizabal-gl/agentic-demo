import type {
  BillingModel,
  ConsultantRole,
  ContractType,
  EnglishLevel,
  PracticeId,
  Priority,
  Seniority,
} from './types';

/**
 * Catálogos del negocio.
 *
 * Solo guardan identificadores estables, nunca texto visible: lo que se guarda
 * en la base de datos no puede cambiar porque alguien cambie de idioma. La
 * etiqueta se resuelve en la presentación con la clave que devuelve
 * `catalogKey`.
 */

export const PRACTICES: PracticeId[] = [
  'cloud-data',
  'digital-products',
  'quality-engineering',
  'ai-automation',
];

/**
 * El stack disponible depende de la práctica elegida.
 * Son nombres de tecnología: no se traducen.
 */
export const STACKS_BY_PRACTICE: Record<PracticeId, string[]> = {
  'cloud-data': [
    'AWS + Terraform',
    'Azure Data Factory',
    'Databricks + Spark',
    'Snowflake',
    'Kafka + Flink',
    'dbt + Airflow',
  ],
  'digital-products': [
    'React + TypeScript',
    'Angular + RxJS',
    'Node.js + NestJS',
    'Java + Spring Boot',
    '.NET 8',
    'React Native',
  ],
  'quality-engineering': [
    'Playwright + TypeScript',
    'Cypress',
    'Selenium + Java',
    'k6',
    'Appium',
    'Pact',
  ],
  'ai-automation': [
    'Python + LangChain',
    'RAG sobre Bedrock',
    'Vertex AI + MLOps',
    'n8n',
    'Semantic Kernel',
  ],
};

export function stacksFor(practice: PracticeId | ''): string[] {
  if (!practice) return [];
  return STACKS_BY_PRACTICE[practice] ?? [];
}

export const SENIORITIES: Seniority[] = ['junior', 'semi-senior', 'senior', 'staff'];

export const CONSULTANT_ROLES: ConsultantRole[] = ['desarrollador', 'qa', 'tech-manager'];

export const ENGLISH_LEVELS: EnglishLevel[] = ['A2', 'B1', 'B2', 'C1'];

export const BILLING_MODELS: BillingModel[] = ['time-and-materials', 'precio-fijo', 'capacity'];

export const PRIORITIES: Priority[] = ['baja', 'media', 'alta', 'critica'];

export const CONTRACT_TYPES: ContractType[] = ['indefinido', 'obra-labor', 'contractor'];

export const VACANCY_CHANNELS = [
  'linkedin',
  'referrals',
  'own-job-board',
  'tech-communities',
  'internal-database',
] as const;

export const ONBOARDING_ACCESSES = [
  'corporate-email',
  'client-repository',
  'client-vpn',
  'jira-confluence',
  'ci-cd',
] as const;

export const SKILL_LIBRARY = [
  'hexagonal-architecture',
  'automated-testing',
  'ci-cd',
  'observability',
  'data-modelling',
  'application-security',
  'client-communication',
  'mentoring',
  'performance',
  'accessibility',
] as const;

export const SALARY_BANDS = ['banda-1', 'banda-2', 'banda-3', 'banda-4'] as const;

/**
 * Clave de traducción de un valor de catálogo. La presentación la pasa por
 * `t()`; el dominio nunca ve texto.
 */
export function catalogKey(group: string, value: string): string {
  return `catalog.${group}.${value}`;
}
