import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envia e-mails por SMTP (funciona com Gmail, Brevo, Resend, SES etc.).
 * Sem SMTP_HOST, o e-mail NÃO é enviado: o conteúdo (com o link) só aparece no log da API.
 * Isso permite testar a recuperação de senha localmente sem nenhum serviço de e-mail.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from = config.get<string>('MAIL_FROM') || 'Caixa <nao-responda@localhost>';

    if (host) {
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: pass ?? '' } : undefined,
      });
    } else {
      this.transporter = null;
      this.logger.warn('SMTP_HOST não configurado: os e-mails serão apenas registrados no log, não enviados.');
    }
  }

  async send(mail: Mail): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`E-mail NÃO enviado (sem SMTP). Para: ${mail.to} | Assunto: ${mail.subject}\n${mail.text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...mail });
  }
}
