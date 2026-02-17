import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth";
import Link from "next/link";
import { ConvergeLogo } from "@/components/ConvergeLogo";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra na tua conta Converge para gerir o teu portfolio crypto.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <ConvergeLogo size={40} invert />
              <span className="text-base font-semibold tracking-tight text-white font-brand">Converge</span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-light tracking-tight text-white">Bem-vindo de volta</h1>
              <p className="text-sm text-white/35">
                Entra na tua conta para continuar
              </p>
            </div>

            {/* Form */}
            <Suspense fallback={<div className="h-64 animate-pulse bg-white/5 rounded" />}>
              <SignInForm />
            </Suspense>

            {/* Footer */}
            <p className="text-sm text-white/30">
              Não tens conta?{" "}
              <Link
                href="/sign-up"
                className="text-white/70 hover:text-white underline underline-offset-4 transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right — Visual panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-l border-white/[0.06]">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.025] rounded-full blur-[120px]" />
        
        {/* Content */}
        <div className="relative flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="w-24 h-24 flex items-center justify-center border border-white/[0.08] bg-white/[0.02] mb-10">
            <ConvergeLogo size={96} invert />
          </div>

          <p className="text-2xl font-light text-white/40 text-center leading-relaxed max-w-xs" style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}>
            Todo o teu crypto, num só lugar
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center max-w-xs">
            {['Multi-Exchange', 'Tempo Real', 'Impostos PT', 'Seguro'].map(tag => (
              <span key={tag} className="px-3 py-1 text-[10px] border border-white/[0.08] text-white/25 uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom line */}
          <div className="absolute bottom-8 text-[10px] text-white/15 tracking-wider">
            &copy; 2026 Converge
          </div>
        </div>
      </div>
    </div>
  );
}
