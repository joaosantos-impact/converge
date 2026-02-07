import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-white">
              <span className="text-xs font-bold text-[#050505]">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Converge</span>
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] mb-4">Legal</p>
        <h1 className="text-3xl font-light tracking-tight mb-2">Termos de Serviço</h1>
        <p className="text-sm text-white/30 mb-12">Última atualização: Fevereiro 2026</p>

        <div className="space-y-8 text-sm text-white/50 leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">1. Aceitação dos Termos</h2>
            <p>Ao aceder ou utilizar a plataforma Converge, aceitas ficar vinculado a estes Termos de Serviço. Se não concordas com algum dos termos, não deves utilizar o serviço.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">2. Descrição do Serviço</h2>
            <p>O Converge é uma plataforma de acompanhamento de portfolios de criptomoedas que permite aos utilizadores conectar exchanges e wallets através de API keys de leitura, visualizar e agregar informações de portfolio, calcular informações fiscais, e partilhar dados do portfolio.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">3. Registo e Conta</h2>
            <p>Para utilizar o Converge, deves criar uma conta fornecendo informações verdadeiras e completas. És responsável por manter a confidencialidade da tua password e por todas as atividades que ocorrem na tua conta.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">4. API Keys e Segurança</h2>
            <p>O Converge armazena as tuas API keys de exchange encriptadas com AES-256-GCM. Apenas aceitamos API keys com permissões de leitura (read-only). O Converge nunca executa trades, transferências ou qualquer operação nos teus fundos. Não nos responsabilizamos pelo uso indevido de API keys com permissões superiores às recomendadas.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">5. Informação Fiscal</h2>
            <p>A informação fiscal fornecida pelo Converge tem caráter meramente informativo e não constitui aconselhamento fiscal ou financeiro. Deves consultar um profissional qualificado para questões fiscais específicas. O Converge não se responsabiliza por erros no cálculo de impostos.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, design, código e funcionalidades do Converge são propriedade da equipa Converge e estão protegidos por leis de propriedade intelectual.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">7. Limitação de Responsabilidade</h2>
            <p>O Converge é fornecido &ldquo;tal como está&rdquo; sem garantias de qualquer tipo. Não nos responsabilizamos por perdas financeiras, perda de dados, interrupções de serviço, ou qualquer outro dano resultante do uso da plataforma.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">8. Modificações</h2>
            <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor após a publicação. O uso continuado da plataforma constitui aceitação dos termos modificados.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">9. Contacto</h2>
            <p>Para questões sobre estes termos, contacta-nos através das redes sociais oficiais do Converge.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">&larr; Voltar ao início</Link>
        </div>
      </article>
    </div>
  );
}
