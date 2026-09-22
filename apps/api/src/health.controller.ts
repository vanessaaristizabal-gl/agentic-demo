import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  /**
   * La interfaz consulta este endpoint para avisar, antes de pulsar el botón,
   * de si el servidor tiene clave configurada. No expone la clave.
   */
  @Get()
  read(): { ok: true; model: string; modelConfigured: boolean } {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    return {
      ok: true,
      model: this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-5',
      modelConfigured: Boolean(key && key.trim().length > 0),
    };
  }
}
