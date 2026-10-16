import { PartialType } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsUUID() accountId: string;
  @IsUUID() categoryId: string;

  /** em centavos, positivo */
  @IsInt() @Min(1)
  amount: number;

  @IsEnum(TxType)
  type: TxType;

  /** YYYY-MM-DD */
  @IsDateString({ strict: true })
  date: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class ListTransactionsQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(TxType) type?: TxType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
