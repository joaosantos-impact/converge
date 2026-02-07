"use client";

import { useState, useMemo } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Fraca', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Razoável', color: 'bg-orange-500' };
  if (score === 3) return { score: 3, label: 'Boa', color: 'bg-yellow-500' };
  return { score: 4, label: 'Forte', color: 'bg-emerald-500' };
}

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => 
    password.length > 0 ? getPasswordStrength(password) : null
  , [password]);

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Email inválido");
      return;
    }

    if (password.length < 8) {
      setError("A password deve ter pelo menos 8 caracteres");
      return;
    }

    if (strength && strength.score < 2) {
      setError("A password é demasiado fraca. Adiciona maiúsculas, números ou caracteres especiais.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As passwords não coincidem");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Erro ao criar conta");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Nome</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="O teu nome"
          disabled={isLoading}
          className="h-11 bg-secondary/50 border-border focus:border-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu@exemplo.com"
          disabled={isLoading}
          className="h-11 bg-secondary/50 border-border focus:border-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Mín. 8 caracteres"
          disabled={isLoading}
          className="h-11 bg-secondary/50 border-border focus:border-ring"
        />
        {/* Password strength indicator */}
        {strength && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 transition-colors ${
                    i <= strength.score ? strength.color : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className={`text-[11px] ${strength.score <= 1 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {strength.label}
              {strength.score < 3 && ' — usa maiúsculas, números e símbolos'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirma a password"
          disabled={isLoading}
          className={`h-11 bg-secondary/50 border-border focus:border-ring ${
            !passwordsMatch ? 'border-red-500 focus:border-red-500' : ''
          }`}
        />
        {!passwordsMatch && (
          <p className="text-[11px] text-red-500">As passwords não coincidem</p>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-11 font-medium transition-all hover:opacity-90" 
        disabled={isLoading}
      >
        {isLoading ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Criar Conta'}
      </Button>
    </form>
  );
}
