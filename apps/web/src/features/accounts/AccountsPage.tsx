import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { brl, centsToInput, toCents } from '../../lib/format';
import { useAccounts } from '../../lib/hooks';
import { ACCOUNT_TYPE_LABEL, Account, AccountType } from '../../lib/types';
import { Button, Empty, ErrorText, Field, Input, Modal, PageHeader, Select } from '../../components/ui';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da conta'),
  type: z.enum(['CHECKING', 'WALLET', 'CREDIT_CARD', 'SAVINGS']),
  initialBalance: z.string().refine((v) => v.trim() === '' || !Number.isNaN(toCents(v)), 'Valor inválido'),
});
type Values = z.infer<typeof schema>;

function AccountForm({ initial, onDone }: { initial?: Account; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'CHECKING',
      initialBalance: initial ? centsToInput(initial.initialBalance) : '',
    },
  });

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        name: v.name,
        type: v.type,
        initialBalance: v.initialBalance.trim() === '' ? 0 : toCents(v.initialBalance),
      };
      return initial
        ? api(`/accounts/${initial.id}`, { method: 'PATCH', body })
        : api('/accounts', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries(); onDone(); },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => { setError(''); save.mutate(v); })} className="space-y-4" noValidate>
      <ErrorText>{error}</ErrorText>
      <Field label="Nome" error={errors.name?.message}>
        <Input placeholder="Ex.: Nubank, Itaú, Carteira" {...register('name')} />
      </Field>
      <Field label="Tipo">
        <Select {...register('type')}>
          {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => (
            <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Saldo inicial (R$)" error={errors.initialBalance?.message}>
        <Input inputMode="decimal" placeholder="0,00" {...register('initialBalance')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useAccounts();
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const remove = useMutation({
    mutationFn: (id: string) => api(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setError(''); qc.invalidateQueries(); },
    onError: (e) => setError((e as Error).message),
  });

  const close = () => { setCreating(false); setEditing(null); };

  return (
    <>
      <PageHeader title="Contas">
        <Button onClick={() => setCreating(true)}>Nova conta</Button>
      </PageHeader>
      <ErrorText>{error}</ErrorText>
      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      {data?.length === 0 && <Empty>Você ainda não tem contas. Crie uma para registrar transações.</Empty>}

      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {data?.map((a) => (
          <li key={a.id} className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold">{a.name}</p>
            <p className="text-sm text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</p>
            <p className={`mt-3 text-xl font-bold ${a.balance < 0 ? 'text-expense' : ''}`}>{brl(a.balance)}</p>
            <div className="mt-3 flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>Editar</Button>
              <Button variant="danger" size="sm"
                onClick={() => window.confirm(`Excluir a conta “${a.name}”?`) && remove.mutate(a.id)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={creating || !!editing} onClose={close} title={editing ? 'Editar conta' : 'Nova conta'}>
        <AccountForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onDone={close} />
      </Modal>
    </>
  );
}
