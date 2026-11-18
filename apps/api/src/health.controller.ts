import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators';

// Usado pela hospedagem para saber se a API está de pé.
// De propósito NÃO consulta o banco: assim ele não é "acordado" à toa (no Neon grátis, banco ligado gasta horas).
@Controller('health')
export class HealthController {
  @Public() @SkipThrottle() @Get()
  check() {
    return { status: 'ok' };
  }
}
