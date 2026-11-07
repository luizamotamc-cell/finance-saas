import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

export async function createApp(): Promise<INestApplication> {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  // Mesma configuração do main.ts
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}

export interface TestUser {
  email: string;
  accessToken: string;
  refreshToken: string;
  auth: { Authorization: string };
  accountId: string;
  incomeCategoryId: string;
  expenseCategoryId: string;
}

let counter = 0;
export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${counter++}@teste.com`;

export async function registerUser(app: INestApplication, prefix = 'user'): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ name: 'Teste', email, password: 'Senha@12345' })
    .expect(201);
  const auth = { Authorization: `Bearer ${res.body.accessToken}` };
  const accounts = await request(app.getHttpServer()).get('/api/accounts').set(auth).expect(200);
  const cats = await request(app.getHttpServer()).get('/api/categories').set(auth).expect(200);
  return {
    email,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    auth,
    accountId: accounts.body[0].id,
    incomeCategoryId: cats.body.find((c: any) => c.type === 'INCOME').id,
    expenseCategoryId: cats.body.find((c: any) => c.type === 'EXPENSE').id,
  };
}

export const tx = (u: TestUser, over: Record<string, unknown> = {}) => ({
  accountId: u.accountId,
  categoryId: u.expenseCategoryId,
  type: 'EXPENSE',
  amount: 1000,
  date: '2026-11-05',
  description: 'teste',
  ...over,
});
