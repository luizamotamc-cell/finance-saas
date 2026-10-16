import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AuthShell, Button, ErrorText, Field, Input } from '../../components/ui';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome'),
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres'),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError('');
    try {
      await signUp(v.name, v.email, v.password);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Nome" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Já tem conta? <Link to="/login" className="font-semibold text-brand underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
