import { PartialType } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  /** em centavos (pode ser negativo) */
  @IsOptional() @IsInt()
  initialBalance?: number;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}
