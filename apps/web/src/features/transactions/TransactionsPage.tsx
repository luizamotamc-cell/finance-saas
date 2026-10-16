import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { brl, currentMonth, formatDate, monthRange } from '../../lib/format';
import { useAccounts, useCategories } from '../../lib/hooks';
import type { Paginated, Transaction, TxType } from '../../lib/types';
import { Button, Empty, Input, Modal, PageHeader, Select } from '../../components/ui';
import TransactionForm from './TransactionForm';

const LIMIT = 15;

export default function TransactionsPage() {
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const categories = useCategories().data ?? [];

  const [month, setMonth] = useState(currentMonth());
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<TxType | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const range = monthRange(month);
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', month, accountId, categoryId, type, page],
    queryFn: () =>
      api<Paginated<Transaction>>('/transactions', {
        query: { ...range, accountId, categoryId, type, page, limit: LIMIT },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const closeModal = () => { setCreating(false); setEditing(null); };

  return (
    <>
      <PageHeader title="Transações">
        <Button onClick={() => setCreating(true)}>Nova transação</Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input type="month" aria-label="Mês" value={month}
          onChange={(e) => e.target.value && onFilter(setMonth)(e.target.value)} />
        <Select aria-label="Conta" value={accountId} onChange={(e) => onFilter(setAccountId)(e.target.value)}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select aria-label="Categoria" value={categoryId} onChange={(e) => onFilter(setCategoryId)(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="Tipo" value={type} onChange={(e) => onFilter(setType)(e.target.value as TxType | '')}>
          <option value="">Receitas e despesas</option>
          <option value="INCOME">Só receitas</option>
          <option value="EXPENSE">Só despesas</option>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      {error && <p className="text-sm text-expense">{(error as Error).message}</p>}

      {data && data.items.length === 0 && (
        <Empty>Nenhuma transação encontrada. Use “Nova transação” para registrar a primeira.</Empty>
      )}

      {data && data.items.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {data.items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: t.category.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.description || t.category.name}</p>
                <p className="truncate text-xs text-muted">
                  {formatDate(t.date)} · {t.category.name} · {t.account.name}
                </p>
              </div>
              <span className={`text-sm font-semibold ${t.type === 'INCOME' ? 'text-income' : 'text-expense'}`}>
                {t.type === 'INCOME' ? '+' : '−'} {brl(t.amount)}
              </span>
              <div className="flex">
                <Button variant="text" size="sm" onClick={() => setEditing(t)}>Editar</Button>
                <Button variant="danger" size="sm"
                  onClick={() => window.confirm('Excluir esta transação?') && remove.mutate(t.id)}>
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > LIMIT && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-muted">Página {page} de {pages}</span>
          <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}

      <Modal open={creating || !!editing} onClose={closeModal} title={editing ? 'Editar transação' : 'Nova transação'}>
        <TransactionForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onDone={closeModal} />
      </Modal>
    </>
  );
}
