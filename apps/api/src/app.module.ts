import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DraftModule } from './draft/draft.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // La clave vive en el .env de la raíz del repositorio, nunca en el cliente.
      envFilePath: ['../../.env', '../.env', '.env'],
    }),
    DraftModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
