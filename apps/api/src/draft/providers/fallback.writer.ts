import { Injectable } from '@nestjs/common';
import type { DraftRequestDto } from '../dto/draft-request.dto';

/**
 * Texto de reserva.
 *
 * No es un mensaje de error disfrazado: es una descripción de puesto
 * utilizable, compuesta con los datos del perfil que ya están en la solicitud.
 * Se usa cuando no hay clave de API o cuando la llamada al modelo falla, y
 * siempre supera el mínimo de 120 caracteres que exige publicar la vacante.
 */
@Injectable()
export class FallbackDraftWriter {
  write(request: DraftRequestDto): string {
    const role = request.consultantRole || 'consultor';
    const seniority = request.seniority ? ` ${request.seniority}` : '';
    const stack = request.stack || 'el stack definido por la práctica';
    const client = request.clientName || 'uno de nuestros clientes';
    const team = request.teamName ? ` dentro del equipo ${request.teamName}` : '';
    const english = request.englishLevel
      ? `Nivel de inglés ${request.englishLevel}, porque el trabajo implica contacto directo con el cliente.`
      : 'Se valorará el nivel de inglés por el contacto directo con el cliente.';
    const skills = (request.skills ?? []).filter(Boolean);

    const responsibilities = [
      `Construir y mantener las entregas del equipo sobre ${stack}.`,
      'Participar en las ceremonias del equipo y en las revisiones de código.',
      'Documentar las decisiones técnicas relevantes y sus motivos.',
      'Trabajar directamente con el cliente para aclarar requisitos y prioridades.',
    ];

    const requirements = [
      `Experiencia demostrable con ${stack}.`,
      `Trayectoria acorde a un perfil${seniority || ' con autonomía'} en proyectos de consultoría.`,
      skills.length > 0
        ? `Solvencia en: ${skills.join(', ')}.`
        : 'Solvencia en prácticas de calidad, pruebas automatizadas y entrega continua.',
      english,
    ];

    return [
      `Buscamos un${seniority ? '' : ''} ${role}${seniority} para incorporarse a la cuenta de ${client}${team}. ` +
        `El trabajo consiste en sumarse a un equipo ya en marcha, entender el contexto del cliente y sostener ` +
        `la entrega con autonomía desde las primeras semanas. Es una posición de consultoría: se trabaja con el ` +
        `cliente, no solo para el cliente.`,
      '',
      'Responsabilidades',
      ...responsibilities.map((item) => `- ${item}`),
      '',
      'Requisitos',
      ...requirements.map((item) => `- ${item}`),
    ].join('\n');
  }
}
