import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, ListTransactionsQuery, UpdateTransactionDto } from './dto/transaction.dto';

const include = {
  category: { select: { id: true, name: true, color: true } },
  account: { select: { id: true, name: true } },
} satisfies Prisma.TransactionInclude;

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, q: ListTransactionsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(q.accountId && { accountId: q.accountId }),
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(q.type && { type: q.type }),
      ...((q.from || q.to) && {
        date: {
          ...(q.from && { gte: new Date(q.from) }),
          ...(q.to && { lte: new Date(q.to) }),
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertRefs(userId, dto.accountId, dto.categoryId, dto.type);
    return this.prisma.transaction.create({
      data: { ...dto, date: new Date(dto.date), userId },
      include,
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.findOne(userId, id);
    await this.assertRefs(
      userId,
      dto.accountId ?? current.accountId,
      dto.categoryId ?? current.categoryId,
      dto.type ?? current.type,
    );
    const { date, ...rest } = dto;
    return this.prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
      include,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  private async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Transação não encontrada');
    return tx;
  }

  /** Garante que conta e categoria pertencem ao usuário e que a categoria combina com o tipo. */
  private async assertRefs(userId: string, accountId: string, categoryId: string, type: TxType) {
    const [account, category] = await Promise.all([
      this.prisma.account.findFirst({ where: { id: accountId, userId } }),
      this.prisma.category.findFirst({ where: { id: categoryId, userId } }),
    ]);
    if (!account) throw new NotFoundException('Conta não encontrada');
    if (!category) throw new NotFoundException('Categoria não encontrada');
    if (category.type !== type) {
      throw new BadRequestException('A categoria não corresponde ao tipo da transação');
    }
  }
}
