import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, uniqueEmail } from './helpers';

const CODE = 'convite-secreto-123';

// O INVITE_CODE é lido do ambiente a cada cadastro; cada bloco monta o ambiente que precisa
// e devolve o original no fim (os arquivos de teste rodam no mesmo processo).
describe('Cadastro com código de convite', () => {
  const previous = process.env.INVITE_CODE;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.INVITE_CODE = CODE;
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.INVITE_CODE;
    else process.env.INVITE_CODE = previous;
  });

  const register = (extra: Record<string, unknown> = {}, email = uniqueEmail('inv')) =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Teste', email, password: 'Senha@12345', ...extra });

  it('sem código → 403', async () => {
    const res = await register().expect(403);
    expect(res.body.message).toContain('convite');
  });

  it('código errado → 403 (e diferença de maiúsculas conta)', async () => {
    await register({ inviteCode: 'errado' }).expect(403);
    await register({ inviteCode: CODE.toUpperCase() }).expect(403);
  });

  it('código certo → 201, e aceita espaços ao redor', async () => {
    await register({ inviteCode: CODE }).expect(201);
    await register({ inviteCode: `  ${CODE}  ` }).expect(201);
  });

  it('quem não tem o código não consegue descobrir se um e-mail já está cadastrado', async () => {
    const email = uniqueEmail('inv-dup');
    await register({ inviteCode: CODE }, email).expect(201);
    await register({}, email).expect(403); // e não 409
    await register({ inviteCode: CODE }, email).expect(409); // quem tem o código vê o conflito normal
  });

  it('o login não pede código', async () => {
    const email = uniqueEmail('inv-login');
    await register({ inviteCode: CODE }, email).expect(201);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: 'Senha@12345' }).expect(200);
  });

  it('código comprido demais → 400', async () => {
    await register({ inviteCode: 'x'.repeat(101) }).expect(400);
  });
});

describe('Cadastro sem INVITE_CODE', () => {
  const previous = process.env.INVITE_CODE;
  let app: INestApplication;

  beforeAll(async () => {
    delete process.env.INVITE_CODE;
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.INVITE_CODE;
    else process.env.INVITE_CODE = previous;
  });

  const register = (extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Teste', email: uniqueEmail('open'), password: 'Senha@12345', ...extra });

  it('fica aberto: aceita com ou sem código', async () => {
    await register().expect(201);
    await register({ inviteCode: 'qualquer-coisa' }).expect(201);
  });

  it('valor vazio ou só espaços também deixa o cadastro aberto', async () => {
    process.env.INVITE_CODE = '   ';
    await register().expect(201);
  });
});
