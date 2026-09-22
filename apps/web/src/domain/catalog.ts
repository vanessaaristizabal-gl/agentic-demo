import type {
  BillingModel,
  ConsultantRole,
  ContractType,
  EnglishLevel,
  PracticeId,
  Priority,
  Seniority,
} from './types';

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const PRACTICES: Option<PracticeId>[] = [
  { value: 'cloud-data', label: 'Cloud & Data' },
  { value: 'digital-products', label: 'Digital Products' },
  { value: 'quality-engineering', label: 'Quality Engineering' },
  { value: 'ai-automation', label: 'AI & Automation' },
];

/**
 * El stack disponible depende de la practica elegida.
 * Es intencional: hasta que no hay practica, no hay stack que elegir,
 * y cambiar de practica invalida el stack seleccionado.
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
    'k6 (performance)',
    'Appium (móvil)',
    'Pact (contract testing)',
  ],
  'ai-automation': [
    'Python + LangChain',
    'RAG sobre Bedrock',
    'Vertex AI + MLOps',
    'n8n + integraciones',
    'Semantic Kernel',
  ],
};

export function stacksFor(practice: PracticeId | ''): string[] {
  if (!practice) return [];
  return STACKS_BY_PRACTICE[practice] ?? [];
}

export const SENIORITIES: Option<Seniority>[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'semi-senior', label: 'Semi Senior' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
];

export const CONSULTANT_ROLES: Option<ConsultantRole>[] = [
  { value: 'desarrollador', label: 'Desarrollador' },
  { value: 'qa', label: 'QA' },
  { value: 'tech-manager', label: 'Tech Manager' },
];

export const ENGLISH_LEVELS: Option<EnglishLevel>[] = [
  { value: 'A2', label: 'A2 — basico' },
  { value: 'B1', label: 'B1 — intermedio' },
  { value: 'B2', label: 'B2 — intermedio alto' },
  { value: 'C1', label: 'C1 — avanzado' },
];

export const BILLING_MODELS: Option<BillingModel>[] = [
  { value: 'time-and-materials', label: 'Time & Materials' },
  { value: 'precio-fijo', label: 'Precio fijo' },
  { value: 'capacity', label: 'Capacity / célula dedicada' },
];

export const PRIORITIES: Option<Priority>[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export const CONTRACT_TYPES: Option<ContractType>[] = [
  { value: 'indefinido', label: 'Término indefinido' },
  { value: 'obra-labor', label: 'Obra o labor' },
  { value: 'contractor', label: 'Contractor' },
];

export const VACANCY_CHANNELS: string[] = [
  'LinkedIn',
  'Referidos internos',
  'Portal de empleo propio',
  'Comunidades técnicas',
  'Base de datos interna',
];

export const ONBOARDING_ACCESSES: string[] = [
  'Correo corporativo',
  'Repositorio del cliente',
  'VPN del cliente',
  'Jira y Confluence',
  'Herramientas de CI/CD',
];

export const SKILL_LIBRARY: string[] = [
  'Arquitectura hexagonal',
  'Testing automatizado',
  'CI/CD',
  'Observabilidad',
  'Modelado de datos',
  'Seguridad de aplicaciones',
  'Comunicación con cliente',
  'Mentoring',
  'Performance',
  'Accesibilidad',
];

export const SALARY_BANDS: Option[] = [
  { value: 'banda-1', label: 'Banda 1 — hasta 4.500 USD/mes' },
  { value: 'banda-2', label: 'Banda 2 — 4.500 a 6.500 USD/mes' },
  { value: 'banda-3', label: 'Banda 3 — 6.500 a 8.500 USD/mes' },
  { value: 'banda-4', label: 'Banda 4 — más de 8.500 USD/mes' },
];

export function labelOf(options: Option<string>[], value: string | undefined | null): string {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label ?? value;
}
