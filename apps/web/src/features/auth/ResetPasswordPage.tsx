import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AuthShell, Button, ErrorText, Field, Input } from '../../components/ui';

const schema = z
  .object({
    password: z.string().min(8, 'Use pelo menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'As senhas não são iguais', path: ['confirm'] });
type Values = z.infer<typeof schema>;

// O token vem no fragmento do endereço (#token=...), que o navegador não envia ao servidor.
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';

export default function ResetPasswordPage() {
  const [token] = useState(readToken);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (v) => {
    setError('');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password: v.password } });
      window.history.replaceState(null, '', window.location.pathname); // tira o token da barra de endereço
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  if (done) {
    return (
      <AuthShell title="Senha alterada" subtitle="Tudo certo.">
        <p className="rounded-md bg-brand-soft p-3 text-sm text-ink">
          Sua senha foi alterada. Agora você já pode entrar com a nova senha.
        </p>
        <p className="mt-6 text-sm">
          <Link to="/login" className="font-semibold text-brand underline">Ir para o login</Link>
        </p>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell title="Link inválido" subtitle="Não encontramos o código de redefinição.">
        <p className="text-sm text-muted">
          Abra o link completo que enviamos por e-mail, ou{' '}
          <Link to="/esqueci-senha" className="font-semibold text-brand underline">peça um novo link</Link>.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Nova senha" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Repita a nova senha" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Link expirado?{' '}
        <Link to="/esqueci-senha" className="font-semibold text-brand underline">Peça outro</Link>
      </p>
    </AuthShell>
  );
}
