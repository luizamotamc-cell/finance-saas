import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const [accounts, sums] = await Promise.all([
      this.prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);
    const total = (accountId: string, type: 'INCOME' | 'EXPENSE') =>
      sums.find((s) => s.accountId === accountId && s.type === type)?._sum.amount ?? 0;

    return accounts.map((a) => ({
      ...a,
      balance: a.initialBalance + total(a.id, 'INCOME') - total(a.id, 'EXPENSE'),
    }));
  }

  create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    const count = await this.prisma.transaction.count({ where: { accountId: id, userId } });
    if (count > 0) {
      throw new ConflictException('Esta conta tem transações. Exclua ou mova as transações antes.');
    }
    await this.prisma.account.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const acc = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!acc) throw new NotFoundException('Conta não encontrada');
    return acc;
  }
}
