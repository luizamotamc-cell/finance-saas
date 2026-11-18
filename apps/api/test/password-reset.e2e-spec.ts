import { INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import request from 'supertest';
import { Mail, MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, registerUser, uniqueEmail } from './helpers';

// E-mail falso: guarda o que "foi enviado" para o teste ler o link.
class FakeMail {
  sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
}

const tokenFrom = (m: Mail) => /#token=([a-f0-9]+)/.exec(m.text)![1];
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const NEW_PASSWORD = 'NovaSenha@456';

describe('Recuperação de senha', () => {
  let app: INestApplication;
  let mail: FakeMail;
  let prisma: PrismaService;

  beforeAll(async () => {
    mail = new FakeMail();
    app = await createApp((b) => b.overrideProvider(MailService).useValue(mail));
    prisma = app.get(PrismaService);
  });
  beforeEach(() => {
    mail.sent = [];
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());
  const forgot = (email: string) => http().post('/api/auth/forgot-password').send({ email });
  const reset = (token: string, password: string) => http().post('/api/auth/reset-password').send({ token, password });
  const login = (email: string, password: string) => http().post('/api/auth/login').send({ email, password });

  it('fluxo completo: pede, recebe o link, redefine e entra com a nova senha', async () => {
    const u = await registerUser(app, 'reset');
    await forgot(u.email).expect(200);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(u.email);
    expect(mail.sent[0].text).toContain('/redefinir-senha#token=');

    await reset(tokenFrom(mail.sent[0]), NEW_PASSWORD).expect(200);
    await login(u.email, 'Senha@12345').expect(401);
    await login(u.email, NEW_PASSWORD).expect(200);
  });

  it('a resposta é igual para e-mail cadastrado e não cadastrado, e só o cadastrado recebe e-mail', async () => {
    const u = await registerUser(app, 'enum');
    const known = await forgot(u.email).expect(200);
    const unknown = await forgot(uniqueEmail('naoexiste')).expect(200);

    expect(unknown.body).toEqual(known.body);
    expect(mail.sent).toHaveLength(1);
  });

  it('aceita o e-mail com maiúsculas e espaços', async () => {
    const u = await registerUser(app, 'case');
    await forgot(`  ${u.email.toUpperCase()} `).expect(200);
    expect(mail.sent).toHaveLength(1);
  });

  it('e-mail inválido → 400', async () => {
    await forgot('nao-e-email').expect(400);
  });

  it('no banco fica só o hash do token, nunca o token', async () => {
    const u = await registerUser(app, 'hash');
    await forgot(u.email).expect(200);
    const token = tokenFrom(mail.sent[0]);

    expect(await prisma.passwordResetToken.findFirst({ where: { tokenHash: token } })).toBeNull();
    expect(await prisma.passwordResetToken.findFirst({ where: { tokenHash: sha256(token) } })).not.toBeNull();
  });

  it('o token só funciona uma vez', async () => {
    const u = await registerUser(app, 'once');
    await forgot(u.email).expect(200);
    const token = tokenFrom(mail.sent[0]);

    await reset(token, NEW_PASSWORD).expect(200);
    await reset(token, 'OutraSenha@789').expect(400);
    await login(u.email, NEW_PASSWORD).expect(200);
  });

  it('duas redefinições simultâneas com o mesmo token: só uma vence', async () => {
    const u = await registerUser(app, 'race');
    await forgot(u.email).expect(200);
    const token = tokenFrom(mail.sent[0]);

    const [a, b] = await Promise.all([reset(token, 'SenhaA@12345'), reset(token, 'SenhaB@12345')]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
  });

  it('token inexistente → 400; token curto demais → 400', async () => {
    await reset('a'.repeat(64), NEW_PASSWORD).expect(400);
    await reset('curto', NEW_PASSWORD).expect(400);
  });

  it('senha fraca é recusada e o link continua valendo', async () => {
    const u = await registerUser(app, 'weak');
    await forgot(u.email).expect(200);
    const token = tokenFrom(mail.sent[0]);

    await reset(token, '123').expect(400);
    await reset(token, 'x'.repeat(73)).expect(400);
    await reset(token, NEW_PASSWORD).expect(200);
  });

  it('link expirado → 400 e a senha não muda', async () => {
    const u = await registerUser(app, 'expired');
    await forgot(u.email).expect(200);
    const token = tokenFrom(mail.sent[0]);

    await prisma.passwordResetToken.update({
      where: { tokenHash: sha256(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await reset(token, NEW_PASSWORD).expect(400);
    await login(u.email, 'Senha@12345').expect(200);
  });

  it('redefinir a senha encerra as sessões abertas (o refresh token deixa de valer)', async () => {
    const u = await registerUser(app, 'sessions');
    await forgot(u.email).expect(200);
    await reset(tokenFrom(mail.sent[0]), NEW_PASSWORD).expect(200);

    await http().post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401);
  });

  it('pedidos repetidos em seguida mandam um só e-mail; um pedido novo invalida o link anterior', async () => {
    const u = await registerUser(app, 'cooldown');
    await forgot(u.email).expect(200);
    await forgot(u.email).expect(200); // dentro de 1 minuto: ignorado
    expect(mail.sent).toHaveLength(1);
    const first = tokenFrom(mail.sent[0]);

    // "Passa o tempo": recua a data do pedido para fora da janela de 1 minuto.
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: u.email } });
    await prisma.passwordResetToken.updateMany({
      where: { userId: dbUser.id },
      data: { createdAt: new Date(Date.now() - 120_000) },
    });

    await forgot(u.email).expect(200);
    expect(mail.sent).toHaveLength(2);
    const second = tokenFrom(mail.sent[1]);

    await reset(first, NEW_PASSWORD).expect(400);
    await reset(second, NEW_PASSWORD).expect(200);
  });

  it('o usuário não é afetado se outra pessoa pedir a redefinição da conta dele', async () => {
    const u = await registerUser(app, 'victim');
    await forgot(u.email).expect(200);
    await login(u.email, 'Senha@12345').expect(200);
  });
});

describe('Limite de pedidos de recuperação', () => {
  const previous = process.env.THROTTLE_DISABLED;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'false';
    app = await createApp((b) => b.overrideProvider(MailService).useValue(new FakeMail()));
  });
  afterAll(async () => {
    await app.close();
    process.env.THROTTLE_DISABLED = previous;
  });

  it('bloqueia o 4º pedido em um minuto', async () => {
    const send = () =>
      request(app.getHttpServer()).post('/api/auth/forgot-password').send({ email: uniqueEmail('lim') });
    for (let i = 0; i < 3; i++) await send().expect(200);
    await send().expect(429);
  });
});
