import type { Mail } from './mail.service';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function resetPasswordEmail(name: string, to: string, link: string): Mail {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const greeting = first ? `Olá, ${first}.` : 'Olá.';

  const text = [
    greeting,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no Caixa.',
    'Abra o link abaixo para criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez:',
    '',
    link,
    '',
    'Se não foi você, ignore este e-mail: a sua senha continua a mesma.',
  ].join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#14232a">
  <p>${escapeHtml(greeting)}</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta no <strong>Caixa</strong>.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0e5a6b;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px">Criar nova senha</a></p>
  <p style="font-size:13px;color:#5b6b70">O link vale por 1 hora e só pode ser usado uma vez. Se o botão não funcionar, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
  <p style="font-size:13px;color:#5b6b70">Se não foi você, ignore este e-mail: a sua senha continua a mesma.</p>
</div>`;

  return { to, subject: 'Redefinição de senha - Caixa', text, html };
}
