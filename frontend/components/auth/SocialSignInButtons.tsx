"use client";

import { SiGoogle } from "@icons-pack/react-simple-icons";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface SocialSignInButtonsProps {
  callbackUrl?: string;
  disabled?: boolean;
  onError?: (message: string | null) => void;
  socialLoading: string | null;
  onSocialLoadingChange: (provider: string | null) => void;
}

export function SocialSignInButtons({
  callbackUrl = "/dashboard",
  disabled,
  onError,
  socialLoading,
  onSocialLoadingChange,
}: SocialSignInButtonsProps) {
  const handleSocialSignIn = async (provider: "google") => {
    onError?.(null);
    onSocialLoadingChange(provider);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const path = callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`;
      const absoluteCallbackUrl = base ? `${base}${path}` : callbackUrl;
      await signIn.social({
        provider,
        callbackURL: absoluteCallbackUrl,
      });
    } catch {
      onError?.("Não foi possível iniciar sessão. Tenta novamente.");
    } finally {
      onSocialLoadingChange(null);
    }
  };

  const btnClass =
    "w-full h-11 font-medium cursor-pointer !bg-white hover:!bg-gray-100 !text-neutral-900 !border-neutral-200 border";

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className={btnClass}
        onClick={() => handleSocialSignIn("google")}
        disabled={disabled || !!socialLoading}
      >
        {socialLoading === "google" ? (
          <div className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-900 animate-spin" />
        ) : (
          <SiGoogle className="shrink-0" size={20} color="default" />
        )}
        <span className="ml-2">Continuar com Google</span>
      </Button>
    </div>
  );
}
