import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerUser, TestUser, tx } from './helpers';

describe('Isolamento entre usuários e autenticação', () => {
  let app: INestApplication;
  let a: TestUser;
  let b: TestUser;
  let aTxId: string;

  beforeAll(async () => {
    app = await createApp();
    a = await registerUser(app, 'a');
    b = await registerUser(app, 'b');
    const res = await request(app.getHttpServer()).post('/api/transactions').set(a.auth).send(tx(a, { description: 'privado do A' })).expect(201);
    aTxId = res.body.id;
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  describe('rotas exigem login', () => {
    it.each([
      ['get', '/api/accounts'],
      ['get', '/api/categories'],
      ['get', '/api/transactions'],
      ['get', '/api/dashboard/summary'],
      ['get', '/api/auth/me'],
      ['post', '/api/auth/logout'],
    ])('%s %s sem token → 401', async (method, path) => {
      await (http() as any)[method](path).expect(401);
    });

    it('token inválido → 401', async () => {
      await http().get('/api/accounts').set('Authorization', 'Bearer lixo').expect(401);
    });
  });

  describe('B não alcança dados do A', () => {
    it('listagem de transações de B não contém a do A', async () => {
      const res = await http().get('/api/transactions').set(b.auth).expect(200);
      expect(JSON.stringify(res.body)).not.toContain(aTxId);
      expect(res.body.total).toBe(0);
    });

    it('filtrar por accountId do A não vaza nada', async () => {
      const res = await http().get('/api/transactions').query({ accountId: a.accountId }).set(b.auth).expect(200);
      expect(res.body.total).toBe(0);
    });

    it('PATCH na transação do A → 404', async () => {
      await http().patch(`/api/transactions/${aTxId}`).set(b.auth).send({ amount: 1 }).expect(404);
    });

    it('DELETE na transação do A → 404 e ela continua existindo', async () => {
      await http().delete(`/api/transactions/${aTxId}`).set(b.auth).expect(404);
      const res = await http().get('/api/transactions').set(a.auth).expect(200);
      expect(res.body.items.map((t: any) => t.id)).toContain(aTxId);
    });

    it('criar transação usando a conta do A → 404', async () => {
      await http().post('/api/transactions').set(b.auth).send(tx(b, { accountId: a.accountId })).expect(404);
    });

    it('criar transação usando a categoria do A → 404', async () => {
      await http().post('/api/transactions').set(b.auth).send(tx(b, { categoryId: a.expenseCategoryId })).expect(404);
    });

    it('mover transação do próprio B para a conta do A → 404', async () => {
      const mine = await http().post('/api/transactions').set(b.auth).send(tx(b)).expect(201);
      await http().patch(`/api/transactions/${mine.body.id}`).set(b.auth).send({ accountId: a.accountId }).expect(404);
    });

    it('editar/apagar conta do A → 404', async () => {
      await http().patch(`/api/accounts/${a.accountId}`).set(b.auth).send({ name: 'hack' }).expect(404);
      await http().delete(`/api/accounts/${a.accountId}`).set(b.auth).expect(404);
    });

    it('editar/apagar categoria do A → 404', async () => {
      await http().patch(`/api/categories/${a.expenseCategoryId}`).set(b.auth).send({ name: 'hack' }).expect(404);
      await http().delete(`/api/categories/${a.expenseCategoryId}`).set(b.auth).expect(404);
    });

    it('listas de contas e categorias de B só têm itens de B', async () => {
      const accounts = await http().get('/api/accounts').set(b.auth).expect(200);
      const cats = await http().get('/api/categories').set(b.auth).expect(200);
      expect(accounts.body.map((x: any) => x.id)).not.toContain(a.accountId);
      expect(cats.body.map((x: any) => x.id)).not.toContain(a.expenseCategoryId);
    });

    it('dashboard de B não soma dados do A', async () => {
      const res = await http().get('/api/dashboard/summary').query({ month: '2026-11' }).set(b.auth).expect(200);
      // B só tem a transação de 10,00 criada acima ("mine"); a do A (10,00 também) não pode somar
      expect(res.body.expense).toBe(1000);
    });
  });

  describe('mass assignment', () => {
    it('não aceita userId no corpo (forbidNonWhitelisted)', async () => {
      await http().post('/api/transactions').set(b.auth).send(tx(b, { userId: 'qualquer' })).expect(400);
    });
  });
});
