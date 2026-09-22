import type { DraftRequestDto } from '../dto/draft-request.dto';

/**
 * Puerto de salida: generar una descripción de puesto a partir del perfil.
 *
 * La capa de aplicación (DraftService) depende de esta interfaz, no del SDK
 * de Anthropic. Cambiar de proveedor no toca el controlador ni el servicio.
 */
export interface DraftGenerator {
  readonly name: string;
  /** Si el generador está en condiciones de intentarlo. */
  isAvailable(): boolean;
  generate(request: DraftRequestDto, signal: AbortSignal): Promise<string>;
}

export const DRAFT_GENERATOR = Symbol('DRAFT_GENERATOR');
