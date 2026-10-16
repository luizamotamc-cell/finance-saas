import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @Transform(normalizeEmail) @IsEmail()
  email: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;
}

export class LoginDto {
  @Transform(normalizeEmail) @IsEmail()
  email: string;

  @IsString() @IsNotEmpty()
  password: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty()
  refreshToken: string;
}
