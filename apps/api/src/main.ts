import 'reflect-metadata';
import { existsSync } from 'fs';
import { join, sep } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Quantos proxies existem na frente da API (nginx no Docker Compose, o balanceador do Render etc.).
  // O limite de tentativas usa o IP real do usuário, e isso depende deste número.
  const hops = Number(process.env.TRUST_PROXY ?? 1);
  app.set('trust proxy', Number.isNaN(hops) ? 1 : hops);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const doc = new DocumentBuilder().setTitle('Finance API').setVersion('0.1').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  // Contêiner único: se WEB_DIST_DIR existir, a própria API entrega o site (arquivos do Vite).
  // No Docker Compose esta parte fica desligada, porque quem entrega o site é o nginx.
  const webDir = process.env.WEB_DIST_DIR;
  if (webDir && existsSync(join(webDir, 'index.html'))) {
    app.useStaticAssets(webDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Arquivos em /assets têm hash no nome: podem ficar em cache por 1 ano. O resto, nunca.
        res.setHeader(
          'Cache-Control',
          filePath.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
    // Qualquer endereço de página (ex.: /transacoes, /redefinir-senha) devolve o index.html do React.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(webDir, 'index.html'));
    });
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
