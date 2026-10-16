import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private accounts: AccountsService) {}

  async summary(userId: string, month?: string) {
    const { year, monthIndex, key } = this.parseMonth(month);
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));
    const seriesStart = new Date(Date.UTC(year, monthIndex - 5, 1));

    const [accounts, totals, byCat, series] = await Promise.all([
      this.accounts.findAll(userId),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<{ month: string; type: 'INCOME' | 'EXPENSE'; total: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
               "type"::text AS type,
               SUM("amount")::int AS total
        FROM "Transaction"
        WHERE "userId" = ${userId} AND "date" >= ${seriesStart} AND "date" < ${end}
        GROUP BY 1, 2
        ORDER BY 1
      `),
    ]);

    const income = totals.find((t) => t.type === 'INCOME')?._sum.amount ?? 0;
    const expense = totals.find((t) => t.type === 'EXPENSE')?._sum.amount ?? 0;

    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: byCat.map((c) => c.categoryId) } },
    });
    const byCategory = byCat
      .map((c) => {
        const cat = categories.find((x) => x.id === c.categoryId);
        const total = c._sum.amount ?? 0;
        return {
          categoryId: c.categoryId,
          name: cat?.name ?? 'Sem categoria',
          color: cat?.color ?? '#64748b',
          total,
          percent: expense > 0 ? Math.round((total / expense) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(year, monthIndex - 5 + i, 1));
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const get = (type: string) => series.find((s) => s.month === k && s.type === type)?.total ?? 0;
      return { month: k, income: get('INCOME'), expense: get('EXPENSE') };
    });

    return {
      month: key,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      income,
      expense,
      result: income - expense,
      byCategory,
      monthly,
    };
  }

  private parseMonth(month?: string) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!m) throw new BadRequestException('month deve estar no formato YYYY-MM');
    return { year: Number(m[1]), monthIndex: Number(m[2]) - 1, key: month };
  }
}
