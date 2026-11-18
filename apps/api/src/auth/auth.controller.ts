import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

const MINUTE = 60_000;

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: MINUTE } }) @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public() @Throttle({ default: { limit: 5, ttl: MINUTE } }) @HttpCode(200) @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public() @Throttle({ default: { limit: 30, ttl: MINUTE } }) @HttpCode(200) @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // Responde sempre a mesma coisa, exista ou não uma conta com esse e-mail
  // (para não revelar quem está cadastrado).
  @Public() @Throttle({ default: { limit: 3, ttl: MINUTE } }) @HttpCode(200) @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.' };
  }

  @Public() @Throttle({ default: { limit: 5, ttl: MINUTE } }) @HttpCode(200) @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Senha alterada. Você já pode entrar.' };
  }

  @HttpCode(204) @Post('logout')
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
