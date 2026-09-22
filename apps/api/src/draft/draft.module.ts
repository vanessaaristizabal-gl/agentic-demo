import { Module } from '@nestjs/common';
import { DraftController } from './draft.controller';
import { DraftService } from './draft.service';
import { AnthropicDraftGenerator } from './providers/anthropic.generator';
import { FallbackDraftWriter } from './providers/fallback.writer';

@Module({
  controllers: [DraftController],
  providers: [DraftService, AnthropicDraftGenerator, FallbackDraftWriter],
})
export class DraftModule {}
