import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerUser, TestUser, tx } from './helpers';

describe('Regras de negócio: saldo, validação e dashboard', () => {
  let app: INestApplication;
  let u: TestUser;

  beforeAll(async () => {
    app = await createApp();
  });
  beforeEach(async () => {
    u = await registerUser(app, 'biz'); // usuário novo a cada teste = estado limpo
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());
  const balanceOf = async (accountId: string) => {
    const res = await http().get('/api/accounts').set(u.auth).expect(200);
    return res.body.find((a: any) => a.id === accountId).balance as number;
  };

  describe('saldo da conta', () => {
    it('saldo = inicial + receitas - despesas', async () => {
      const acc = await http().post('/api/accounts').set(u.auth).send({ name: 'Banco', type: 'CHECKING', initialBalance: 10000 }).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { accountId: acc.body.id, type: 'INCOME', categoryId: u.incomeCategoryId, amount: 5000 })).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { accountId: acc.body.id, amount: 1200 })).expect(201);
      expect(await balanceOf(acc.body.id)).toBe(13800);
    });

    it('editar valor, trocar tipo e excluir atualizam o saldo', async () => {
      const t = await http().post('/api/transactions').set(u.auth).send(tx(u, { amount: 1000 })).expect(201);
      expect(await balanceOf(u.accountId)).toBe(-1000);

      await http().patch(`/api/transactions/${t.body.id}`).set(u.auth).send({ amount: 2500 }).expect(200);
      expect(await balanceOf(u.accountId)).toBe(-2500);

      await http().patch(`/api/transactions/${t.body.id}`).set(u.auth).send({ type: 'INCOME', categoryId: u.incomeCategoryId }).expect(200);
      expect(await balanceOf(u.accountId)).toBe(2500);

      await http().delete(`/api/transactions/${t.body.id}`).set(u.auth).expect(204);
      expect(await balanceOf(u.accountId)).toBe(0);
    });

    it('mover transação entre contas move o saldo', async () => {
      const other = await http().post('/api/accounts').set(u.auth).send({ name: 'Outra', type: 'SAVINGS' }).expect(201);
      const t = await http().post('/api/transactions').set(u.auth).send(tx(u, { amount: 700 })).expect(201);
      await http().patch(`/api/transactions/${t.body.id}`).set(u.auth).send({ accountId: other.body.id }).expect(200);
      expect(await balanceOf(u.accountId)).toBe(0);
      expect(await balanceOf(other.body.id)).toBe(-700);
    });

    it('não apaga conta nem categoria que tem transações (409)', async () => {
      await http().post('/api/transactions').set(u.auth).send(tx(u)).expect(201);
      await http().delete(`/api/accounts/${u.accountId}`).set(u.auth).expect(409);
      await http().delete(`/api/categories/${u.expenseCategoryId}`).set(u.auth).expect(409);
    });
  });

  describe('validação de transação', () => {
    it('categoria de receita em despesa → 400', async () => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { categoryId: u.incomeCategoryId })).expect(400);
    });

    it.each([[0], [-1], [10.5], ['abc'], [null]])('amount inválido (%p) → 400', async (amount) => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { amount })).expect(400);
    });

    it('amount acima do limite do Int (2^31) → 400, não 500', async () => {
      // BUG CONHECIDO: o DTO não tem @Max, então hoje isto provavelmente devolve 500.
      await http().post('/api/transactions').set(u.auth).send(tx(u, { amount: 2147483648 })).expect(400);
    });

    it.each([['2026-13-01'], ['01/11/2026'], ['ontem'], ['']])('data inválida (%p) → 400', async (date) => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { date })).expect(400);
    });

    it('data com hora/fuso não pode mudar o dia salvo', async () => {
      // 23:30 em Brasília (UTC-3) ainda é dia 05. Se virar dia 06, há bug de fuso.
      const res = await http().post('/api/transactions').set(u.auth).send(tx(u, { date: '2026-11-05T23:30:00-03:00' }));
      if (res.status === 201) expect(res.body.date.slice(0, 10)).toBe('2026-11-05');
      else expect(res.status).toBe(400); // rejeitar também é um comportamento aceitável
    });

    it('descrição acima de 200 caracteres → 400', async () => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { description: 'x'.repeat(201) })).expect(400);
    });

    it('limit acima de 100 → 400', async () => {
      await http().get('/api/transactions').query({ limit: 101 }).set(u.auth).expect(400);
    });
  });

  describe('paginação e filtros', () => {
    it('pagina corretamente e ordena por data desc', async () => {
      for (let d = 1; d <= 5; d++) {
        await http().post('/api/transactions').set(u.auth).send(tx(u, { date: `2026-11-0${d}`, amount: d * 100 })).expect(201);
      }
      const p1 = await http().get('/api/transactions').query({ page: 1, limit: 2 }).set(u.auth).expect(200);
      const p3 = await http().get('/api/transactions').query({ page: 3, limit: 2 }).set(u.auth).expect(200);
      expect(p1.body.total).toBe(5);
      expect(p1.body.items.map((t: any) => t.amount)).toEqual([500, 400]);
      expect(p3.body.items.map((t: any) => t.amount)).toEqual([100]);
    });

    it('filtro from/to é inclusivo nas duas pontas', async () => {
      for (const date of ['2026-10-31', '2026-11-01', '2026-11-30', '2026-12-01']) {
        await http().post('/api/transactions').set(u.auth).send(tx(u, { date })).expect(201);
      }
      const res = await http().get('/api/transactions').query({ from: '2026-11-01', to: '2026-11-30' }).set(u.auth).expect(200);
      expect(res.body.items.map((t: any) => t.date.slice(0, 10)).sort()).toEqual(['2026-11-01', '2026-11-30']);
    });
  });

  describe('dashboard', () => {
    it('separa corretamente transações na virada de mês', async () => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { date: '2026-10-31', amount: 111 })).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { date: '2026-11-01', amount: 222 })).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { date: '2026-11-30', amount: 333 })).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { date: '2026-12-01', amount: 444 })).expect(201);

      const nov = await http().get('/api/dashboard/summary').query({ month: '2026-11' }).set(u.auth).expect(200);
      expect(nov.body.expense).toBe(222 + 333);

      const series = Object.fromEntries(nov.body.monthly.map((m: any) => [m.month, m.expense]));
      expect(series['2026-10']).toBe(111);
      expect(series['2026-11']).toBe(555);
      expect(series['2026-12']).toBeUndefined(); // série termina no mês pedido
    });

    it('série tem 6 meses e atravessa a virada de ano', async () => {
      const res = await http().get('/api/dashboard/summary').query({ month: '2026-02' }).set(u.auth).expect(200);
      expect(res.body.monthly.map((m: any) => m.month)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    });

    it('resultado = receitas − despesas e percentuais por categoria somam ~100', async () => {
      await http().post('/api/transactions').set(u.auth).send(tx(u, { type: 'INCOME', categoryId: u.incomeCategoryId, amount: 10000 })).expect(201);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { amount: 3000 })).expect(201);
      const other = (await http().get('/api/categories').set(u.auth)).body.find((c: any) => c.type === 'EXPENSE' && c.id !== u.expenseCategoryId);
      await http().post('/api/transactions').set(u.auth).send(tx(u, { categoryId: other.id, amount: 1000 })).expect(201);

      const res = await http().get('/api/dashboard/summary').query({ month: '2026-11' }).set(u.auth).expect(200);
      expect(res.body.result).toBe(10000 - 4000);
      const pct = res.body.byCategory.reduce((s: number, c: any) => s + c.percent, 0);
      expect(pct).toBeGreaterThan(99.8);
      expect(pct).toBeLessThan(100.2);
      expect(res.body.totalBalance).toBe(6000);
    });

    it.each([['2026-13'], ['2026-00'], ['26-11'], ['novembro']])('month inválido (%p) → 400', async (month) => {
      await http().get('/api/dashboard/summary').query({ month }).set(u.auth).expect(400);
    });
  });

  describe('categorias', () => {
    it('nome duplicado no mesmo tipo → 409', async () => {
      await http().post('/api/categories').set(u.auth).send({ name: 'Pets', type: 'EXPENSE' }).expect(201);
      await http().post('/api/categories').set(u.auth).send({ name: 'Pets', type: 'EXPENSE' }).expect(409);
    });
    it('não permite alterar o tipo depois de criada', async () => {
      await http().patch(`/api/categories/${u.expenseCategoryId}`).set(u.auth).send({ type: 'INCOME' }).expect(400);
    });
    it('cor inválida → 400', async () => {
      await http().post('/api/categories').set(u.auth).send({ name: 'X', type: 'EXPENSE', color: 'vermelho' }).expect(400);
    });
  });
});
