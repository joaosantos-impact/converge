import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-light tracking-tight mb-2">Política de Privacidade</h1>
        <p className="text-sm text-white/30 mb-12">Última atualização: Fevereiro 2026</p>

        <div className="space-y-8 text-sm text-white/50 leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">1. Informação que Recolhemos</h2>
            <p>Recolhemos informação que forneces diretamente ao criar a tua conta: email, nome e password (armazenada de forma encriptada). Também armazenamos API keys de exchanges e wallets que adiciones, encriptadas com AES-256-GCM.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">2. Como Utilizamos a Informação</h2>
            <p>A informação recolhida é utilizada exclusivamente para fornecer o serviço de tracking de portfolio: consultar saldos e trades nas tuas exchanges, agregar dados, calcular impostos e gerar relatórios. Nunca vendemos, partilhamos ou cedemos os teus dados a terceiros.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">3. Segurança dos Dados</h2>
            <p>Implementamos medidas de segurança rigorosas:</p>
            <ul className="mt-2 space-y-1.5 ml-4">
              <li className="flex items-start gap-2"><span className="w-1 h-1 bg-white/30 mt-2 shrink-0" />API keys encriptadas com AES-256-GCM</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 bg-white/30 mt-2 shrink-0" />Passwords hashadas com bcrypt</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 bg-white/30 mt-2 shrink-0" />Autenticação de dois fatores (2FA) disponível</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 bg-white/30 mt-2 shrink-0" />Apenas permissões read-only nas exchanges</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 bg-white/30 mt-2 shrink-0" />Dados transmitidos via HTTPS</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">4. Partilha de Dados</h2>
            <p>Não partilhamos os teus dados pessoais com terceiros. A funcionalidade de portfolio sharing é voluntária e controlada por ti — podes ativar ou revogar o link de partilha a qualquer momento. O link partilhado apresenta dados agregados sem revelar API keys ou informações sensíveis.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">5. Retenção de Dados</h2>
            <p>Mantemos os teus dados enquanto a tua conta estiver ativa. Podes solicitar a eliminação completa da tua conta e dados associados a qualquer momento.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">6. Cookies e Tracking</h2>
            <p>Utilizamos cookies estritamente necessários para o funcionamento da autenticação e sessão. Não utilizamos cookies de tracking, analytics de terceiros ou ferramentas de publicidade.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">7. Os Teus Direitos</h2>
            <p>Ao abrigo do RGPD (Regulamento Geral sobre a Proteção de Dados), tens o direito de aceder, corrigir, eliminar ou exportar os teus dados pessoais. Para exercer estes direitos, contacta-nos através das redes sociais oficiais.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-white/80 mb-3">8. Alterações a Esta Política</h2>
            <p>Podemos atualizar esta política de privacidade periodicamente. Publicaremos qualquer alteração nesta página com a data de atualização.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">&larr; Voltar ao início</Link>
        </div>
      </article>
    </div>
  );
}
