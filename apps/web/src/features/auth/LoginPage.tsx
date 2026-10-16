import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AuthShell, Button, ErrorText, Field, Input } from '../../components/ui';

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError('');
    try {
      await login(v.email, v.password);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <AuthShell title="Entrar" subtitle="Acesse suas finanças.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-brand underline">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
