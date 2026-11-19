import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @Transform(normalizeEmail) @IsEmail()
  email: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;

  /** Só é exigido quando a variável INVITE_CODE está definida no servidor. */
  @IsOptional() @IsString() @MaxLength(100)
  inviteCode?: string;
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

export class ForgotPasswordDto {
  @Transform(normalizeEmail) @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(200)
  token: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;
}
