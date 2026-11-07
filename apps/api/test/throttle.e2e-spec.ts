import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerUser, uniqueEmail } from './helpers';

// Cada bloco cria o próprio app, porque o contador de tentativas fica na memória do app.
describe('Limite de tentativas', () => {
  const previous = process.env.THROTTLE_DISABLED;
  beforeAll(() => { process.env.THROTTLE_DISABLED = 'false'; });
  afterAll(() => { process.env.THROTTLE_DISABLED = previous; });

  describe('login', () => {
    let app: INestApplication;
    beforeAll(async () => { app = await createApp(); });
    afterAll(() => app.close());

    it('bloqueia a 6ª tentativa em um minuto, mesmo com a senha certa', async () => {
      const u = await registerUser(app, 'throttle');
      const http = () => request(app.getHttpServer());

      for (let i = 0; i < 5; i++) {
        await http().post('/api/auth/login').send({ email: u.email, password: 'errada!!' }).expect(401);
      }
      const blocked = await http().post('/api/auth/login').send({ email: u.email, password: 'Senha@12345' });
      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toContain('Muitas tentativas');
    });
  });

  describe('cadastro', () => {
    let app: INestApplication;
    beforeAll(async () => { app = await createApp(); });
    afterAll(() => app.close());

    it('bloqueia o 6º cadastro em um minuto', async () => {
      const http = () => request(app.getHttpServer());
      for (let i = 0; i < 5; i++) {
        await http().post('/api/auth/register')
          .send({ name: 'T', email: uniqueEmail('lim'), password: 'Senha@12345' }).expect(201);
      }
      await http().post('/api/auth/register')
        .send({ name: 'T', email: uniqueEmail('lim'), password: 'Senha@12345' }).expect(429);
    });
  });
});
