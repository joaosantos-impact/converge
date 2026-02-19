"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialSignInButtons } from "./SocialSignInButtons";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const signInMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const result = await signIn.email(credentials);
      if (result.error) throw new Error(result.error.message ?? "Falha ao entrar");
      return result;
    },
    onSuccess: () => {
      router.push(callbackUrl);
      router.refresh();
    },
  });

  const error = signInMutation.error?.message ?? socialError;
  const isLoading = signInMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSocialError(null);
    signInMutation.reset();
    signInMutation.mutate({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <SocialSignInButtons
        callbackUrl={callbackUrl}
        disabled={isLoading}
        onError={setSocialError}
        socialLoading={socialLoading}
        onSocialLoadingChange={setSocialLoading}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#050505] px-2 text-white/35">ou</span>
        </div>
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
          placeholder="A tua password"
          disabled={isLoading}
          className="h-11 bg-secondary/50 border-border focus:border-ring"
        />
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
        {isLoading ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Entrar'}
      </Button>
    </form>
  );
}
