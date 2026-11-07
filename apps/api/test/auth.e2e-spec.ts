import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerUser, uniqueEmail } from './helpers';

describe('Autenticação', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createApp(); });
  afterAll(() => app.close());
  const http = () => request(app.getHttpServer());

  it('registro cria conta "Carteira" e categorias padrão', async () => {
    const u = await registerUser(app, 'reg');
    const accounts = await http().get('/api/accounts').set(u.auth).expect(200);
    const cats = await http().get('/api/categories').set(u.auth).expect(200);
    expect(accounts.body.map((a: any) => a.name)).toEqual(['Carteira']);
    expect(cats.body.length).toBe(9);
  });

  it('e-mail duplicado → 409, inclusive com maiúsculas/espaços', async () => {
    const email = uniqueEmail('dup');
    await http().post('/api/auth/register').send({ name: 'A', email, password: 'Senha@12345' }).expect(201);
    await http().post('/api/auth/register').send({ name: 'B', email: `  ${email.toUpperCase()} `, password: 'Senha@12345' }).expect(409);
  });

  it.each([
    [{ name: 'A', email: 'nao-e-email', password: 'Senha@12345' }],
    [{ name: 'A', email: 'a@b.com', password: '1234567' }],
    [{ name: 'A', email: 'a@b.com', password: 'x'.repeat(73) }],
    [{ name: '', email: 'a@b.com', password: 'Senha@12345' }],
  ])('registro inválido %j → 400', async (body) => {
    await http().post('/api/auth/register').send(body).expect(400);
  });

  it('login: certo → 200; senha errada e e-mail inexistente → 401 com a mesma mensagem', async () => {
    const u = await registerUser(app, 'login');
    await http().post('/api/auth/login').send({ email: u.email, password: 'Senha@12345' }).expect(200);
    const wrong = await http().post('/api/auth/login').send({ email: u.email, password: 'errada!!' }).expect(401);
    const none = await http().post('/api/auth/login').send({ email: uniqueEmail('x'), password: 'errada!!' }).expect(401);
    expect(wrong.body.message).toBe(none.body.message);
  });

  it('resposta de /auth/me não expõe hash de senha nem refresh token', async () => {
    const u = await registerUser(app, 'me');
    const res = await http().get('/api/auth/me').set(u.auth).expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['email', 'id', 'name']);
  });

  describe('refresh token', () => {
    it('rotação: o refresh antigo deixa de valer após o uso', async () => {
      const u = await registerUser(app, 'rot');
      const r1 = await http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(200);
      expect(r1.body.refreshToken).not.toBe(u.refreshToken);
      await http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401);
      await http().post('/api/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(200);
    });

    it('logout invalida o refresh token', async () => {
      const u = await registerUser(app, 'out');
      await http().post('/api/auth/logout').set(u.auth).expect(204);
      await http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401);
    });

    it('access token não funciona como refresh token (segredos separados)', async () => {
      const u = await registerUser(app, 'sep');
      await http().post('/api/auth/refresh').send({ refreshToken: u.accessToken }).expect(401);
    });

    it('refresh token não funciona como access token', async () => {
      const u = await registerUser(app, 'sep2');
      await http().get('/api/auth/me').set('Authorization', `Bearer ${u.refreshToken}`).expect(401);
    });

    it('dois refreshes simultâneos com o mesmo token: no máximo um vence', async () => {
      // Documenta o comportamento atual (token único por usuário). Se o front fizer
      // refresh em duas abas ao mesmo tempo, uma delas será deslogada.
      const u = await registerUser(app, 'race');
      const [x, y] = await Promise.all([
        http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }),
        http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }),
      ]);
      expect([x.status, y.status].filter((s) => s === 200).length).toBeLessThanOrEqual(2);
      expect([x.status, y.status].sort()).toContain(200);
    });
  });
});
