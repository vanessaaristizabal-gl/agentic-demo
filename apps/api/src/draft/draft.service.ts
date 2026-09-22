import { Injectable, Logger } from '@nestjs/common';
import type { DraftRequestDto, DraftResponse } from './dto/draft-request.dto';
import { AnthropicDraftGenerator } from './providers/anthropic.generator';
import { FallbackDraftWriter } from './providers/fallback.writer';

/** Tiempo máximo que se espera al modelo. Una demo en vivo no puede colgarse. */
const TIMEOUT_MS = 20_000;

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name);

  constructor(
    private readonly anthropic: AnthropicDraftGenerator,
    private readonly fallback: FallbackDraftWriter,
  ) {}

  /**
   * Nunca lanza. Devuelve siempre una descripción utilizable: la del modelo
   * si se pudo, y si no la de reserva, diciendo en `reason` qué pasó.
   */
  async draft(request: DraftRequestDto): Promise<DraftResponse> {
    if (!this.anthropic.isAvailable()) {
      this.logger.warn('Sin ANTHROPIC_API_KEY: se devuelve el texto de reserva.');
      return {
        description: this.fallback.write(request),
        source: 'reserva',
        model: null,
        reason:
          'El servidor no tiene ANTHROPIC_API_KEY configurada, así que la descripción se compuso con los datos del perfil técnico.',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const description = await this.anthropic.generate(request, controller.signal);
      return {
        description,
        source: 'anthropic',
        model: this.anthropic.modelName,
        reason: null,
      };
    } catch (error) {
      this.logger.warn(`La llamada al modelo falló: ${describeError(error)}`);
      return {
        description: this.fallback.write(request),
        source: 'reserva',
        model: null,
        reason: `No se pudo generar con el modelo (${describeError(error)}). La descripción se compuso con los datos del perfil técnico.`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'el modelo tardó más de 20 segundos en responder';
    const status = (error as { status?: number }).status;
    if (status === 401) return 'la clave de API fue rechazada';
    if (status === 429) return 'se alcanzó el límite de peticiones';
    if (status && status >= 500) return 'el servicio del modelo no está disponible';
    return error.message;
  }
  return 'error desconocido';
}
