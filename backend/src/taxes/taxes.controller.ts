import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const sendReportSchema = {
  email: (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  year: (v: unknown) => typeof v === 'number' && v >= 2000 && v <= 2100,
  reportCsv: (v: unknown) => typeof v === 'string' && v.length <= 2_000_000,
};

@Controller('api/taxes')
@UseGuards(AuthGuard)
export class TaxesController {
  @Post('send-report')
  async sendReport(
    @CurrentUser() user: { id: string; name?: string; email?: string },
    @Body() body: unknown,
  ) {
    const email = (body as { email?: string })?.email;
    const year = (body as { year?: number })?.year;
    const reportCsv = (body as { reportCsv?: string })?.reportCsv;

    if (!sendReportSchema.email(email) || !sendReportSchema.year(year) || !sendReportSchema.reportCsv(reportCsv)) {
      throw new HttpException(
        'Corpo inválido: email, year e reportCsv (string) são obrigatórios.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const csvContent = reportCsv as string;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new HttpException(
        'Envio de email não configurado. Define RESEND_API_KEY no servidor.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const from = process.env.TAX_REPORT_FROM_EMAIL || 'onboarding@resend.dev';
    const subject = `Relatório fiscal cripto ${year} — Converge`;
    const text = `Relatório fiscal (compras/vendas) do ano ${year}.\n\nEm anexo segue o ficheiro CSV.\n\n--\nEnviado por Converge`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject,
          text,
          attachments: [
            {
              filename: `impostos-crypto-${year}.csv`,
              content: Buffer.from(csvContent, 'utf-8').toString('base64'),
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new HttpException(
          `Falha ao enviar email: ${err || res.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      return { ok: true, message: 'Email enviado com sucesso' };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Erro ao enviar email.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
