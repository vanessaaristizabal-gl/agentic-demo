import type { DraftInput } from '@/application/ports';

/**
 * Reserva del lado del cliente. Misma idea que la del servidor: no es un
 * error disfrazado, es una descripción de puesto utilizable compuesta con
 * los datos del perfil, y siempre pasa el mínimo de 120 caracteres.
 */
export function localFallbackDraft(input: DraftInput): string {
  const role = input.consultantRole || 'consultor';
  const seniority = input.seniority ? ` ${input.seniority}` : '';
  const stack = input.stack || 'el stack definido por la práctica';
  const client = input.clientName || 'uno de nuestros clientes';
  const team = input.teamName ? ` dentro del ${input.teamName}` : '';
  const skills = input.skills.filter(Boolean);

  return [
    `Buscamos un ${role}${seniority} para incorporarse a la cuenta de ${client}${team}. ` +
      'El trabajo consiste en sumarse a un equipo ya en marcha, entender el contexto del cliente y ' +
      'sostener la entrega con autonomía desde las primeras semanas.',
    '',
    'Responsabilidades',
    `- Construir y mantener las entregas del equipo sobre ${stack}.`,
    '- Participar en las ceremonias del equipo y en las revisiones de código.',
    '- Documentar las decisiones técnicas relevantes y sus motivos.',
    '- Trabajar directamente con el cliente para aclarar requisitos y prioridades.',
    '',
    'Requisitos',
    `- Experiencia demostrable con ${stack}.`,
    `- Trayectoria acorde a un perfil${seniority || ' con autonomía'} en proyectos de consultoría.`,
    skills.length > 0
      ? `- Solvencia en: ${skills.join(', ')}.`
      : '- Solvencia en prácticas de calidad, pruebas automatizadas y entrega continua.',
    input.englishLevel
      ? `- Nivel de inglés ${input.englishLevel}, por el contacto directo con el cliente.`
      : '- Nivel de inglés suficiente para trabajar con el cliente.',
  ].join('\n');
}
