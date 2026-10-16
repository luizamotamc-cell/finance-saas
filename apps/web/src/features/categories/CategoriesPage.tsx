import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useCategories } from '../../lib/hooks';
import type { Category, TxType } from '../../lib/types';
import { Button, ErrorText, Field, Input, Modal, PageHeader, Select } from '../../components/ui';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria').max(40),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
type Values = z.infer<typeof schema>;

function CategoryForm({ initial, onDone }: { initial?: Category; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', type: initial?.type ?? 'EXPENSE', color: initial?.color ?? '#64748b' },
  });

  const save = useMutation({
    mutationFn: (v: Values) =>
      initial
        ? api(`/categories/${initial.id}`, { method: 'PATCH', body: { name: v.name, color: v.color } })
        : api('/categories', { method: 'POST', body: v }),
    onSuccess: () => { qc.invalidateQueries(); onDone(); },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => { setError(''); save.mutate(v); })} className="space-y-4" noValidate>
      <ErrorText>{error}</ErrorText>
      <Field label="Nome" error={errors.name?.message}>
        <Input {...register('name')} />
      </Field>
      {initial ? (
        <p className="text-sm text-muted">
          Tipo: <strong className="text-ink">{initial.type === 'INCOME' ? 'Receita' : 'Despesa'}</strong> (não pode ser alterado)
        </p>
      ) : (
        <Field label="Tipo">
          <Select {...register('type')}>
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
        </Field>
      )}
      <Field label="Cor">
        <input type="color" className="h-10 w-16 cursor-pointer rounded border border-line bg-white" {...register('color')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const remove = useMutation({
    mutationFn: (id: string) => api(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setError(''); qc.invalidateQueries(); },
    onError: (e) => setError((e as Error).message),
  });

  const close = () => { setCreating(false); setEditing(null); };

  const column = (type: TxType, title: string) => (
    <section>
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ul className="divide-y divide-line rounded-lg border border-line bg-white">
        {data?.filter((c) => c.type === type).map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: c.color }} aria-hidden />
            <span className="flex-1 text-sm">{c.name}</span>
            <Button variant="text" size="sm" onClick={() => setEditing(c)}>Editar</Button>
            <Button variant="danger" size="sm"
              onClick={() => window.confirm(`Excluir a categoria “${c.name}”?`) && remove.mutate(c.id)}>
              Excluir
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <PageHeader title="Categorias">
        <Button onClick={() => setCreating(true)}>Nova categoria</Button>
      </PageHeader>
      <ErrorText>{error}</ErrorText>
      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      <div className="mt-2 grid gap-6 md:grid-cols-2">
        {column('EXPENSE', 'Despesas')}
        {column('INCOME', 'Receitas')}
      </div>
      <Modal open={creating || !!editing} onClose={close} title={editing ? 'Editar categoria' : 'Nova categoria'}>
        <CategoryForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onDone={close} />
      </Modal>
    </>
  );
}
