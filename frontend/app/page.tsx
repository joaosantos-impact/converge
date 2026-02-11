'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth-client';

interface ReviewData {
  id: string;
  name: string;
  role: string;
  initials: string;
  text: string;
  rating: number;
}

/* ─────────────────────────  ICONS  ───────────────────────── */

function IconShield() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconAutomation() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5V3" />
      <path d="M12 21v-2" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <path d="M18.36 5.64l-1.41 1.41" />
      <path d="M7.05 16.95l-1.41 1.41" />
      <path d="M5.64 5.64l1.41 1.41" />
      <path d="M16.95 16.95l1.41 1.41" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconTax() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function IconFingerprint() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.81.13V9.01a6.28 6.28 0 0 0-.81-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.63a6.34 6.34 0 0 0 6.34-6.34V8.4a8.18 8.18 0 0 0 4.76 1.52V6.69h-1z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/* ─────────────────  SCROLL ANIMATION HOOK  ─────────────── */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────  TRADING BACKGROUND  ───────────────── */

function TradingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      {/* Glow along the chart line path */}
      <div className="absolute bottom-[15%] left-[10%] w-[600px] h-[200px] bg-white/[0.03] rounded-full blur-[100px]" />
      <div className="absolute top-[25%] right-0 w-[400px] h-[300px] bg-white/[0.02] rounded-full blur-[120px]" />
      {/* Bold chart line — like PRISM — subtle drift animation */}
      <svg
        className="absolute inset-0 w-full h-full animate-hero-line"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="heroLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.05" />
            <stop offset="30%" stopColor="white" stopOpacity="0.4" />
            <stop offset="70%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Area fill under the line */}
        <path
          d="M-20 820 L80 780 L180 750 L280 760 L380 720 L440 680 L520 650 L600 620 L680 580 L740 540 L820 490 L900 440 L960 410 L1020 370 L1080 320 L1140 280 L1200 230 L1260 190 L1320 140 L1400 80 L1460 30 L1460 900 L-20 900 Z"
          fill="url(#heroAreaGrad)"
        />
        {/* Main bold line */}
        <path
          d="M-20 820 L80 780 L180 750 L280 760 L380 720 L440 680 L520 650 L600 620 L680 580 L740 540 L820 490 L900 440 L960 410 L1020 370 L1080 320 L1140 280 L1200 230 L1260 190 L1320 140 L1400 80 L1460 30"
          stroke="url(#heroLineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />
      </svg>
      {/* Faint diagonal gradient overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255,255,255,0.01) 60%, rgba(255,255,255,0.02) 100%)',
        }}
      />
    </div>
  );
}

/* ─────────────────────  COOKIE CONSENT  ───────────────────── */

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const accepted = localStorage.getItem('cookie-consent');
      if (!accepted) {
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage not available */ }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 px-5 py-4 bg-[#0a0a0a] border border-white/[0.08]">
        <p className="text-[12px] text-white/50 leading-relaxed flex-1">
          Utilizamos cookies para melhorar a tua experiência e compreender como o nosso produto é utilizado.{' '}
          <Link href="/privacy" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
            Política de Privacidade
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-[12px] text-white/50 hover:text-white transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 text-[12px] bg-white text-[#050505] font-medium hover:bg-white/90 transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────  STAT COUNTER ANIMATED  ──────────────── */

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const { ref, visible } = useScrollReveal();
  const [displayed, setDisplayed] = useState(value);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) { setDisplayed(value); return; }
    const match = value.match(/^(\d+)/);
    if (!match) { setDisplayed(value); return; }
    const target = parseInt(match[1]);
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { clearInterval(timer); setDisplayed(value); return; }
      setDisplayed(value.replace(match[1], String(current)));
    }, 30);
    return () => clearInterval(timer);
  }, [visible, value]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div ref={ref} className="text-center" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
      <p className="text-2xl md:text-3xl font-light tracking-tight text-white font-serif-display">{displayed}</p>
      <p className="text-[11px] text-white/50 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

/* ───────────────────  GLOWING LINE SEPARATOR  ─────────────── */

function GlowLine() {
  return (
    <div className="relative h-px w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

/* ═══════════════════════  MAIN PAGE  ═══════════════════════ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session, isPending } = useSession();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const isLoggedIn = !isPending && !!session;

  // Fetch reviews from API (with fallback to defaults)
  const [reviewsData, setReviewsData] = useState<ReviewData[]>([]);
  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setReviewsData(data); })
      .catch(() => {});
  }, []);

  const displayReviews = reviewsData.length > 0 ? reviewsData : [
    { id: '1', name: 'Miguel S.', role: 'Trader desde 2019', initials: 'MS', text: 'Finalmente consigo ver tudo num só lugar. Tinha trades espalhadas por 4 exchanges e era um caos. O Converge mudou isso completamente.', rating: 5 },
    { id: '2', name: 'Ana R.', role: 'Investidora de longo prazo', initials: 'AR', text: 'A parte dos impostos é espetacular. Em Portugal, saber exatamente que crypto está isenta poupa-me horas e dinheiro no contabilista.', rating: 5 },
    { id: '3', name: 'Tiago F.', role: 'Day trader', initials: 'TF', text: 'O journal e o feed social são game changers. Registar as minhas decisões e ver o progresso ao longo do tempo melhorou imenso a minha disciplina.', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-white focus:text-[#050505] focus:text-sm focus:font-medium"
      >
        Saltar para o conteúdo
      </a>
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes float-slow-reverse {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-20px); }
        }
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: float-slow-reverse 25s ease-in-out infinite; }
        .font-serif-display { font-family: var(--font-serif), Georgia, 'Times New Roman', serif; }

        @keyframes hero-line-drift {
          0%   { transform: translateY(0px) translateX(0px); }
          25%  { transform: translateY(-6px) translateX(3px); }
          50%  { transform: translateY(4px) translateX(-2px); }
          75%  { transform: translateY(-3px) translateX(5px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        .animate-hero-line { animation: hero-line-drift 12s ease-in-out infinite; }

        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(6px); opacity: 0.7; }
        }
        .animate-scroll-bounce { animation: scroll-bounce 2s ease-in-out infinite; }

        /* Respect user preference for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow,
          .animate-float-slow-reverse,
          .animate-hero-line,
          .animate-scroll-bounce {
            animation: none !important;
          }
        }
      `}</style>

      {/* ──── NAV ──── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.06]' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-white">
              <span className="text-xs font-bold text-[#050505]">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Converge</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#security" className="hover:text-white transition-colors">Segurança</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
                <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-[13px] px-5 py-2 bg-white text-[#050505] font-medium hover:bg-white/90 transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link href="/sign-up" className="text-[13px] px-5 py-2 bg-white text-[#050505] font-medium hover:bg-white/90 transition-colors">
                Começar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ──── HERO ──── */}
      <section id="main-content" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <TradingBackground />
        
        <div
          className="relative max-w-4xl mx-auto text-center pt-16"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Social icons in hero — Instagram | TikTok */}
          <div
            className="flex items-center justify-center gap-3 mb-10"
            style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }}
          >
            <a href="https://instagram.com/converge.pt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Instagram"><IconInstagram /></a>
            <div className="w-px h-4 bg-white/20" />
            <a href="https://tiktok.com/@converge.pt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="TikTok"><IconTikTok /></a>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[0.95]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Controla o teu
            <br />
            <span className="font-serif-display italic text-white/80">crypto portfolio</span>
          </h1>

          <p
            className="mt-8 text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
            }}
          >
            Liga exchanges, acompanha preços em tempo real,
            calcula impostos para Portugal e partilha o teu portfolio.
          </p>

          {/* Single CTA */}
          <div
            className="mt-12 flex items-center justify-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease 0.55s, transform 0.8s ease 0.55s',
            }}
          >
            <Link
              href={isLoggedIn ? '/dashboard' : '/sign-up'}
              className="group relative px-10 py-4 bg-white text-[#050505] font-medium text-sm hover:bg-white/90 transition-all"
            >
              {isLoggedIn ? 'Ir para o Dashboard' : 'Junta-te a nós'}
              <svg className="inline-block ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>

          <p
            className="mt-6 text-[11px] text-white/30 tracking-wide"
            style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.7s' }}
          >
            Gratuito · Sem cartão de crédito · 2 minutos
          </p>

          {/* Scroll indicator — animated */}
          <div className="mt-20 flex flex-col items-center gap-3 animate-scroll-bounce">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em]">Scroll</p>
            <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </section>

      {/* ──── STATS ──── */}
      <GlowLine />
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedStat value="15+" label="Exchanges" />
          <AnimatedStat value="24/7" label="Auto Sync" />
          <AnimatedStat value="AES-256" label="Encriptação" />
          <AnimatedStat value="0€" label="Para começar" />
        </div>
      </section>
      <GlowLine />

      {/* ──── FEATURES — Bento Grid ──── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              Tudo o que precisas,{' '}
              <span className="font-serif-display italic text-white/80">num só lugar</span>
            </h2>
          </Reveal>

          {/* Bento grid — asymmetric layout */}
          <div className="grid md:grid-cols-12 gap-3">
            {/* Hero feature — large, spans 7 columns */}
            <Reveal className="md:col-span-7 md:row-span-2">
              <div className="group relative h-full p-8 md:p-10 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 overflow-hidden">
                {/* Corner shine effect */}
                <div className="absolute top-0 left-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/40 to-transparent" />
                  <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/40 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/40 to-transparent" />
                  <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/40 to-transparent" />
                </div>
                {/* Decorative chart line inside the card */}
                <svg className="absolute bottom-0 right-0 w-[70%] h-[60%] opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
                  <path d="M0 180 L40 160 L80 170 L120 140 L160 120 L200 130 L240 90 L280 70 L320 80 L360 40 L400 20" stroke="white" strokeWidth="2" />
                  <path d="M0 180 L40 160 L80 170 L120 140 L160 120 L200 130 L240 90 L280 70 L320 80 L360 40 L400 20 L400 200 L0 200 Z" fill="url(#bentoGrad)" />
                  <defs><linearGradient id="bentoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0.3" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient></defs>
                </svg>
                <div className="relative">
                  <div className="w-12 h-12 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors mb-6">
                    <IconChart />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Preços em Tempo Real</h3>
                  <p className="text-sm text-white/55 leading-relaxed max-w-md">
                    Ligação WebSocket à Binance para preços ao segundo. Sem refresh necessário. Acompanha o mercado em direto no teu dashboard.
                  </p>
                  <div className="mt-8 flex items-center gap-3">
                    {['BTC', 'ETH', 'SOL', 'ADA'].map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 border border-white/[0.08] text-white/40 uppercase tracking-wider">{s}</span>
                    ))}
                    <span className="text-[10px] text-white/25">+100</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Right column — 5 cols, stacked */}
            <Reveal delay={0.06} className="md:col-span-5">
              <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors shrink-0">
                    <IconLink />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Multi-Exchange</h3>
                    <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">Binance, Coinbase, Kraken, Bybit, OKX, KuCoin e muitas mais.</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="md:col-span-5">
              <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors shrink-0">
                    <IconAutomation />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Sync automático</h3>
                    <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">Executamos sincronizações 24/7 para manter o teu portfolio atualizado sem mexeres em nada.</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Bottom row — 3 equal cards */}
            <Reveal delay={0.05} className="md:col-span-4">
              <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors mb-4">
                  <IconTax />
                </div>
                <h3 className="text-sm font-medium text-white">Impostos Portugal</h3>
                <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">Crypto &gt;365 dias é isenta. Exporta CSV e PDF para o IRS.</p>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="md:col-span-4">
              <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors mb-4">
                  <IconFingerprint />
                </div>
                <h3 className="text-sm font-medium text-white">Segurança Total</h3>
                <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">AES-256-GCM. 2FA disponível. Zero acesso aos teus fundos.</p>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="md:col-span-4">
              <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white transition-colors mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white">Social & Feed</h3>
                <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">Partilha trades verificáveis e sobe no leaderboard.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──── HOW IT WORKS — Timeline ──── */}
      <GlowLine />
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              Começa em{' '}
              <span className="font-serif-display italic text-white/80">3 passos</span>
            </h2>
          </Reveal>

          {/* Timeline layout */}
          <div className="relative">
            {/* Connecting line — horizontal on desktop */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-white/[0.06] via-white/[0.12] to-white/[0.06]" />

            <div className="grid md:grid-cols-3 gap-16 md:gap-8">
              {[
                { num: '01', title: 'Cria a tua conta', desc: 'Registo gratuito em segundos. Apenas email e password. Sem burocracia.', delay: 0 },
                { num: '02', title: 'Liga as tuas exchanges', desc: 'Adiciona API keys read-only. Encriptação AES-256. Suporte para 15+ plataformas.', delay: 0.1 },
                { num: '03', title: 'Acompanha tudo', desc: 'Portfolio agregado, impostos automáticos, alertas de preço. Tudo num dashboard.', delay: 0.2 },
              ].map((step) => (
                <Reveal key={step.num} delay={step.delay} className="text-center">
                  {/* Number circle */}
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
                    <div className="absolute inset-0 border border-white/[0.08] rotate-45" />
                    <span className="text-3xl font-light text-white font-serif-display">{step.num}</span>
                  </div>
                  <h3 className="text-base font-medium text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──── SECURITY ──── */}
      <GlowLine />
      <section id="security" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <Reveal>
              <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Segurança</p>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight leading-tight">
                Os teus dados estão{' '}
                <span className="font-serif-display italic text-white/80">seguros</span>
              </h2>
              <p className="text-white/50 mt-5 text-sm leading-relaxed">
                As tuas API keys são encriptadas com AES-256-GCM antes de serem guardadas.
                Usamos apenas permissões de leitura. Nunca temos acesso aos teus fundos.
              </p>
            </Reveal>

            <div className="space-y-3">
              {[
                { icon: <IconShield />, label: 'Encriptação AES-256-GCM', desc: 'As chaves nunca são guardadas em texto' },
                { icon: <IconFingerprint />, label: '2FA Disponível', desc: 'Autenticação de dois fatores para a tua conta' },
                { icon: <IconLink />, label: 'API Read-Only', desc: 'Sem permissões de trading ou transferência' },
                { icon: <IconCode />, label: 'Open Source', desc: 'Código verificável e transparente' },
              ].map((item, i) => (
                <Reveal key={item.label} delay={i * 0.08}>
                  <div className="flex items-start gap-4 p-4 border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{item.label}</p>
                      <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──── QUOTE ──── */}
      <GlowLine />
      <section className="py-24 px-6">
        <Reveal className="max-w-3xl mx-auto text-center">
          <p className="text-xl md:text-2xl font-light text-white/60 leading-relaxed">
            &ldquo;Não é um custo,{' '}
            <span className="font-serif-display italic text-white/80">
              é um atalho para teres controlo total
            </span>{' '}
            sobre o teu portfolio.&rdquo;
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-[10px] font-medium">
              C
            </div>
            <div className="text-left">
              <p className="text-xs text-white/70 font-medium">Converge</p>
              <p className="text-[10px] text-white/40">Crypto Portfolio Tracker</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ──── PRICING ──── */}
      <GlowLine />
      <section id="pricing" className="py-24 px-6">
        <Reveal className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Planos</p>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">
            Simples e{' '}
            <span className="font-serif-display italic text-white/80">gratuito</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-md mx-auto text-sm">
            O Converge é gratuito para uso pessoal. Sem limites escondidos.
          </p>

          <div className="mt-14 max-w-sm mx-auto border border-white/[0.08] bg-white/[0.02] p-10">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Pessoal</p>
            <p className="text-5xl font-light mt-4 text-white font-serif-display">0€</p>
            <p className="text-sm text-white/40 mt-1">para sempre</p>
            <div className="mt-8 space-y-3 text-left">
              {[
                'Exchanges ilimitadas',
                'Portfolio em tempo real',
                'Relatório de impostos PT',
                'Alertas de preço',
                'DCA Calculator',
                'Feed social',
                'Exportação CSV & PDF',
                'Portfolio sharing',
              ].map(f => (
                <div key={f} className="flex items-center gap-3 text-[13px] text-white/60">
                  <div className="w-1 h-1 bg-white/50 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? '/dashboard' : '/sign-up'} className="block mt-10 px-6 py-3.5 bg-white text-[#050505] text-sm font-medium hover:bg-white/90 transition-colors text-center">
              {isLoggedIn ? 'Ir para o Dashboard' : 'Começar agora'}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ──── REVIEWS ──── */}
      <GlowLine />
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Testemunhos</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              O que dizem os{' '}
              <span className="font-serif-display italic text-white/80">utilizadores</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-3">
            {displayReviews.map((review, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="group relative p-6 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-500 h-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-transparent" /><div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/30 to-transparent" /></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"><div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/30 to-transparent" /><div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/30 to-transparent" /></div>
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-4">
                    {[1, 2, 3, 4, 5].map(s => (
                      <svg key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-white/50' : 'text-white/15'}`} viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[13px] text-white/60 leading-relaxed mb-6">&ldquo;{review.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-white/[0.08] text-[10px] font-medium text-white/70">
                      {review.initials}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/80">{review.name}</p>
                      <p className="text-[10px] text-white/40">{review.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──── CTA ──── */}
      <GlowLine />
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.02] rounded-full blur-[100px]" />
        </div>
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">
            Pára de saltar{' '}
            <span className="font-serif-display italic text-white/80">entre exchanges</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-lg mx-auto text-sm">
            Junta tudo no Converge. Vê o panorama completo do teu portfolio crypto.
          </p>
          <Link href={isLoggedIn ? '/dashboard' : '/sign-up'} className="inline-flex items-center gap-2 mt-10 px-8 py-3.5 bg-white text-[#050505] text-sm font-medium hover:bg-white/90 transition-colors">
            {isLoggedIn ? 'Dashboard' : 'Junta-te a nós'}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </Reveal>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* All centered */}
          <div className="flex flex-col items-center gap-8">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center bg-white">
                <span className="text-xs font-bold text-[#050505]">C</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Converge</span>
            </div>

            {/* Social — centered */}
            <div className="flex items-center justify-center gap-4">
              <a href="https://instagram.com/converge.pt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Instagram"><IconInstagram /></a>
              <div className="w-px h-4 bg-white/15" />
              <a href="https://tiktok.com/@converge.pt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="TikTok"><IconTikTok /></a>
              <div className="w-px h-4 bg-white/15" />
              <a href="https://youtube.com/@converge.pt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="YouTube"><IconYouTube /></a>
            </div>

            {/* Links — centered */}
            <div className="flex flex-wrap justify-center gap-6 text-[11px] text-white/35">
              <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Termos de Serviço</Link>
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Política de Privacidade</Link>
            </div>

            {/* Copyright */}
            <p className="text-[10px] text-white/20 tracking-wider">
              &copy; 2026 Converge. Todos os direitos reservados.
            </p>
            </div>
          </div>
        </footer>

      {/* Cookie consent */}
      <CookieConsent />
      </div>
  );
}
