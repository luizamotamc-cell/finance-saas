import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AuthShell, Button, ErrorText, Field, Input } from '../../components/ui';

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (v) => {
    setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: v });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <AuthShell title="Esqueci minha senha" subtitle="Enviaremos um link para você criar uma nova.">
      {sent ? (
        <p className="rounded-md bg-brand-soft p-3 text-sm text-ink">
          Se esse e-mail estiver cadastrado, você receberá um link em instantes. Ele vale por 1 hora.
          Confira também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ErrorText>{error}</ErrorText>
          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </Field>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Enviando...' : 'Enviar link'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted">
        <Link to="/login" className="font-semibold text-brand underline">Voltar para o login</Link>
      </p>
    </AuthShell>
  );
}
