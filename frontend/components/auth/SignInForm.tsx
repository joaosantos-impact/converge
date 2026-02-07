"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to sign in");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
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
