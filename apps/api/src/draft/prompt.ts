import type { DraftRequestDto } from './dto/draft-request.dto';

const UNKNOWN = 'sin especificar';

export function describeProfile(request: DraftRequestDto): string {
  const skills = request.skills?.filter(Boolean) ?? [];
  return [
    `Cliente: ${request.clientName || UNKNOWN}`,
    `Práctica: ${request.practice || UNKNOWN}`,
    `Stack: ${request.stack || UNKNOWN}`,
    `Rol: ${request.consultantRole || UNKNOWN}`,
    `Seniority: ${request.seniority || UNKNOWN}`,
    `Nivel de inglés: ${request.englishLevel || UNKNOWN}`,
    `Equipo: ${request.teamName || UNKNOWN}`,
    `Habilidades requeridas: ${skills.length > 0 ? skills.join(', ') : UNKNOWN}`,
    request.context ? `Necesidad del cliente: ${request.context}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export const SYSTEM_PROMPT = [
  'Eres el reclutador técnico de una consultora de software.',
  'Escribes descripciones de puesto en español neutro, sobrias y concretas.',
  'No inventas datos que no estén en el perfil: si algo no se indica, lo omites.',
  'No prometes salarios, beneficios ni ubicaciones que no te hayan dado.',
  'No usas superlativos vacíos ni jerga de anuncio («ninja», «crack», «rockstar»).',
].join(' ');

export function buildUserPrompt(request: DraftRequestDto): string {
  return [
    'Redacta la descripción de esta vacante a partir del perfil técnico ya definido.',
    '',
    describeProfile(request),
    '',
    'Formato exacto, sin encabezados de más y sin markdown de títulos:',
    '1. Un párrafo de tres o cuatro frases sobre el puesto y el equipo.',
    '2. Una sección «Responsabilidades» con cuatro viñetas que empiecen por un verbo.',
    '3. Una sección «Requisitos» con cuatro viñetas derivadas del stack, el seniority y las habilidades.',
    '',
    'Entre 180 y 320 palabras. Devuelve solo el texto de la vacante.',
  ].join('\n');
}
