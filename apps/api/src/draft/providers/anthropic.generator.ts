import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DraftRequestDto } from '../dto/draft-request.dto';
import type { DraftGenerator } from '../ports/draft-generator';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompt';

/**
 * Única llamada real a un modelo de lenguaje en todo el sistema.
 *
 * Vive en el servidor: la clave nunca sale del entorno y el navegador jamás
 * la ve. Si no hay clave, este generador se declara no disponible y el
 * servicio usa el texto de reserva sin intentar la llamada.
 */
@Injectable()
export class AnthropicDraftGenerator implements DraftGenerator {
  readonly name = 'anthropic';

  private readonly logger = new Logger(AnthropicDraftGenerator.name);
  private readonly apiKey: string;
  private readonly model: string;
  private client: Anthropic | null = null;

  constructor(config: ConfigService) {
    this.apiKey = (config.get<string>('ANTHROPIC_API_KEY') ?? '').trim();
    this.model = (config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-5').trim();
  }

  get modelName(): string {
    return this.model;
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async generate(request: DraftRequestDto, signal: AbortSignal): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('No hay ANTHROPIC_API_KEY configurada en el servidor.');
    }

    this.client ??= new Anthropic({ apiKey: this.apiKey, maxRetries: 1 });

    const message = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(request) }],
      },
      { signal },
    );

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (text.length === 0) {
      throw new Error('El modelo respondió sin texto utilizable.');
    }

    this.logger.log(`Borrador generado con ${this.model} (${text.length} caracteres).`);
    return text;
  }
}
