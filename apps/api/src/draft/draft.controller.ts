import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { DraftService } from './draft.service';
import { DraftRequestDto, type DraftResponse } from './dto/draft-request.dto';

@Controller('draft')
export class DraftController {
  constructor(private readonly service: DraftService) {}

  /**
   * POST /api/draft
   *
   * Único punto del sistema que llega a un modelo de lenguaje. Siempre
   * responde 200: si el modelo no está disponible, devuelve la reserva.
   */
  @Post()
  @HttpCode(200)
  draft(@Body() body: DraftRequestDto): Promise<DraftResponse> {
    return this.service.draft(body);
  }
}
