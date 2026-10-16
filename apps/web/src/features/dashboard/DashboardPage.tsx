import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { brl, currentMonth, monthShort } from '../../lib/format';
import type { Summary } from '../../lib/types';
import { Empty, Input, PageHeader } from '../../components/ui';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'income' | 'expense' }) {
  const color = tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : '';
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{brl(value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => api<Summary>('/dashboard/summary', { query: { month } }),
  });

  const chartData = data?.monthly.map((m) => ({
    mes: monthShort(m.month),
    Receitas: m.income / 100,
    Despesas: m.expense / 100,
  }));

  return (
    <>
      <PageHeader title="Visão geral">
        <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mês" />
      </PageHeader>

      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      {error && <p className="text-sm text-expense">{(error as Error).message}</p>}

      {data && (
        <div className="space-y-6">
          <section className="grid divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Stat label="Saldo total" value={data.totalBalance} />
            <Stat label="Receitas do mês" value={data.income} tone="income" />
            <Stat label="Despesas do mês" value={data.expense} tone="expense" />
            <Stat label="Resultado do mês" value={data.result} tone={data.result >= 0 ? 'income' : 'expense'} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="mb-4 font-semibold">Receitas e despesas nos últimos 6 meses</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid vertical={false} stroke="#dbe3e1" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={48}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                    <Tooltip formatter={(v) => brl(Math.round(Number(v) * 100))} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Receitas" fill="#1f8a5b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#c0392b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="mb-4 font-semibold">Para onde foi o dinheiro</h2>
              {data.byCategory.length === 0 ? (
                <Empty>Nenhuma despesa neste mês.</Empty>
              ) : (
                <ul className="space-y-3">
                  {data.byCategory.map((c) => (
                    <li key={c.categoryId}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{c.name}</span>
                        <span className="font-medium">{brl(c.total)} <span className="text-muted">({c.percent}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-paper">
                        <div className="h-2 rounded-full" style={{ width: `${c.percent}%`, background: c.color }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
