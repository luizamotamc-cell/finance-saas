import { OmitType, PartialType } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(40)
  name: string;

  @IsEnum(TxType)
  type: TxType;

  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color deve estar no formato #rrggbb' })
  color?: string;
}

// O tipo não pode mudar depois de criada (evita inconsistência com transações existentes)
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['type'] as const)) {}
