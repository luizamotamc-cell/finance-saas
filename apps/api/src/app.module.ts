import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite geral: 100 requisições por minuto por IP.
    // Login, cadastro, refresh e recuperação de senha têm limites mais baixos (veja auth.controller.ts).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      errorMessage: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
      // Os testes automáticos desligam o limite (setup-env.ts); só os testes de limite o ligam.
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
