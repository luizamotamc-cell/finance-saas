import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { centsToInput, today, toCents } from '../../lib/format';
import { useAccounts, useCategories } from '../../lib/hooks';
import type { Transaction } from '../../lib/types';
import { Button, ErrorText, Field, Input, Select } from '../../components/ui';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().refine((v) => toCents(v) > 0, 'Informe um valor maior que zero'),
  date: z.string().min(1, 'Informe a data'),
  accountId: z.string().min(1, 'Escolha a conta'),
  categoryId: z.string().min(1, 'Escolha a categoria'),
  description: z.string().max(200).optional(),
});
type Values = z.infer<typeof schema>;

export default function TransactionForm({ initial, onDone }: { initial?: Transaction; onDone: () => void }) {
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const categories = useCategories().data ?? [];
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          type: initial.type,
          amount: centsToInput(initial.amount),
          date: initial.date.slice(0, 10),
          accountId: initial.accountId,
          categoryId: initial.categoryId,
          description: initial.description ?? '',
        }
      : { type: 'EXPENSE', amount: '', date: today(), accountId: accounts[0]?.id ?? '', categoryId: '', description: '' },
  });

  const type = watch('type');
  const filtered = categories.filter((c) => c.type === type);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        type: v.type,
        amount: toCents(v.amount),
        date: v.date,
        accountId: v.accountId,
        categoryId: v.categoryId,
        description: v.description?.trim() || null,
      };
      return initial
        ? api(`/transactions/${initial.id}`, { method: 'PATCH', body })
        : api('/transactions', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries(); onDone(); },
    onError: (e) => setError((e as Error).message),
  });

  const pickType = (t: 'INCOME' | 'EXPENSE') => {
    setValue('type', t);
    setValue('categoryId', '');
  };

  return (
    <form onSubmit={handleSubmit((v) => { setError(''); save.mutate(v); })} className="space-y-4" noValidate>
      <ErrorText>{error}</ErrorText>

      <div className="grid grid-cols-2 gap-1 rounded-md bg-paper p-1" role="group" aria-label="Tipo">
        {(['EXPENSE', 'INCOME'] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => pickType(t)} aria-pressed={type === t}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${
              type === t ? (t === 'INCOME' ? 'bg-income text-white' : 'bg-expense text-white') : 'text-muted'
            }`}
          >
            {t === 'INCOME' ? 'Receita' : 'Despesa'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="0,00" {...register('amount')} />
        </Field>
        <Field label="Data" error={errors.date?.message}>
          <Input type="date" {...register('date')} />
        </Field>
      </div>

      <Field label="Conta" error={errors.accountId?.message}>
        <Select {...register('accountId')}>
          <option value="">Selecione</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>

      <Field label="Categoria" error={errors.categoryId?.message}>
        <Select {...register('categoryId')}>
          <option value="">Selecione</option>
          {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <Field label="Descrição (opcional)" error={errors.description?.message}>
        <Input {...register('description')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
