import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.service';
import { resetPasswordEmail } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

const RESET_TTL_MS = 60 * 60 * 1000; // o link vale 1 hora
const RESET_COOLDOWN_MS = 60 * 1000; // no máximo 1 e-mail por minuto para a mesma conta
const INVALID_RESET = 'Link inválido ou expirado. Peça um novo link.';

const DEFAULT_CATEGORIES = [
  { name: 'Salário', type: 'INCOME' as const, color: '#1f8a5b' },
  { name: 'Freelance', type: 'INCOME' as const, color: '#2f9e8f' },
  { name: 'Investimentos', type: 'INCOME' as const, color: '#4c8bd6' },
  { name: 'Moradia', type: 'EXPENSE' as const, color: '#7c5cbf' },
  { name: 'Alimentação', type: 'EXPENSE' as const, color: '#d9822b' },
  { name: 'Transporte', type: 'EXPENSE' as const, color: '#3b82a6' },
  { name: 'Saúde', type: 'EXPENSE' as const, color: '#c0392b' },
  { name: 'Lazer', type: 'EXPENSE' as const, color: '#c0508a' },
  { name: 'Outros', type: 'EXPENSE' as const, color: '#64748b' },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  /**
   * Se INVITE_CODE estiver definido no servidor, o cadastro exige esse código.
   * Vazio ou ausente = cadastro aberto. Roda ANTES de qualquer consulta ao banco, para quem não
   * tem o código nem conseguir descobrir se um e-mail já está cadastrado.
   */
  private assertInvite(code?: string) {
    const required = (this.config.get<string>('INVITE_CODE') ?? '').trim();
    if (!required) return;
    // Compara os hashes: tempo constante e sem revelar o tamanho do código.
    const given = createHash('sha256').update((code ?? '').trim()).digest();
    const expected = createHash('sha256').update(required).digest();
    if (!timingSafeEqual(given, expected)) throw new ForbiddenException('Código de convite inválido.');
  }

  async register(dto: RegisterDto) {
    this.assertInvite(dto.inviteCode);
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Este e-mail já está cadastrado');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        accounts: { create: [{ name: 'Carteira', type: 'WALLET' }] },
        categories: { create: DEFAULT_CATEGORIES },
      },
    });
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('E-mail ou senha incorretos');
    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshTokenHash !== sha256(refreshToken)) {
      throw new UnauthorizedException('Sessão expirada');
    }
    return this.issueTokens(user.id, user.email);
  }

  /** Gera o link de redefinição e o envia por e-mail. Não revela se o e-mail existe. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    // Evita encher a caixa de entrada de alguém com pedidos repetidos.
    const last = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < RESET_COOLDOWN_MS) return;

    // Um pedido novo invalida os links anteriores. No banco fica só o hash do token.
    const token = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);

    // O token vai no fragmento (#), que o navegador não envia ao servidor nem entra nos logs do nginx.
    const base = (this.config.get<string>('APP_URL') || 'http://localhost:8080').replace(/\/+$/, '');
    const link = `${base}/redefinir-senha#token=${token}`;

    // Sem "await": a resposta não demora mais para quem tem conta (não revela quem está cadastrado).
    void this.mail.send(resetPasswordEmail(user.name, user.email, link)).catch((err) => {
      this.logger.error(`Falha ao enviar o e-mail de redefinição: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /** Troca a senha usando o token do e-mail. O token só funciona uma vez e por 1 hora. */
  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!record || record.expiresAt.getTime() < Date.now()) throw new BadRequestException(INVALID_RESET);

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      // Apagar o token é o que o "consome": se duas requisições chegarem juntas, só uma passa.
      const claimed = await tx.passwordResetToken.deleteMany({
        where: { id: record.id, expiresAt: { gt: new Date() } },
      });
      if (claimed.count === 0) throw new BadRequestException(INVALID_RESET);
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
      // Zerar o refresh token encerra as sessões abertas em outros dispositivos.
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, refreshTokenHash: null } });
    });
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  }

  private async issueTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwt.signAsync(
        { sub: userId, email, jti: randomUUID() },
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      ),
    ]);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: sha256(refreshToken) },
    });
    return { accessToken, refreshToken };
  }
}
