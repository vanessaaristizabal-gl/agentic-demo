import type { DraftInput, DraftOutcome, DraftPort } from '@/application/ports';
import { localFallbackDraft } from './local-fallback';
import { promptApiDraft } from './prompt-api';

/**
 * Cliente del único punto del sistema que usa un modelo.
 *
 * Orden de intentos, de más a menos preferido:
 *
 *   1. POST /api/draft — el servidor, que es quien tiene la clave. El
 *      navegador nunca ve ANTHROPIC_API_KEY.
 *   2. Prompt API de Gemini Nano, solo si el servidor no está disponible
 *      (por ejemplo, con la interfaz publicada sin backend). Es un modelo
 *      local del navegador: tampoco sale ninguna clave.
 *   3. Texto de reserva compuesto en el cliente.
 *
 * Nunca lanza: siempre devuelve una descripción utilizable.
 */
const TIMEOUT_MS = 25_000;

async function callServer(input: DraftInput): Promise<DraftOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`el servidor respondió ${response.status}`);
    }
    const payload = (await response.json()) as DraftOutcome;
    if (typeof payload.description !== 'string' || payload.description.trim().length === 0) {
      throw new Error('el servidor devolvió una respuesta vacía');
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export const draftClient: DraftPort = {
  async draft(input: DraftInput): Promise<DraftOutcome> {
    try {
      return await callServer(input);
    } catch (serverError) {
      const serverReason = describe(serverError);

      // El servidor no está: se intenta el modelo local del navegador.
      const onDevice = await promptApiDraft(input);
      if (onDevice) {
        return {
          description: onDevice,
          source: 'gemini-nano',
          model: 'Prompt API del navegador',
          reason: `No se pudo hablar con el servidor (${serverReason}), así que la descripción se generó con el modelo local del navegador.`,
        };
      }

      return {
        description: localFallbackDraft(input),
        source: 'reserva',
        model: null,
        reason: `No se pudo hablar con el servidor (${serverReason}) y el navegador no tiene modelo local disponible. La descripción se compuso con los datos del perfil técnico.`,
      };
    }
  },
};

function describe(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'la petición superó los 25 segundos';
    return error.message;
  }
  return 'error desconocido';
}
