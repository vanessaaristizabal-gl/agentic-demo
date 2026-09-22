import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);

  const logger = new Logger('bootstrap');
  logger.log(`API escuchando en http://localhost:${port}/api`);
  logger.log(
    process.env.ANTHROPIC_API_KEY
      ? 'ANTHROPIC_API_KEY detectada: «Redactar con IA» usará el modelo.'
      : 'Sin ANTHROPIC_API_KEY: «Redactar con IA» devolverá el texto de reserva.',
  );
}

void bootstrap();
