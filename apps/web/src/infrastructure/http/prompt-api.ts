import type { DraftInput } from '@/application/ports';

/**
 * Prompt API del navegador (Gemini Nano).
 *
 * Solo se usa como alternativa cuando el servidor no está disponible. Es un
 * modelo local: no hay clave ni petición a terceros. Si el navegador no lo
 * soporta, devuelve null y el cliente pasa al texto de reserva.
 */

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelApi {
  availability?: () => Promise<string>;
  capabilities?: () => Promise<{ available?: string }>;
  create: (options?: Record<string, unknown>) => Promise<LanguageModelSession>;
}

function resolveApi(): LanguageModelApi | null {
  const scope = globalThis as unknown as {
    LanguageModel?: LanguageModelApi;
    ai?: { languageModel?: LanguageModelApi };
  };
  return scope.LanguageModel ?? scope.ai?.languageModel ?? null;
}

export function isPromptApiPresent(): boolean {
  return resolveApi() !== null;
}

export async function promptApiDraft(input: DraftInput): Promise<string | null> {
  const api = resolveApi();
  if (!api) return null;

  try {
    if (api.availability) {
      const state = await api.availability();
      if (state === 'unavailable') return null;
    } else if (api.capabilities) {
      const state = await api.capabilities();
      if (state.available === 'no') return null;
    }

    const session = await api.create({
      initialPrompts: [
        {
          role: 'system',
          content:
            'Eres el reclutador técnico de una consultora de software. Escribes descripciones de puesto en español neutro, sobrias y concretas, sin inventar datos ni usar jerga de anuncio.',
        },
      ],
    });

    const text = await session.prompt(
      [
        'Redacta la descripción de esta vacante a partir del perfil técnico:',
        `Cliente: ${input.clientName || 'sin especificar'}`,
        `Práctica: ${input.practice || 'sin especificar'}`,
        `Stack: ${input.stack || 'sin especificar'}`,
        `Rol: ${input.consultantRole || 'sin especificar'}`,
        `Seniority: ${input.seniority || 'sin especificar'}`,
        `Inglés: ${input.englishLevel || 'sin especificar'}`,
        `Habilidades: ${input.skills.join(', ') || 'sin especificar'}`,
        '',
        'Un párrafo de presentación, luego «Responsabilidades» y «Requisitos» con cuatro viñetas cada una. Entre 180 y 320 palabras.',
      ].join('\n'),
    );

    session.destroy?.();
    const trimmed = text?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    // El modelo local es un extra: si falla, se sigue con la reserva.
    return null;
  }
}
