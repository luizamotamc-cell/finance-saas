import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

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
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
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
