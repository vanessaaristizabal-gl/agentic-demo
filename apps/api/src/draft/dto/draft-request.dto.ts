import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Contrato público de POST /api/draft.
 *
 * El servidor no conoce las entidades del dominio del cliente: recibe el
 * perfil ya resuelto. Todos los campos son opcionales a propósito, porque
 * el endpoint nunca debe fallar por validación durante una demo en vivo.
 */
export class DraftRequestDto {
  @IsOptional() @IsString() @MaxLength(120)
  clientName?: string;

  @IsOptional() @IsString() @MaxLength(120)
  practice?: string;

  @IsOptional() @IsString() @MaxLength(120)
  stack?: string;

  @IsOptional() @IsString() @MaxLength(60)
  seniority?: string;

  @IsOptional() @IsString() @MaxLength(60)
  consultantRole?: string;

  @IsOptional() @IsString() @MaxLength(20)
  englishLevel?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Type(() => String)
  skills?: string[];

  @IsOptional() @IsString() @MaxLength(160)
  teamName?: string;

  @IsOptional() @IsString() @MaxLength(160)
  vacancyTitle?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  context?: string;
}

export type DraftSource = 'anthropic' | 'reserva';

export interface DraftResponse {
  /** Descripción del puesto lista para pegar en la vacante. */
  description: string;
  /** De dónde salió el texto. La interfaz lo muestra tal cual. */
  source: DraftSource;
  model: string | null;
  /** Por qué se usó la reserva, si se usó. Texto legible, nunca un stack trace. */
  reason: string | null;
}
