import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-white">
              <span className="text-xs font-bold text-[#050505]">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Converge</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative max-w-lg text-center">
          {/* Large 404 background text */}
          <p
            className="text-[180px] sm:text-[240px] font-light tracking-tighter leading-none text-white/[0.03] select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            404
          </p>

          <div className="relative">
            {/* Icon */}
            <div className="w-14 h-14 mx-auto mb-8 border border-white/[0.1] flex items-center justify-center">
              <svg className="w-6 h-6 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>

            <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] mb-4">Página não encontrada</p>

            <h1
              className="text-3xl sm:text-4xl font-light tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Parece que te{' '}
              <span
                style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}
                className="text-white/70"
              >
                perdeste
              </span>
            </h1>

            <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto mb-10">
              Esta página não existe ou foi movida. Verifica o URL ou volta ao início.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/"
                className="px-8 py-3 bg-white text-[#050505] text-sm font-medium hover:bg-white/90 transition-colors"
              >
                Página inicial
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3 border border-white/[0.15] text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center">
        <p className="text-[10px] text-white/15 tracking-wider">&copy; 2026 Converge</p>
      </footer>
    </div>
  );
}
